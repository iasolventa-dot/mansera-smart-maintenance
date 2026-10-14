import { describe, expect, it } from "vitest";
import { clientesPath, documentosPath, mapClientes, mapDocumentos, pageHeaders } from "./read";

describe("A3ERP · rutas (sin SQL de fuera)", () => {
  it("documentos con filtro de fechas construido aquí y ordenación (necesaria para paginar)", () => {
    const p = documentosPath("FVS", { desde: "2026-01-01", hasta: "2026-03-31" });
    expect(decodeURIComponent(p)).toBe("/api/documento/FVS/filtro/fecha>='20260101' and fecha<='20260331'/order/fecha desc");
    expect(decodeURIComponent(documentosPath("AV"))).toBe("/api/documento/AV/order/fecha desc");
  });
  it("rechaza tipos fuera de la lista y fechas con cualquier cosa que no sea una fecha real (anti-inyección SQL)", () => {
    expect(() => documentosPath("FVS' or 1=1--" as never)).toThrow();
    for (const desde of ["2026-01-01' or '1'='1", "2026-13-01", "2026-02-30", "20260101", "hoy"]) {
      expect(() => documentosPath("FVS", { desde }), desde).toThrow();
    }
  });
  it("clientes ordenados y cabeceras de paginación documentadas", () => {
    expect(decodeURIComponent(clientesPath())).toBe("/api/maestro/clientes/order/nomcli asc");
    expect(pageHeaders(2, 50)).toEqual({ Page: "2", PageSize: "50" });
  });
});

describe("A3ERP · mapeo (minimizado, sin inventar)", () => {
  it("acepta importes como número o texto y descarta NIF y líneas", () => {
    const raw = { Documentos: [
      { idfacv: 7, serie: "A", numdoc: 125, codcli: "  43", nomcli: "Cliente Ejemplo", nifcli: "FICTICIO-NIF", fecha: "2026-03-02T00:00:00", basemoneda: "100,50", totivamoneda: 21.1, totdoc: "121.60", situacion: "X", Lineas: [{ desclin: "L" }] },
    ] };
    const [d] = mapDocumentos("FVS", raw);
    expect(d).toEqual({ id: "FVS-A-125", tipo: "FVS", serie: "A", numero: "125", codCliente: "43", cliente: "Cliente Ejemplo", fecha: "2026-03-02", base: 100.5, iva: 21.1, total: 121.6, situacion: "X" });
    expect(JSON.stringify(d)).not.toContain("FICTICIO-NIF");
  });
  it("un importe ilegible queda en null (no se inventa 0)", () => {
    const [d] = mapDocumentos("AV", { Documentos: [{ numdoc: "1", fecha: "2026-01-01", totdoc: "n/d" }] });
    expect(d?.total).toBeNull();
  });
  it("formato inesperado = error controlado", () => {
    expect(() => mapDocumentos("FVS", { otra: [] })).toThrow(/formato inesperado/);
    expect(() => mapClientes([{ codigo: "1" }])).toThrow(/formato inesperado/);
    expect(mapClientes([{ codcli: " 1", nomcli: "Ejemplo" }])).toEqual([{ codigo: "1", nombre: "Ejemplo" }]);
  });
});
