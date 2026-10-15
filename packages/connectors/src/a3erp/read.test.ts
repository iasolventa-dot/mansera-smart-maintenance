import { describe, expect, it } from "vitest";
import { apiKeyHeaders, listPath, mapAlbaranes, mapClientes, mapEfectos, mapFacturas } from "./read";

const q = (p: string) => Object.fromEntries(new URL(p, "http://x").searchParams);

describe("A3ERP (Link Soluciones) · rutas con OData construido aquí", () => {
  it("facturas con filtro de fechas OData, orden y página", () => {
    const p = listPath("facturaVenta", { desde: "2026-01-01", hasta: "2026-03-31", skip: 100, top: 100 });
    expect(p.startsWith("/api/facturaVenta/?")).toBe(true);
    expect(q(p)).toEqual({ $filter: "Fecha ge datetime'2026-01-01' and Fecha le datetime'2026-03-31'", $orderby: "Fecha desc", $skip: "100", $top: "100" });
  });
  it("efectos pendientes filtran por FechaFactura; clientes sin filtro y ordenados por código", () => {
    expect(q(listPath("efectoPendiente", { desde: "2026-01-01", skip: 0, top: 50 })).$filter).toBe("FechaFactura ge datetime'2026-01-01'");
    expect(q(listPath("cliente", { skip: 0, top: 100 }))).toEqual({ $orderby: "Codigo asc", $skip: "0", $top: "100" });
  });
  it("rechaza entidades fuera de la lista, fechas que no son fechas reales y paginación fuera de rango (anti-inyección)", () => {
    expect(() => listPath("cartera" as never, { skip: 0, top: 1 })).toThrow();
    for (const desde of ["2026-01-01' or 1 eq 1 or Fecha ge datetime'2000-01-01", "2026-13-01", "2026-02-30", "hoy"]) {
      expect(() => listPath("facturaVenta", { desde, skip: 0, top: 1 }), desde).toThrow();
    }
    for (const [skip, top] of [[-1, 10], [0, 0], [0, 1000], [1.5, 10]]) expect(() => listPath("albaranVenta", { skip: skip!, top: top! })).toThrow();
  });
  it("la ApiKey va en cabecera y con formato seguro", () => {
    expect(apiKeyHeaders("k".repeat(20))).toEqual({ ApiKey: "k".repeat(20), Accept: "application/json" });
    expect(() => apiKeyHeaders("con espacio dentro")).toThrow();
    expect(() => apiKeyHeaders("x".repeat(20) + String.fromCharCode(10) + "Inyectada: 1")).toThrow();
  });
});

describe("A3ERP · mapeo minimizado y sin inventar", () => {
  it("facturas: sin NIF ni dirección; estado y fechas de cobro tal cual", () => {
    const r = mapFacturas({ PageData: [{ IdFacturaVenta: 7, Serie: "A", Numero: 125, CodigoCliente: "43", NombreCliente: "Cliente Ejemplo", NifCliente: "FICTICIO-NIF", Direccion: "FICTICIA", Fecha: "2026-03-02T00:00:00", BaseTotal: 100.5, CuotaTotal: "21,1", TotalDoc: 121.6, EstadoFactura: "2", FechaPrevistaCobro: "2026-04-02T00:00:00", FechaCobro: null }], TotalCount: 1 });
    expect(r).toEqual({ total: 1, items: [{ id: "7", serie: "A", numero: "125", codCliente: "43", cliente: "Cliente Ejemplo", fecha: "2026-03-02", base: 100.5, iva: 21.1, total: 121.6, estado: "2", previstoCobro: "2026-04-02", cobro: null }] });
    expect(JSON.stringify(r)).not.toMatch(/FICTICI/);
  });
  it("albaranes, efectos pendientes y clientes", () => {
    expect(mapAlbaranes({ PageData: [{ IdAlbaranVentas: 3, Numero: "9", Cliente: "43", NombreCliente: "C", Fecha: "2026-01-05", NifCliente: "FICTICIO" }], TotalCount: 1 }).items[0]).toEqual({ id: "3", serie: "", numero: "9", codCliente: "43", cliente: "C", fecha: "2026-01-05" });
    expect(mapEfectos({ PageData: [{ IdCobroERP: 1, IdClienteERP: 43, NumFac: "A-125", ImpPagar: 121.6, Debe: 60, FechaFactura: "2026-03-02T00:00:00", FechaPago: "2026-04-02T00:00:00" }], TotalCount: 1 }).items[0]).toEqual({ id: "1", codCliente: "43", factura: "A-125", importe: 121.6, pendiente: 60, fechaFactura: "2026-03-02", vencimiento: "2026-04-02" });
    const c = mapClientes({ PageData: [{ Codigo: " 43", Nombre: "Nombre comercial", RazonSocial: "Razón Social S.L.", NIF: "FICTICIO", Telefono: "FICTICIO", Email: "x@example.invalid" }], TotalCount: 1 });
    expect(c.items).toEqual([{ codigo: "43", nombre: "Razón Social S.L." }]);
    expect(JSON.stringify(c)).not.toMatch(/FICTICIO|example/);
  });
  it("formato inesperado = error controlado; importe ilegible = null", () => {
    expect(() => mapFacturas({ Documentos: [] })).toThrow(/formato inesperado/);
    expect(mapFacturas({ PageData: [{ IdFacturaVenta: 1, Numero: 1, Fecha: "2026-01-01", TotalDoc: "n/d" }], TotalCount: 1 }).items[0]?.total).toBeNull();
  });
});
