import { z } from "zod";
import { ConnectorError } from "../errors";

/**
 * Lecturas de A3ERP (API oficial, https://a3erpapi.appcloud.es, consultada el 2026-10-14). SOLO LECTURA.
 * Se ejecutan EN EL GATEWAY (la API está en la red de MANSERA, ADR-0012); aquí solo hay piezas puras y probadas.
 *
 * Documentado:
 * - Login `POST /api/login` (Basic) → `{ token }`; después `Authorization: Bearer`.
 * - Maestros `GET /api/maestro/{maestro}`; documentos `GET /api/documento/{tipo}` (PV, AV, FVS, FVC…), con cabecera y líneas.
 * - Paginación por CABECERAS `Page` (desde 1) y `PageSize`, que exige ordenación en la ruta `/order/{columna} asc|desc`.
 * - Filtrado por ruta `/filtro/{condición SQL tipo WHERE}`: «se ejecuta directamente en la base de datos».
 *   ⇒ NUNCA se acepta una condición de fuera: solo se construye aquí con valores tipados y validados (tipo de una lista
 *     cerrada, fechas AAAA-MM-DD reales). Es la defensa contra inyección SQL.
 * Sin documentar (S-29): nombres exactos de los campos de fecha/cliente en cada tipo, formato de fecha en el filtro,
 * máximo de PageSize, significado de `situacion` y si hay estado de cobro. Se verificarán en el spike.
 */
export const A3_DOC_TYPES = ["FVS", "FVC", "AV", "PV"] as const; // facturas de venta (2 tipos), albaranes y pedidos de venta
export type A3DocType = (typeof A3_DOC_TYPES)[number];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function realDate(d: string): boolean {
  if (!DATE.test(d)) return false;
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, day));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === day;
}

/** Ruta de documentos con filtro de fechas CONSTRUIDO aquí (formato 'AAAAMMDD', seguro en SQL Server). */
export function documentosPath(tipo: A3DocType, range: { desde?: string; hasta?: string } = {}): string {
  if (!A3_DOC_TYPES.includes(tipo)) throw new ConnectorError("validation", "Tipo de documento no permitido.");
  const conds: string[] = [];
  for (const [op, d] of [[">=", range.desde], ["<=", range.hasta]] as const) {
    if (d === undefined) continue;
    if (!realDate(d)) throw new ConnectorError("validation", "Fecha no válida (AAAA-MM-DD).");
    conds.push(`fecha${op}'${d.replaceAll("-", "")}'`);
  }
  const filtro = conds.length ? `/filtro/${encodeURIComponent(conds.join(" and "))}` : "";
  return `/api/documento/${tipo}${filtro}/order/${encodeURIComponent("fecha desc")}`;
}

export const clientesPath = () => `/api/maestro/clientes/order/${encodeURIComponent("nomcli asc")}`;

/** Cabeceras de paginación documentadas. */
export const pageHeaders = (page: number, size: number) => ({ Page: String(page), PageSize: String(size) });

/** La documentación muestra importes como número o como texto: se aceptan ambos (punto o coma decimal). */
const Num = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === "number" ? v : Number(v.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
});
const Txt = z.union([z.string(), z.number()]).transform((v) => String(v).trim());

/** Cabecera de documento: solo campos documentados y necesarios (sin NIF ni líneas: minimización). */
export const A3DocumentoRaw = z.object({
  serie: Txt.optional(),
  numdoc: Txt,
  codcli: Txt.optional(),
  nomcli: Txt.optional(),
  fecha: Txt,
  basemoneda: Num.optional(),
  totivamoneda: Num.optional(),
  totdoc: Num,
  situacion: Txt.optional(),
});
export const A3DocumentosResponse = z.object({ Documentos: z.array(A3DocumentoRaw) });

export type A3Documento = {
  id: string;
  tipo: A3DocType;
  serie: string;
  numero: string;
  codCliente: string | null;
  cliente: string | null;
  fecha: string;
  base: number | null;
  iva: number | null;
  total: number | null;
  /** Valor tal cual de A3ERP: su significado no está documentado (no se traduce a «cobrada/pendiente»). */
  situacion: string | null;
};

export function mapDocumentos(tipo: A3DocType, raw: unknown): A3Documento[] {
  const parsed = A3DocumentosResponse.safeParse(raw);
  if (!parsed.success) throw new ConnectorError("validation", "A3ERP devolvió documentos con un formato inesperado.");
  return parsed.data.Documentos.map((d) => ({
    id: `${tipo}-${d.serie ?? ""}-${d.numdoc}`,
    tipo,
    serie: d.serie ?? "",
    numero: d.numdoc,
    codCliente: d.codcli || null,
    cliente: d.nomcli || null,
    fecha: d.fecha.slice(0, 10),
    base: d.basemoneda ?? null,
    iva: d.totivamoneda ?? null,
    total: d.totdoc,
    situacion: d.situacion || null,
  }));
}

/** Maestro de clientes: campos NO documentados para clientes (S-29); se usan los del documento (codcli, nomcli). */
export const A3ClienteRaw = z.object({ codcli: Txt, nomcli: Txt });
export type A3Cliente = { codigo: string; nombre: string };
export function mapClientes(raw: unknown): A3Cliente[] {
  const parsed = z.array(A3ClienteRaw).safeParse(raw);
  if (!parsed.success) throw new ConnectorError("validation", "A3ERP devolvió clientes con un formato inesperado (¿campos distintos de codcli/nomcli?).");
  return parsed.data.map((c) => ({ codigo: c.codcli, nombre: c.nomcli }));
}

export const LoginResponse = z.object({ token: z.string().min(10) });
