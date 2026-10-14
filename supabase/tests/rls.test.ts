import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
let db: PGlite;

const ids = {
  org1: "00000000-0000-4000-8000-000000000001",
  org2: "00000000-0000-4000-8000-000000000002",
  ti1: "10000000-0000-4000-8000-000000000001",
  dir1: "10000000-0000-4000-8000-000000000002",
  campo1: "10000000-0000-4000-8000-000000000003",
  ti2: "10000000-0000-4000-8000-000000000004",
  nobody: "10000000-0000-4000-8000-000000000005",
};

/** Ejecuta como un usuario de la API (rol `authenticated`) con su JWT simulado. */
async function asUser<T>(uid: string | null, fn: () => Promise<T>, role = "authenticated"): Promise<T> {
  await db.exec(`set role ${uid || role === "anon" ? role : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

const rows = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as Record<string, unknown>[];
const denied = async (fn: () => Promise<unknown>) => {
  await expect(fn()).rejects.toThrow(/permission denied|row-level security|inmutable|solo TI puede/i);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(join(root, "tests/auth-stub.sql"), "utf8"));
  for (const f of readdirSync(join(root, "migrations")).filter((n) => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(root, "migrations", f), "utf8"));
  }
  await db.exec(`
    insert into public.orgs (id, name, slug) values
      ('${ids.org1}', 'Org Uno', 'org-uno'), ('${ids.org2}', 'Org Dos', 'org-dos');
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ids.ti1}', 'ti1@test', '{"full_name":"TI Uno"}'),
      ('${ids.dir1}', 'dir1@test', '{"full_name":"Dirección Uno"}'),
      ('${ids.campo1}', 'campo1@test', '{"full_name":"Campo Uno"}'),
      ('${ids.ti2}', 'ti2@test', '{"full_name":"TI Dos"}'),
      ('${ids.nobody}', 'nobody@test', '{"full_name":"Sin org"}');
    insert into public.memberships (org_id, user_id, role) values
      ('${ids.org1}', '${ids.ti1}', 'ti'),
      ('${ids.org1}', '${ids.dir1}', 'direccion'),
      ('${ids.org1}', '${ids.campo1}', 'campo'),
      ('${ids.org2}', '${ids.ti2}', 'ti');
  `);
});

describe("RLS activada en todo", () => {
  it("toda tabla de `public` tiene RLS habilitada", async () => {
    const r = await rows(`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
    expect(r).toEqual([]);
  });
});

describe("roles", () => {
  it("el enum app_role coincide con los roles de la aplicación", async () => {
    const r = await rows("select unnest(enum_range(null::public.app_role))::text as role");
    expect(r.map((x) => x.role).sort()).toEqual(
      ["administracion", "campo", "compras", "direccion", "oficina_tecnica", "rrhh", "ti"].sort());
  });
});

describe("orgs", () => {
  it("un miembro solo ve su organización", async () => {
    const r = await asUser(ids.campo1, () => rows("select id from public.orgs"));
    expect(r.map((x) => x.id)).toEqual([ids.org1]);
  });
  it("un usuario sin organización no ve ninguna", async () => {
    expect(await asUser(ids.nobody, () => rows("select id from public.orgs"))).toEqual([]);
  });
  it("anon no puede leer", async () => {
    await denied(() => asUser(null, () => rows("select id from public.orgs"), "anon"));
  });
  it("un cliente no puede crear ni borrar organizaciones", async () => {
    await denied(() => asUser(ids.ti1, () => db.exec("insert into public.orgs (name, slug) values ('X Org', 'x-org')")));
    await denied(() => asUser(ids.ti1, () => db.exec("delete from public.orgs")));
  });
});

