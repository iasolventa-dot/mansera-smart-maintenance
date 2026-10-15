import { z } from "zod";
import { ConnectorError } from "../errors";

/**
 * Lecturas de A3ERP a través del «Integrador API ERP» de Link Soluciones (v2.31.3.1). Es la API que el distribuidor
 * ofrece a MANSERA (75 €/mes hasta 1.000 llamadas o 100 €/mes ilimitadas + 1.800 € de configuración multiempresa).
 * Fuente: documento PDF entregado por el distribuidor a MANSERA el 2026-10-15; no es público.
 * SOLO LECTURA. Se ejecuta EN EL GATEWAY: A3ERP está en el servidor local de MANSERA (confirmado) y la API es un
 * servicio web que se instala junto a él (ADR-0012).
 *
 * Documentado en el PDF:
 * - Autenticación: cabecera `ApiKey`.
 * - Listados: `GET /api/{entidad}/` con `$filter` (OData, solo operadores binarios), `$orderby`, `$skip`, `$top`.
 *   Respuesta `{ PageData: [...], TotalCount }`.
 * - Fechas en filtros: `Campo ge datetime'aaaa-mm-dd'`. Los nombres de campo distinguen mayúsculas y minúsculas.
 * - `GET /api/{entidad}/updated`: identificadores modificados desde una fecha (sincronización incremental).
 * ⇒ El filtro se construye aquí SOLO con valores tipados (entidad de una lista cerrada y fechas reales). Nunca se
 *   acepta texto de filtro de fuera.
 * Sin documentar (S-32): cómo se elige la empresa en la instalación multiempresa, máximo de `$top`, significado de
 * `EstadoFactura`, y si un albarán está ya facturado (el listado de albaranes no trae importes ni estado).
 */
export const A3_LIST_ENTITIES = ["facturaVenta", "albaranVenta", "efectoPendiente"] as const;
export type A3ListEntity = (typeof A3_LIST_ENTITIES)[number];

/** Campo de fecha por entidad (documentado en las respuestas del PDF). */
const DATE_FIELD: Record<A3ListEntity, string> = { facturaVenta: "Fecha", albaranVenta: "Fecha", efectoPendiente: "FechaFactura" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function realDate(d: string): boolean {
  if (!DATE.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, day));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === day;
}

export const PAGE_SIZE = 100;

/** Ruta de un listado con filtro OData de fechas construido aquí, orden estable y página. */
export function listPath(entity: A3ListEntity | "cliente", o: { desde?: string; hasta?: string; skip: number; top: number }): string {
  if (entity !== "cliente" && !A3_LIST_ENTITIES.includes(entity)) throw new ConnectorError("validation", "Entidad no permitida.");
  if (!Number.isInteger(o.skip) || o.skip < 0 || !Number.isInteger(o.top) || o.top < 1 || o.top > PAGE_SIZE) {
    throw new ConnectorError("validation", "Paginación no válida.");
  }
  const params = new URLSearchParams();
  if (entity !== "cliente") {
    const f = DATE_FIELD[entity];
    const conds: string[] = [];
    for (const [op, d] of [["ge", o.desde], ["le", o.hasta]] as const) {
      if (d === undefined) continue;
      if (!realDate(d)) throw new ConnectorError("validation", "Fecha no válida (AAAA-MM-DD).");
      conds.push(`${f} ${op} datetime'${d}'`);
    }
    if (conds.length) params.set("$filter", conds.join(" and "));
    params.set("$orderby", `${f} desc`);
  } else {
    params.set("$orderby", "Codigo asc");
  }
  params.set("$skip", String(o.skip));
  params.set("$top", String(o.top));
  return `/api/${entity}/?${params.toString()}`;
}

/** La API devuelve importes como número; se aceptan también como texto por robustez. */
const Num = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === "number" ? v : Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
});
const Txt = z.union([z.string(), z.number()]).transform((v) => String(v).trim());
const OptTxt = Txt.nullable().optional();

export const Page = <T extends z.ZodTypeAny>(item: T) => z.object({ PageData: z.array(item), TotalCount: z.number().int().nonnegative() });

