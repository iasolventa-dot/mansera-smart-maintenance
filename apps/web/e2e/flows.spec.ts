import { expect, test } from "@playwright/test";
import { loginAs, settle } from "./helpers";

test.describe("control de acceso", () => {
  test("sin sesión se redirige al acceso", async ({ page }) => {
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/login/);
  });

  test("el técnico de campo no ve el panel de dirección: vuelve a «Mi día»", async ({ page, context }) => {
    await loginAs(context, "campo");
    await page.goto("/panel");
    await expect(page).toHaveURL(/\/campo$/);
  });

  test("TI no puede abrir Facturación aunque conozca la dirección", async ({ page, context }) => {
    await loginAs(context, "ti");
    await page.goto("/facturacion");
    await expect(page).toHaveURL(/\/panel$/);
  });

  test("el menú solo muestra las secciones del perfil", async ({ page, context }) => {
    await loginAs(context, "rrhh");
    await page.goto("/panel");
    await settle(page);
    const nav = page.locator("aside nav");
    await expect(nav.getByRole("link", { name: "Personal" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Facturación" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Conexiones" })).toHaveCount(0);
  });
});

test.describe("propuestas (humano en el circuito)", () => {
  test("una acción rápida crea una propuesta pendiente y se puede aprobar", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/ordenes?accion=ot");
    await settle(page);
    const dialog = page.getByRole("dialog", { name: "Nueva orden de trabajo" });
    await dialog.getByLabel("¿Qué ocurre?").fill("Ruido anómalo en el acoplamiento");
    await dialog.getByRole("button", { name: "Crear propuesta" }).click();
    await expect(dialog.getByText("Propuesta creada")).toBeVisible();
    await dialog.getByRole("link", { name: "Ver propuesta" }).click();
    await expect(page).toHaveURL(/\/propuestas$/);
    const card = page.locator("section", { hasText: "Ruido anómalo en el acoplamiento" }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole("columnheader", { name: "Antes" })).toBeVisible();
    await card.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByText("Aprobada por").first()).toBeVisible();
  });

  test("no se puede crear una orden sin descripción", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/ordenes?accion=ot");
    await settle(page);
    await expect(page.getByRole("dialog", { name: "Nueva orden de trabajo" }).getByRole("button", { name: "Crear propuesta" })).toBeDisabled();
  });
});

test.describe("búsqueda, manual y ayuda", () => {
  test("Ctrl+K encuentra un activo", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/panel");
    await settle(page);
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: "Buscar o ir a" });
    await palette.getByRole("textbox").fill("bomba");
    await expect(palette.getByText("Bomba B-14")).toBeVisible();
  });

  test("la búsqueda respeta el perfil: campo no ve clientes", async ({ page, context }) => {
    await loginAs(context, "campo");
    await page.goto("/campo");
    await settle(page);
    await page.keyboard.press("Control+K");
    const palette = page.getByRole("dialog", { name: "Buscar o ir a" });
    await palette.getByRole("textbox").fill("Embotelladora");
    await expect(palette.getByText("Bomba B-14")).toBeVisible();
    await expect(palette.getByText("Cliente", { exact: true })).toHaveCount(0);
  });

  test("el manual filtra sin importar tildes y resalta", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/manual");
    await settle(page);
    await page.getByRole("searchbox").fill("anomalia");
    await expect(page.getByRole("status").filter({ hasText: /tareas? coinciden?|tarea coincide/ })).toBeVisible();
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("el asistente responde en modo guía, cita el manual y ofrece «Ir a…»", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/panel");
    await settle(page);
    await page.getByRole("button", { name: /Abrir la ayuda/ }).click();
    const box = page.getByRole("dialog", { name: "Asistente de ayuda" });
    await box.getByLabel("Tu pregunta").fill("como apruebo una propuesta");
    await box.getByLabel("Tu pregunta").press("Enter");
    await expect(box.getByRole("link", { name: /Manual · Aprobar o rechazar/ })).toBeVisible();
    await expect(box.getByRole("button", { name: /Propuestas/ })).toBeVisible();
    await expect(box.getByText("Modo guía")).toBeVisible();
  });

  test("el asistente no inventa: sin coincidencias lo dice", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/panel");
    await settle(page);
    await page.getByRole("button", { name: /Abrir la ayuda/ }).click();
    const box = page.getByRole("dialog", { name: "Asistente de ayuda" });
    await box.getByLabel("Tu pregunta").fill("receta de paella valenciana");
    await box.getByLabel("Tu pregunta").press("Enter");
    await expect(box.getByText("No he encontrado nada sobre eso")).toBeVisible();
  });

  test("el Copiloto responde con fuentes y «Ver cálculo»", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.goto("/copiloto");
    await settle(page);
    await page.getByRole("button", { name: "¿Qué máquinas han fallado más este mes?" }).click();
    await expect(page.getByText("Fuentes")).toBeVisible();
    await expect(page.getByText("Ver cálculo")).toBeVisible();
  });
});

test.describe("ayuda contextual (tooltips)", () => {
  test("al pasar el ratón por el menú explica qué es la sección", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/panel");
    await settle(page);
    await page.locator("aside nav").getByRole("link", { name: "Alertas" }).hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Anomalías y avisos detectados");
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
  });

  test("también aparece con el teclado (Tab)", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/panel");
    await settle(page);
    await page.getByRole("link", { name: "Saltar al contenido" }).focus();
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(300); // el texto de ayuda aparece tras una breve espera al enfocar
      if (await page.getByRole("tooltip").isVisible()) break;
    }
    await expect(page.getByRole("tooltip")).toBeVisible();
  });

  test("las tarjetas de indicadores explican el cálculo y la fuente", async ({ page, context }) => {
    await loginAs(context, "direccion");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/panel");
    await settle(page);
    await page.getByRole("article").filter({ hasText: "Órdenes abiertas" }).hover();
    await expect(page.getByRole("tooltip")).toContainText("Fuente: PGMWin");
  });
});

test.describe("permisos de acciones (el servidor manda, no solo el botón)", () => {
  test("un perfil sin Órdenes no puede abrir el diálogo de nueva orden ni por la dirección", async ({ page, context }) => {
    await loginAs(context, "campo");
    await page.goto("/campo?accion=ot");
    await settle(page);
    await expect(page.getByRole("dialog", { name: "Nueva orden de trabajo" })).toHaveCount(0);
  });

  test("tampoco se ofrece «Nueva orden de trabajo» en la búsqueda", async ({ page, context }) => {
    await loginAs(context, "rrhh");
    await page.goto("/panel");
    await settle(page);
    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog", { name: "Buscar o ir a" }).getByText("Nueva orden de trabajo")).toHaveCount(0);
  });
});
