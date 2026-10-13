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
});

describe("connections + Vault (credenciales)", () => {
  const SECRETO = '{"token":"SECRETO-DE-PRUEBA-123"}';
  const save = (org: string, app = "trello") =>
    db.query("select public.connection_save($1, $2, $3::jsonb, $4)", [org, app, '{"apiKey":"clave-publica"}', SECRETO]);

  it("solo TI puede guardar; dirección, campo y TI de otra organización no", async () => {
    await denied(() => asUser(ids.dir1, () => save(ids.org1)));
    await denied(() => asUser(ids.campo1, () => save(ids.org1)));
    await denied(() => asUser(ids.ti2, () => save(ids.org1)));
    await denied(() => asUser(null, () => save(ids.org1), "anon"));
  });
  it("TI guarda; la configuración se ve, el secreto no está en la tabla", async () => {
    await asUser(ids.ti1, () => save(ids.org1));
    const r = await asUser(ids.ti1, () => rows("select app, config, status from public.connections"));
    expect(r).toEqual([{ app: "trello", config: { apiKey: "clave-publica" }, status: "sin_probar" }]);
    expect(JSON.stringify(r)).not.toContain("SECRETO");
  });
  it("nadie del navegador puede leer secret_id, ni el Vault, ni la función de lectura", async () => {
    await denied(() => asUser(ids.ti1, () => rows("select secret_id from public.connections")));
    await denied(() => asUser(ids.ti1, () => rows("select * from vault.secrets")));
    await denied(() => asUser(ids.ti1, () => rows("select public.connection_read_secret($1, 'trello')", [ids.org1])));
    await denied(() => asUser(ids.dir1, () => rows("select public.connection_read_secret($1, 'trello')", [ids.org1])));
  });
  it("solo dirección y TI ven las conexiones; campo y otra organización, ninguna", async () => {
    expect((await asUser(ids.dir1, () => rows("select app from public.connections"))).length).toBe(1);
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
  it("eliminar borra la conexión y el secreto del Vault", async () => {
    await asUser(ids.ti1, () => db.query("select public.connection_delete($1, 'trello')", [ids.org1]));
    expect(await rows("select 1 from public.connections")).toEqual([]);
    expect(await rows("select 1 from vault.secrets")).toEqual([]);
  });
});