/* Solo los campos necesarios (minimización): sin NIF, direcciones, teléfonos ni emails. */
const FacturaRaw = z.object({
  IdFacturaVenta: Txt, Serie: OptTxt, Numero: Txt, CodigoCliente: OptTxt, NombreCliente: OptTxt, Fecha: Txt,
  BaseTotal: Num.nullable().optional(), CuotaTotal: Num.nullable().optional(), TotalDoc: Num.nullable().optional(),
  EstadoFactura: OptTxt, FechaPrevistaCobro: OptTxt, FechaCobro: OptTxt,
});
const AlbaranRaw = z.object({ IdAlbaranVentas: Txt, Serie: OptTxt, Numero: Txt, Cliente: OptTxt, NombreCliente: OptTxt, Fecha: Txt });
const EfectoRaw = z.object({ IdCobroERP: Txt, IdClienteERP: OptTxt, NumFac: OptTxt, ImpPagar: Num.nullable().optional(), Debe: Num.nullable().optional(), FechaFactura: OptTxt, FechaPago: OptTxt });
const ClienteRaw = z.object({ Codigo: Txt, Nombre: OptTxt, RazonSocial: OptTxt, Bloqueado: OptTxt });

const day = (v: string | null | undefined) => (v ? v.slice(0, 10) : null);

export type A3Factura = { id: string; serie: string; numero: string; codCliente: string | null; cliente: string | null; fecha: string; base: number | null; iva: number | null; total: number | null; estado: string | null; previstoCobro: string | null; cobro: string | null };
export type A3Albaran = { id: string; serie: string; numero: string; codCliente: string | null; cliente: string | null; fecha: string };
export type A3Efecto = { id: string; codCliente: string | null; factura: string | null; importe: number | null; pendiente: number | null; fechaFactura: string | null; vencimiento: string | null };
export type A3Cliente = { codigo: string; nombre: string };

function parsePage<T extends z.ZodTypeAny>(item: T, raw: unknown, what: string): { items: z.infer<T>[]; total: number } {
  const p = Page(item).safeParse(raw);
  if (!p.success) throw new ConnectorError("validation", `A3ERP devolvió ${what} con un formato inesperado (¿cambio de versión de la API?).`);
  return { items: p.data.PageData, total: p.data.TotalCount };
}

export const mapFacturas = (raw: unknown) => {
  const p = parsePage(FacturaRaw, raw, "facturas");
  return { total: p.total, items: p.items.map((f): A3Factura => ({
    id: f.IdFacturaVenta, serie: f.Serie ?? "", numero: f.Numero, codCliente: f.CodigoCliente || null, cliente: f.NombreCliente || null,
    fecha: f.Fecha.slice(0, 10), base: f.BaseTotal ?? null, iva: f.CuotaTotal ?? null, total: f.TotalDoc ?? null,
    // Valores tal cual: su significado no está documentado (no se traduce a «cobrada/pendiente»).
    estado: f.EstadoFactura || null, previstoCobro: day(f.FechaPrevistaCobro), cobro: day(f.FechaCobro),
  })) };
};
export const mapAlbaranes = (raw: unknown) => {
  const p = parsePage(AlbaranRaw, raw, "albaranes");
  return { total: p.total, items: p.items.map((a): A3Albaran => ({ id: a.IdAlbaranVentas, serie: a.Serie ?? "", numero: a.Numero, codCliente: a.Cliente || null, cliente: a.NombreCliente || null, fecha: a.Fecha.slice(0, 10) })) };
};
export const mapEfectos = (raw: unknown) => {
  const p = parsePage(EfectoRaw, raw, "efectos pendientes");
  return { total: p.total, items: p.items.map((e): A3Efecto => ({ id: e.IdCobroERP, codCliente: e.IdClienteERP || null, factura: e.NumFac || null, importe: e.ImpPagar ?? null, pendiente: e.Debe ?? null, fechaFactura: day(e.FechaFactura), vencimiento: day(e.FechaPago) })) };
};
export const mapClientes = (raw: unknown) => {
  const p = parsePage(ClienteRaw, raw, "clientes");
  return { total: p.total, items: p.items.map((c): A3Cliente => ({ codigo: c.Codigo, nombre: c.RazonSocial || c.Nombre || c.Codigo })) };
};

/** Cabeceras documentadas: la clave va en `ApiKey`. Nunca en la URL. */
export function apiKeyHeaders(apiKey: string): Record<string, string> {
  if (!/^[!-~]{8,400}$/.test(apiKey)) throw new ConnectorError("validation", "La ApiKey de A3ERP no tiene un formato válido.");
  return { ApiKey: apiKey, Accept: "application/json" };
}
