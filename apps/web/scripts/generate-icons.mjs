// Genera los iconos de la PWA a partir de la marca. Uso: node apps/web/scripts/generate-icons.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(out, { recursive: true });

const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d5a9e"/><stop offset="1" stop-color="#16315a"/></linearGradient>
  <linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd0ee"/><stop offset="1" stop-color="#3e97d0"/></linearGradient>
</defs>`;
// Marca: triángulo cian + bloque blanco (igual que el logotipo de la cabecera).
const mark = `<path d="M0 0H180L0 262Z" fill="url(#a)"/><path d="M180 0H292V262H72Z" fill="#fff" opacity=".95"/>`;

const svg = (maskable) => {
  const scale = maskable ? 0.9 : 1.18;
  const w = 292 * scale, h = 262 * scale;
  const tx = (512 - w) / 2, ty = (512 - h) / 2;
  const bg = maskable ? `<rect width="512" height="512" fill="url(#bg)"/>` : `<rect width="512" height="512" rx="112" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}${bg}<g transform="translate(${tx} ${ty}) scale(${scale})">${mark}</g></svg>`;
};

writeFileSync(join(out, "icon.svg"), svg(false));
const jobs = [
  ["icon-192.png", svg(false), 192],
  ["icon-512.png", svg(false), 512],
  ["icon-maskable-512.png", svg(true), 512],
  ["apple-touch-icon.png", svg(true), 180],
];
for (const [name, s, size] of jobs) await sharp(Buffer.from(s)).resize(size, size).png().toFile(join(out, name));
console.log("Iconos generados en", out);