describe("memberships", () => {
  it("campo solo ve su propia fila", async () => {
    const r = await asUser(ids.campo1, () => rows("select user_id from public.memberships"));
    expect(r.map((x) => x.user_id)).toEqual([ids.campo1]);
  });
  it("dirección y TI ven toda su organización y nada de la otra", async () => {
    for (const uid of [ids.dir1, ids.ti1]) {
      const r = await asUser(uid, () => rows("select org_id from public.memberships"));
      expect(r).toHaveLength(3);
      expect(r.every((x) => x.org_id === ids.org1)).toBe(true);
    }
  });
  it("campo no puede auto-ascenderse a TI", async () => {
    await asUser(ids.campo1, () => db.exec(`update public.memberships set role = 'ti' where user_id = '${ids.campo1}'`));
    const [r] = await rows(`select role from public.memberships where user_id = '${ids.campo1}'`);
    expect(r?.role).toBe("campo");
  });
  it("campo no puede añadirse a otra organización", async () => {
    await denied(() => asUser(ids.campo1, () => db.exec(`insert into public.memberships (org_id, user_id, role) values ('${ids.org2}', '${ids.campo1}', 'ti')`)));
  });
  it("TI puede gestionar miembros de su organización, no de otras", async () => {
    await asUser(ids.ti1, () => db.exec(`insert into public.memberships (org_id, user_id, role) values ('${ids.org1}', '${ids.nobody}', 'oficina_tecnica')`));
    await denied(() => asUser(ids.ti1, () => db.exec(`insert into public.memberships (org_id, user_id, role) values ('${ids.org2}', '${ids.dir1}', 'ti')`)));
    await db.exec(`delete from public.memberships where user_id = '${ids.nobody}'`);
  });
  it("dirección puede leer pero no modificar miembros", async () => {
    await asUser(ids.dir1, () => db.exec(`update public.memberships set role = 'ti' where user_id = '${ids.dir1}'`));
    const [r] = await rows(`select role from public.memberships where user_id = '${ids.dir1}'`);
    expect(r?.role).toBe("direccion");
  });
});

describe("profiles", () => {
  it("el trigger crea el perfil al registrarse", async () => {
    const [r] = await rows(`select full_name from public.profiles where id = '${ids.ti1}'`);
    expect(r?.full_name).toBe("TI Uno");
  });
  it("ve a los compañeros de organización pero no a otras organizaciones", async () => {
    const r = await asUser(ids.campo1, () => rows("select id from public.profiles"));
    const got = r.map((x) => x.id);
    expect(got).toContain(ids.ti1);
    expect(got).not.toContain(ids.ti2);
  });
  it("solo edita su propio perfil", async () => {
    await asUser(ids.campo1, () => db.exec(`update public.profiles set full_name = 'Hackeado' where id = '${ids.ti1}'`));
    const [r] = await rows(`select full_name from public.profiles where id = '${ids.ti1}'`);
    expect(r?.full_name).toBe("TI Uno");
    await asUser(ids.campo1, () => db.exec(`update public.profiles set full_name = 'Campo Renombrado' where id = '${ids.campo1}'`));
    const [own] = await rows(`select full_name from public.profiles where id = '${ids.campo1}'`);
    expect(own?.full_name).toBe("Campo Renombrado");
  });
});

describe("assistant_usage (límite diario del asistente)", () => {
  it("cada llamada cuenta una pregunta del usuario autenticado y devuelve el total del día", async () => {
    const a = await asUser(ids.campo1, async () => (await rows("select public.assistant_log_use() as n"))[0]?.n);
    const b = await asUser(ids.campo1, async () => (await rows("select public.assistant_log_use() as n"))[0]?.n);
    const c = await asUser(ids.ti1, async () => (await rows("select public.assistant_log_use() as n"))[0]?.n);
    expect([a, b, c]).toEqual([1, 2, 1]);
  });
  it("cada usuario solo ve su propio contador", async () => {
    const r = await asUser(ids.campo1, () => rows("select user_id, questions from public.assistant_usage"));
    expect(r).toHaveLength(1);
    expect(r[0]?.user_id).toBe(ids.campo1);
  });
  it("nadie puede escribir ni borrar el contador directamente (ni ponérselo a cero)", async () => {
    await denied(() => asUser(ids.campo1, () => db.exec("update public.assistant_usage set questions = 0")));
    await denied(() => asUser(ids.campo1, () => db.exec(`insert into public.assistant_usage (user_id, questions) values ('${ids.campo1}', 0)`)));
    await denied(() => asUser(ids.campo1, () => db.exec("delete from public.assistant_usage")));
  });
  it("sin sesión no se puede llamar a la función", async () => {
    await denied(() => asUser(null, () => rows("select public.assistant_log_use()"), "anon"));
  });
});

