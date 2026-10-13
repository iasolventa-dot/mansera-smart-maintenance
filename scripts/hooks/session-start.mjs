// Se ejecuta en SessionStart (inicio, reanudar, limpiar y TRAS COMPACTAR).
// Lo que imprime por stdout se añade al contexto de Claude.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : `(falta ${p})`);

const diario = read('memory/DIARIO.md').split('\n').slice(0, 14).join('\n');

console.log(`# CONTEXTO DE RECUPERACIÓN (automático)
Estás en el proyecto MANSERA Smart Maintenance. Sigue CLAUDE.md. Estado actual:

${read('memory/ESTADO.md')}

## Últimas entradas del diario
${diario}

## Recordatorio
- Plan: docs/11-roadmap.md · Índice: docs/00-INDEX.md · Supuestos: memory/SUPUESTOS.md
- Antes de cerrar un bloque: /cierre. Al terminar un hito: /revision.
- Entrega al usuario los comandos PowerShell de git tras cada bloque de cambios.`);
