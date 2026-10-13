import { expect, test } from "@playwright/test";
import { ROLES, loginAs, routesFor, seriousViolations, settle } from "./helpers";

// Accesibilidad (WCAG 2.1 AA) de TODAS las pantallas de TODOS los perfiles, en escritorio y tema claro.
for (const role of ROLES) {
  for (const route of routesFor(role)) {
    test(`a11y · ${role} · ${route}`, async ({ page, context }) => {
      await loginAs(context, role);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await settle(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
}

// Tema oscuro y móvil en las pantallas clave: es donde suelen romperse el contraste y el desbordamiento.
const KEY: [string, (typeof ROLES)[number]][] = [
  ["/panel", "direccion"], ["/alertas", "direccion"], ["/propuestas", "direccion"], ["/manual", "direccion"],
  ["/conexiones", "ti"], ["/campo", "campo"],
];
for (const [route, role] of KEY) {
  test(`a11y oscuro · ${role} · ${route}`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await loginAs(context, role);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route);
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
  test(`a11y móvil 375 · ${role} · ${route}`, async ({ page, context }) => {
    await loginAs(context, role);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(route);
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
}
