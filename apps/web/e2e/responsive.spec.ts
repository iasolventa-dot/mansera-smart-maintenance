import { expect, test } from "@playwright/test";
import { ROLES, loginAs, routesFor, settle } from "./helpers";

// Una página nunca debe ser más ancha que la pantalla (un desbordamiento descoloca los elementos fijos en móvil).
const SIZES = [{ w: 375, h: 812 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];

for (const role of ROLES) {
  for (const route of routesFor(role)) {
    for (const { w, h } of SIZES) {
      test(`sin desbordamiento ${w} · ${role} · ${route}`, async ({ page, context }) => {
        await loginAs(context, role);
        await page.setViewportSize({ width: w, height: h });
        await page.goto(route);
        await settle(page);
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
        expect(scrollWidth, `la página mide ${scrollWidth}px en una pantalla de ${innerWidth}px`).toBeLessThanOrEqual(innerWidth);
      });
    }
  }
}
