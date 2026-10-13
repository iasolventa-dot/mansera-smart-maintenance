// Genera los iconos de la PWA a partir de la marca REAL de MANSERA. Uso: node apps/web/scripts/generate-icons.mjs
// La marca son 4 triángulos sobre un cuadrado de 447 × 447: tres azules y uno blanco en el centro.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(out, { recursive: true });

const MARK = `<polygon points="0,0 447,0 0,167" fill="#4673AF"/><polygon points="447,0 447,447 282,447" fill="#3E97D0"/><polygon points="0,167 282,447 0,447" fill="#61BDE4"/><polygon points="0,167 447,0 282,447" fill="#FFFFFF"/>`;

// Icono normal: la marca con esquinas redondeadas (fondo transparente).
const any = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 447 447"><defs><clipPath id="r"><rect width="447" height="447" rx="96"/></clipPath></defs><g clip-path="url(#r)">${MARK}</g></svg>`;
// Maskable: la marca al ~62 % sobre fondo blanco, dentro de la zona segura.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720"><rect width="720" height="720" fill="#FFFFFF"/><g transform="translate(136.5 136.5)">${MARK}</g></svg>`;
// Apple: marca a sangre; iOS pone sus propias esquinas.
const apple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 447 447">${MARK}</svg>`;

writeFileSync(join(out, "icon.svg"), any);
const jobs = [
  ["icon-192.png", any, 192],
  ["icon-512.png", any, 512],
  ["icon-maskable-512.png", maskable, 512],
  ["apple-touch-icon.png", apple, 180],
];
for (const [name, s, size] of jobs) await sharp(Buffer.from(s)).resize(size, size).png().toFile(join(out, name));
console.log("Iconos generados en", out);
