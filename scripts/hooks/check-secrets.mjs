// PreToolUse (Write/Edit): bloquea escribir secretos evidentes en ficheros versionables.
import { readFileSync } from 'node:fs';

let input = '';
try { input = readFileSync(0, 'utf8'); } catch {}
let data = {};
try { data = JSON.parse(input); } catch {}

const ti = data.tool_input || {};
const path = String(ti.file_path || '');
const text = String(ti.content || ti.new_string || '');

const safeTarget = /(\.env\.example|\.md|\.sample\.)/.test(path);
const patterns = [
  /sk-[A-Za-z0-9_-]{20,}/,                 // claves tipo OpenAI/Anthropic
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, // JWT (service role, etc.)
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-\/+=]{16,}['"]/i,
];

if (!safeTarget && patterns.some((re) => re.test(text))) {
  console.error('Bloqueado: parece que se intenta escribir un secreto en un fichero versionable. Usa variables de entorno (.env.local, Vercel, Vault).');
  process.exit(2); // código 2 = bloquear y devolver el mensaje a Claude
}
process.exit(0);
