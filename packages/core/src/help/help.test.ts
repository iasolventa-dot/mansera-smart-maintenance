import { describe, expect, it } from "vitest";
import { NAV_ORDER, NAV_LABEL } from "../access";
import { Role } from "../schemas";
import { MANUAL, SUGGESTIONS } from "./content";
import {
  MIN_SCORE, answerLocally, anchorFor, availabilityLabel, findTask, helpEntries, knowledgeText, norm, searchHelp, tokens,
} from "./search";

const tasks = MANUAL.flatMap((c) => c.tasks);

describe("integridad del manual (fuente única)", () => {
  it("los ids de tareas y capítulos son únicos y válidos para un ancla HTML", () => {
    const ids = [...tasks.map((t) => t.id), ...MANUAL.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("toda tarea tiene título, pasos y palabras clave", () => {
    for (const t of tasks) {
      expect(t.title.length).toBeGreaterThan(5);
      expect(t.steps.length).toBeGreaterThan(0);
      expect(t.keywords.length).toBeGreaterThan(1);
    }
  });

  it("TODA sección de la aplicación está documentada (si añades una pantalla, documentala)", () => {
    const sinDoc = NAV_ORDER.filter((id) => !tasks.some((t) => t.panel === id));
    expect(sinDoc, `Secciones sin documentar: ${sinDoc.map((s) => NAV_LABEL[s]).join(", ")}`).toEqual([]);
  });

  it("cada sección tiene ancla para el icono «?» de ayuda", () => {
    for (const id of NAV_ORDER) expect(anchorFor(id), id).toBeTruthy();
    expect(anchorFor(null)).toBeNull();
  });

  it("los enlaces internos de las tareas no apuntan a nada inexistente", () => {
    for (const t of tasks) for (const s of t.steps) expect(s).not.toMatch(/\[\[ir:/);
  });

  it("el manual no promete funciones que no existen", () => {
    const prohibido = /(descargar pdf|reclamar cobro|dictar parte|subida automática activa)/i;
    for (const t of tasks) expect([t.title, ...t.steps].join(" ")).not.toMatch(prohibido);
  });
});

describe("búsqueda", () => {
  it("ignora tildes, mayúsculas y signos", () => {
    expect(norm("¿Cómo CREO una Órden?")).toBe(" como creo una orden ");
    expect(tokens("¿Cómo creo una orden de trabajo?")).toEqual(["creo", "orden", "trabajo"]);
  });

  it("encuentra la tarea correcta con preguntas naturales", () => {
    const casos: [string, string][] = [
      ["¿cómo creo una orden de trabajo?", "nueva-orden"],
      ["quiero aprobar una propuesta", "aprobar-propuesta"],
      ["¿qué es una anomalía?", "alertas"],
      ["no veo el menú de facturación", "roles"],
      ["como busco un cliente con ctrl k", "buscar"],
      ["horas del contrato de un cliente", "clientes"],
      ["pedido retrasado proveedor", "compras"],
      ["acreditaciones prl que caducan", "prl"],
      ["cambiar a modo oscuro", "tema"],
      ["como busco un cliente", "buscar"],
      ["donde apruebo las propuestas", "aprobar-propuesta"],
    ];
    for (const [q, id] of casos) expect(searchHelp(q)[0]?.entry.task.id, q).toBe(id);
  });

  it("tolera plurales y variantes (prefijo)", () => {
    expect(searchHelp("alertas")[0]?.entry.task.id).toBe("alertas");
    expect(searchHelp("facturas vencidas")[0]?.entry.task.id).toBe("facturacion");
  });

  it("empuja un poco la sección abierta", () => {
    const sin = searchHelp("estado").find((h) => h.entry.task.id === "conexiones")?.score ?? 0;
    const con = searchHelp("estado", { panel: "conexiones" }).find((h) => h.entry.task.id === "conexiones")?.score ?? 0;
    expect(con).toBeGreaterThan(sin);
  });

  it("marca como no accesibles las tareas de secciones que el rol no ve", () => {
    const hit = searchHelp("conexiones latencia gateway", { role: "campo" })[0];
    expect(hit?.entry.task.id).toBe("conexiones");
    expect(hit?.accessible).toBe(false);
    expect(searchHelp("conexiones latencia gateway", { role: "ti" })[0]?.accessible).toBe(true);
  });

  it("una consulta vacía o de palabras vacías no devuelve nada", () => {
    expect(searchHelp("")).toEqual([]);
    expect(searchHelp("el de la y")).toEqual([]);
  });
});

describe("modo guía (respuesta sin IA)", () => {
  it("responde con pasos numerados, la fuente y botón «Ir a…» si estás en otra pantalla", () => {
    const r = answerLocally("¿cómo apruebo una propuesta?", { panel: "panel", role: "direccion" });
    expect(r.sources).toEqual(["aprobar-propuesta"]);
    expect(r.text).toContain("1. ");
    expect(r.text).toContain("[[ir:propuestas|Propuestas]]");
  });

  it("no añade botón «Ir a…» si ya estás en esa pantalla", () => {
    const r = answerLocally("¿cómo apruebo una propuesta?", { panel: "propuestas", role: "direccion" });
    expect(r.text).not.toContain("[[ir:");
  });

  it("avisa de que el perfil no tiene acceso en lugar de mandarle a una pantalla prohibida", () => {
    const r = answerLocally("estado de las conexiones y latencia", { role: "campo" });
    expect(r.text).toContain("Tu perfil no tiene acceso");
    expect(r.text).not.toContain("[[ir:");
  });

  it("no inventa: sin coincidencias lo dice y sugiere temas", () => {
    const r = answerLocally("receta de paella valenciana");
    expect(r.sources).toEqual([]);
    expect(r.related.length).toBeGreaterThan(0);
    expect(r.text).toContain("No he encontrado");
  });

  it("saluda y agradece sin buscar", () => {
    expect(answerLocally("hola").text).toContain("Hola");
    expect(answerLocally("gracias").text).toContain("De nada");
  });

  it("TODAS las preguntas sugeridas tienen respuesta real en el manual", () => {
    const fallos: string[] = [];
    for (const [panel, qs] of Object.entries(SUGGESTIONS)) {
      for (const q of qs ?? []) {
        const hit = searchHelp(q, { panel: panel === "_" ? null : (panel as never) })[0];
        if (!hit || hit.score < MIN_SCORE) fallos.push(`[${panel}] ${q}`);
      }
    }
    expect(fallos).toEqual([]);
  });
});

describe("conocimiento para la IA", () => {
  const k = knowledgeText();

  it("es determinista (necesario para la caché de prompts) y de tamaño razonable", () => {
    expect(knowledgeText()).toBe(k);
    expect(k.length).toBeGreaterThan(5_000);
    expect(k.length).toBeLessThan(60_000);
  });

  it("cada ficha lleva su id citable y las secciones restringidas indican para quién", () => {
    for (const e of helpEntries()) expect(k).toContain(`## [${e.task.id}] ${e.task.title}`);
    expect(k).toContain("Disponible para: TI");
  });

  it("findTask y availabilityLabel funcionan", () => {
    expect(findTask("alertas")?.chapter.id).toBe("dia-a-dia");
    expect(findTask("no-existe")).toBeUndefined();
    expect(availabilityLabel(null)).toBeNull();
    expect(availabilityLabel("conexiones")).toBe("TI");
    expect(Role.options.length).toBe(7);
  });
});