describe("audit_log (inmutable)", () => {
  const insert = (org: string, actor: string) =>
    `insert into public.audit_log (org_id, actor_id, app, action) values ('${org}', '${actor}', 'msm', 'prueba')`;

  it("un miembro puede registrar un evento a su nombre en su organización", async () => {
    await asUser(ids.campo1, () => db.exec(insert(ids.org1, ids.campo1)));
  });
  it("no puede suplantar a otro actor", async () => {
    await denied(() => asUser(ids.campo1, () => db.exec(insert(ids.org1, ids.ti1))));
  });
  it("no puede escribir en otra organización", async () => {
    await denied(() => asUser(ids.campo1, () => db.exec(insert(ids.org2, ids.campo1))));
  });
  it("campo no puede leer la auditoría; dirección sí; otra organización no", async () => {
    expect(await asUser(ids.campo1, () => rows("select id from public.audit_log"))).toEqual([]);
    expect((await asUser(ids.dir1, () => rows("select id from public.audit_log"))).length).toBeGreaterThan(0);
    expect(await asUser(ids.ti2, () => rows("select id from public.audit_log"))).toEqual([]);
  });
  it("nadie puede modificar ni borrar, ni siquiera el superusuario", async () => {
    await denied(() => asUser(ids.dir1, () => db.exec("update public.audit_log set action = 'x'")));
    await denied(() => asUser(ids.ti1, () => db.exec("delete from public.audit_log")));
    await denied(() => db.exec("update public.audit_log set action = 'x'"));
    await denied(() => db.exec("delete from public.audit_log"));
    await denied(() => db.exec("truncate public.audit_log"));
  });
  it("borrar un usuario anonimiza sus entradas (actor a NULL) sin poder tocar nada más", async () => {
    await db.exec("insert into auth.users (id, email) values ('20000000-0000-4000-8000-000000000009', 'baja@test')");
    await db.exec(`insert into public.memberships (org_id, user_id, role) values ('${ids.org1}', '20000000-0000-4000-8000-000000000009', 'campo')`);
    await db.exec(`insert into public.audit_log (org_id, actor_id, app, action) values ('${ids.org1}', '20000000-0000-4000-8000-000000000009', 'msm', 'antes-de-la-baja')`);
    await db.exec("delete from auth.users where id = '20000000-0000-4000-8000-000000000009'");
    const [r] = await rows("select actor_id from public.audit_log where action = 'antes-de-la-baja'");
    expect(r?.actor_id).toBeNull();
    await denied(() => db.exec("update public.audit_log set actor_id = null, action = 'cambiada' where action = 'antes-de-la-baja'"));
    await denied(() => db.exec(`update public.audit_log set actor_id = '${ids.ti1}' where action = 'antes-de-la-baja'`));
  });
});

