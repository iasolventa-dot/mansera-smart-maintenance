import { describe, expect, it, vi } from "vitest";
import { probeConnection, probeSesame, probeTrello } from "./probe";

const reply = (status: number) => vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status }));
const TOKEN = "tok_SECRETO_1234567890abcdef";

describe("comprobación de Trello", () => {
  it("usa la URL documentada y devuelve verificada con 200", async () => {
    const f = reply(200);
    const r = await probeTrello({ apiKey: "k".repeat(32) }, { token: TOKEN }, f);
    expect(r.status).toBe("verificada");
    const url = String(f.mock.calls[0]![0]);
    expect(url.startsWith("https://api.trello.com/1/members/me?")).toBe(true);
    expect(url).not.toContain(TOKEN);
    expect((f.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: expect.stringContaining(`oauth_token="${TOKEN}"`) });
  });
  it("no sigue redirecciones ni deja en caché", async () => {
    const f = reply(200);
    await probeTrello({ apiKey: "k".repeat(32) }, { token: TOKEN }, f);
    const init = f.mock.calls[0]![1] as RequestInit;
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
  });
  it("traduce 401, 429 y 500 sin filtrar la credencial en el mensaje", async () => {
    for (const code of [401, 429, 500, 404]) {
      const r = await probeTrello({ apiKey: "k".repeat(32) }, { token: TOKEN }, reply(code));
      expect(r.status).toBe("error");
      expect(r.message).not.toContain(TOKEN);
      expect(r.message).toContain(String(code));
    }
  });
  it("si falla la red, lo dice sin exponer la URL", async () => {
    const r = await probeTrello({ apiKey: "k".repeat(32) }, { token: TOKEN }, vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => { throw new TypeError("fetch failed https://api.trello.com/...token=" + TOKEN); }));
    expect(r.status).toBe("error");
    expect(r.message).not.toContain(TOKEN);
    expect(r.message).toContain("No se pudo contactar");
  });
  it("sin clave o token no llama a nadie", async () => {
    const f = reply(200);
    expect((await probeTrello({}, { token: TOKEN }, f)).status).toBe("error");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("comprobación de Sésame HR", () => {
  it("usa Bearer y /core/v3/info en el host de la región", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ data: { company: { id: "x", name: "Empresa Ejemplo S.L." } } }), { status: 200 }));
    const r = await probeSesame({ region: "eu1" }, { token: TOKEN }, f);
    expect(r.status).toBe("verificada");
    expect(String(f.mock.calls[0]![0])).toBe("https://api-eu1.sesametime.com/core/v3/info");
    expect((f.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
  });
  it("muestra la empresa del token para confirmar que es la cuenta correcta", async () => {
    const f = vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify({ data: { company: { id: "x", name: "Empresa Ejemplo S.L." } } }), { status: 200 }));
    const r = await probeSesame({ region: "eu1" }, { token: TOKEN }, f);
    expect(r.message).toContain("Empresa Ejemplo S.L.");
    expect(r.message).not.toContain(TOKEN);
  });
  it("región inexistente: 200 con HTML de mantenimiento NO cuenta como verificada (comprobado en real)", async () => {
    const html = vi.fn(async (_u: string, _i?: RequestInit) => new Response("<!DOCTYPE html><html><title>Sesame</title></html>", { status: 200, headers: { "content-type": "text/html" } }));
    const r = await probeSesame({ region: "zz9" }, { token: TOKEN }, html);
    expect(r.status).toBe("error");
    expect(r.message).toContain("región");
  });
  it("una región maliciosa no puede cambiar el host (anti-SSRF)", async () => {
    for (const region of ["a.evil.com/x#", "eu1.evil.com", "../x", "eu1@evil.com", "-eu1", "E U"]) {
      const f = reply(200);
      const r = await probeSesame({ region }, { token: TOKEN }, f);
      expect(r.status, region).toBe("error");
      expect(f, region).not.toHaveBeenCalled();
    }
  });
  it("traduce los errores HTTP", async () => {
    expect((await probeSesame({ region: "eu1" }, { token: TOKEN }, reply(401))).message).toContain("rechazó");
    expect((await probeSesame({ region: "eu1" }, { token: TOKEN }, reply(429))).message).toContain("limitado");
  });
});

describe("punto único", () => {
  it("A3ERP y PGMWin no se pueden probar desde la nube y no llaman a nadie", async () => {
    const f = reply(200);
    expect((await probeConnection("a3erp", { baseUrl: "https://x:1" }, { username: "u", password: "p" }, f)).status).toBe("no_probable");
    expect((await probeConnection("pgmwin", {}, {}, f)).status).toBe("no_probable");
    expect(f).not.toHaveBeenCalled();
  });
  it("el mensaje de A3ERP nunca contiene la contraseña", async () => {
    const r = await probeConnection("a3erp", {}, { username: "usuario", password: "S3cr3to!" });
    expect(JSON.stringify(r)).not.toContain("S3cr3to!");
  });
});
