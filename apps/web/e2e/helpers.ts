import AxeBuilder from "@axe-core/playwright";
import { NAV_HREF, ROLE_ORDER, navFor, type Role } from "@msm/core";
import type { BrowserContext, Page } from "@playwright/test";

/** Entra como un perfil de demostración (la misma cookie que pone el login demo). */
export async function loginAs(context: BrowserContext, role: Role) {
  await context.addCookies([{ name: "msm_demo_session", value: role, url: "http://localhost:" + (process.env.E2E_PORT ?? 3200) }]);
}

/** Rutas que cada rol puede abrir (sale del modelo de permisos real) + una ficha de detalle por sección con detalle. */
export function routesFor(role: Role): string[] {
  const base = navFor(role).map((id) => NAV_HREF[id]);
  const extra: string[] = [];
  if (base.includes("/activos")) extra.push("/activos/A-0142");
  if (base.includes("/clientes")) extra.push("/clientes/cl-1");
  return [...base, ...extra];
}

export const ROLES: Role[] = ROLE_ORDER;

/** Espera a que la página esté pintada y estable (hidratada, sin animaciones de entrada en curso). */
export async function settle(page: Page) {
  await page.waitForLoadState("load");
  await page.locator("main h1, main h2").first().waitFor();
  await page.waitForTimeout(700);
}

/** Violaciones graves de accesibilidad (WCAG 2.1 A/AA). Excluye el indicador del servidor de desarrollo de Next. */
export async function seriousViolations(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  return r.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, impact: v.impact, ayuda: v.help, nodos: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
}