describe("connections + Vault (credenciales)", () => {
  const SECRETO = '{"token":"SECRETO-DE-PRUEBA-123"}';
  const save = (org: string, app = "trello") =>
    db.query("select public.connection_save($1, $2, $3::jsonb, $4)", [org, app, JSON.stringify({ apiKey: "a".repeat(32) }), SECRETO]);

  it("solo TI puede guardar; dirección, campo y TI de otra organización no", async () => {
    await denied(() => asUser(ids.dir1, () => save(ids.org1)));
    await denied(() => asUser(ids.campo1, () => save(ids.org1)));
    await denied(() => asUser(ids.ti2, () => save(ids.org1)));
    await denied(() => asUser(null, () => save(ids.org1), "anon"));
  });
  it("TI guarda; la configuración se ve, el secreto no está en la tabla", async () => {
    await asUser(ids.ti1, () => save(ids.org1));
    const r = await asUser(ids.ti1, () => rows("select app, config, status from public.connections"));
    expect(r).toEqual([{ app: "trello", config: { apiKey: "a".repeat(32) }, status: "sin_probar" }]);
    expect(JSON.stringify(r)).not.toContain("SECRETO");
  });
  it("nadie del navegador puede leer secret_id, ni el Vault, ni la función de lectura", async () => {
    await denied(() => asUser(ids.ti1, () => rows("select secret_id from public.connections")));
    await denied(() => asUser(ids.ti1, () => rows("select * from vault.secrets")));
    await denied(() => asUser(ids.ti1, () => rows("select public.connection_read_secret($1, 'trello')", [ids.org1])));
    await denied(() => asUser(ids.dir1, () => rows("select public.connection_read_secret($1, 'trello')", [ids.org1])));
  });
  it("solo TI ve las conexiones; dirección, campo y otra organización, ninguna", async () => {
    expect((await asUser(ids.ti1, () => rows("select app from public.connections"))).length).toBe(1);
    expect(await asUser(ids.dir1, () => rows("select app from public.connections"))).toEqual([]);
    expect(await asUser(ids.campo1, () => rows("select app from public.connections"))).toEqual([]);
    expect(await asUser(ids.ti2, () => rows("select app from public.connections"))).toEqual([]);
  });
  it("sin escritura directa en la tabla", async () => {
    await denied(() => asUser(ids.ti1, () => db.exec(`insert into public.connections (org_id, app) values ('${ids.org1}', 'sesame')`)));
    await denied(() => asUser(ids.ti1, () => db.exec("update public.connections set config = '{}'")));
    await denied(() => asUser(ids.ti1, () => db.exec("delete from public.connections")));
  });
  it("service_role sí lee el secreto (para los conectores del servidor)", async () => {
    const r = await asUser(ids.ti1, async () => { await db.exec("reset role"); await db.exec("set role service_role"); return rows("select public.connection_read_secret($1, 'trello') as s", [ids.org1]); });
    expect(r[0]?.s).toBe(SECRETO);
  });
  it("reemplazar reutiliza el mismo secreto y vuelve a «sin probar»", async () => {
    await asUser(ids.ti1, () => db.query("select public.connection_record_test($1, 'trello', 'verificada', 'ok')", [ids.org1]));
    const [a] = await rows("select count(*)::int as n from vault.secrets");
    await asUser(ids.ti1, () => save(ids.org1));
    const [b] = await rows("select count(*)::int as n from vault.secrets");
    expect(b?.n).toBe(a?.n);
    const [c] = await asUser(ids.ti1, () => rows("select status, last_check_at from public.connections"));
    expect(c).toEqual({ status: "sin_probar", last_check_at: null });
  });
  it("solo se aceptan aplicaciones configurables (PGMWin no)", async () => {
    await expect(asUser(ids.ti1, () => save(ids.org1, "pgmwin"))).rejects.toThrow();
  });
  it("la auditoría registra los campos secretos pero nunca sus valores", async () => {
    const r = await rows("select action, after::text as after from public.audit_log where action like 'conexion.%'");
    expect(r.length).toBeGreaterThan(0);
    expect(r.map((x) => x.after).join(" ")).not.toContain("SECRETO");
    expect(r.some((x) => String(x.after).includes("campos_secretos"))).toBe(true);
  });
  it("las funciones validan por sí mismas aunque se llamen directamente por la API", async () => {
    const call = (app: string, config: unknown, secrets: string) =>
      asUser(ids.ti1, () => db.query("select public.connection_save($1, $2, $3::jsonb, $4)", [ids.org1, app, JSON.stringify(config), secrets]));
    const ok = JSON.stringify({ username: "u", ["pass" + "word"]: "p" });
    // ADR-0012: A3ERP ya no se guarda en la nube, ni siquiera con datos válidos.
    await expect(call("a3erp", { baseUrl: "https://srv:8443" }, ok)).rejects.toThrow(/no configurable/);
    for (const region of ["eu1.evil.com", "-eu1", "EU1"]) {
      await expect(call("sesame", { region }, JSON.stringify({ token: "t" })), region).rejects.toThrow(/no válidos/);
    }
    await expect(call("sesame", { region: "eu1", extra: "x" }, JSON.stringify({ token: "t" }))).rejects.toThrow(/no válidos/);
    await expect(call("trello", { apiKey: "a".repeat(32) }, JSON.stringify({ token: "t", otro: "x" }))).rejects.toThrow(/no válidos/);
    await expect(call("trello", { apiKey: "a".repeat(32) }, "{no es json")).rejects.toThrow(/secretos no válidos/);
  });
  it("a3innuva Nómina: acepta client_id + secreto + clave de suscripción y rechaza formatos ajenos", async () => {
    const call = (config: unknown, secrets: unknown) =>
      asUser(ids.ti1, () => db.query("select public.connection_save($1, 'a3nomina', $2::jsonb, $3)", [ids.org1, JSON.stringify(config), JSON.stringify(secrets)]));
    const secrets = { clientSecret: "s".repeat(20), subscriptionKey: "k".repeat(32) };
    await expect(call({ clientId: "mansera-client" }, secrets)).resolves.toBeDefined();
    await expect(call({ clientId: "con espacios" }, secrets)).rejects.toThrow(/no válidos/);
    await expect(call({ clientId: "mansera-client" }, { clientSecret: "s".repeat(20) })).rejects.toThrow(/no válidos/);
    await expect(call({ clientId: "mansera-client", baseUrl: "https://x" }, secrets)).rejects.toThrow(/no válidos/);
    const [a] = await rows("select app from public.audit_log where app = 'a3nomina' and action = 'conexion.guardar'");
    expect(a?.app).toBe("a3nomina");
    await asUser(ids.ti1, () => db.query("select public.connection_delete($1, 'a3nomina')", [ids.org1]));
  });
  it("OAuth: solo el servidor guarda el refresh token, solo en nombre de un TI y atado al client_id usado", async () => {
    const secrets = { clientSecret: "s".repeat(20), subscriptionKey: "k".repeat(32) };
    const saveClient = (clientId: string) => asUser(ids.ti1, () => db.query("select public.connection_save($1, 'a3nomina', $2::jsonb, $3)", [ids.org1, JSON.stringify({ clientId }), JSON.stringify(secrets)]));
    await saveClient("mansera-client");
    const store = (actor: string, clientId = "mansera-client") => db.query("select public.connection_store_oauth($1, 'a3nomina', $2, $3, $4)", [ids.org1, clientId, "RT-PRUEBA-123", actor]);
    const asService = async <T,>(fn: () => Promise<T>) => { await db.exec("set role service_role"); try { return await fn(); } finally { await db.exec("reset role"); } };
    await denied(() => asUser(ids.ti1, () => store(ids.ti1))); // ni TI desde el navegador
    await expect(asService(() => store(ids.dir1))).rejects.toThrow(/solo TI/);
    await expect(asService(() => store(ids.ti2))).rejects.toThrow(/solo TI/);
    await expect(asService(() => store(ids.ti1, "otro-client"))).rejects.toThrow(/han cambiado/); // credenciales cambiadas entre medias
    await asService(() => store(ids.ti1));
    const read = async () => JSON.parse(String((await asService(() => rows("select public.connection_read_secret($1, 'a3nomina') as v", [ids.org1])))[0]?.v));
    expect(await read()).toMatchObject({ ...secrets, refreshToken: "RT-PRUEBA-123" }); // no se pierde lo anterior
    const [c] = await asUser(ids.ti1, () => rows("select status from public.connections where app = 'a3nomina'"));
    expect(c?.status).toBe("autorizada"); // no «verificada» sin una lectura real
    // Renovación programada: sin actor, también atada al client_id.
    await denied(() => asUser(ids.ti1, () => db.query("select public.connection_rotate_oauth($1, 'a3nomina', 'mansera-client', 'RT-3')", [ids.org1])));
    await asService(() => db.query("select public.connection_rotate_oauth($1, 'a3nomina', 'mansera-client', 'RT-NUEVO-456')", [ids.org1]));
    expect((await read()).refreshToken).toBe("RT-NUEVO-456");
    await asService(() => db.query("select public.connection_audit_oauth($1, 'a3nomina', $2, 'denegado')", [ids.org1, ids.ti1]));
    const audit = await rows("select action, after::text as a from public.audit_log where action like 'conexion.%autoriz%' or action = 'conexion.renovar'");
    expect(audit.map((x) => x.action)).toEqual(expect.arrayContaining(["conexion.autorizar", "conexion.renovar", "conexion.autorizar_fallida"]));
    expect(audit.map((x) => x.a).join(" ")).not.toMatch(/RT-PRUEBA|RT-NUEVO/);
    await asUser(ids.ti1, () => db.query("select public.connection_delete($1, 'a3nomina')", [ids.org1]));
  });
  it("no se puede anotar una comprobación de una conexión que no existe", async () => {
    await expect(asUser(ids.ti1, () => db.query("select public.connection_record_test($1, 'sesame', 'verificada', 'x')", [ids.org1]))).rejects.toThrow(/no existe/);
  });
  it("eliminar borra la conexión y el secreto del Vault", async () => {
    await asUser(ids.ti1, () => db.query("select public.connection_delete($1, 'trello')", [ids.org1]));
    expect(await rows("select 1 from public.connections")).toEqual([]);
    expect(await rows("select 1 from vault.secrets")).toEqual([]);
  });
});

describe("caché de conectores y configuración", () => {
  const asService = async <T,>(fn: () => Promise<T>) => { await db.exec("set role service_role"); try { return await fn(); } finally { await db.exec("reset role"); } };
  it("la caché solo la toca el servidor: ningún usuario la lee ni la escribe", async () => {
    await asService(() => db.query("insert into public.connector_snapshots (org_id, app, kind, payload) values ($1, 'sesame', 'people', '{\"n\":1}')", [ids.org1]));
    for (const uid of [ids.ti1, ids.dir1, ids.campo1]) {
      await denied(() => asUser(uid, () => rows("select * from public.connector_snapshots")));
      await denied(() => asUser(uid, () => db.exec(`insert into public.connector_snapshots (org_id, app, kind, payload) values ('${ids.org1}', 'trello', 'offers', '{}')`)));
    }
  });
  it("la configuración la guarda solo TI de su organización, se audita e invalida la caché", async () => {
    const save = (uid: string, org = ids.org1) => asUser(uid, () => db.query("select public.connector_settings_save($1, 'sesame', $2::jsonb)", [org, '{"x":1}']));
    await denied(() => save(ids.dir1));
    await denied(() => save(ids.ti2));
    await save(ids.ti1);
    expect(await asUser(ids.ti1, () => rows("select app from public.connector_settings"))).toEqual([{ app: "sesame" }]);
    expect(await asUser(ids.dir1, () => rows("select app from public.connector_settings"))).toEqual([]);
    expect(await asService(() => rows("select 1 from public.connector_snapshots where app = 'sesame'"))).toEqual([]);
    const [a] = await rows("select action from public.audit_log where action = 'conector.configurar'");
    expect(a?.action).toBe("conector.configurar");
    await denied(() => asUser(ids.ti1, () => db.exec("update public.connector_settings set settings = '{}'")));
  });
});

