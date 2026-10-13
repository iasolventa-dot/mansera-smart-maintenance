# Spikes de M1 (solo lectura)

Comprueban con credenciales REALES de prueba lo que hoy solo está documentado (`memory/SUPUESTOS.md` S-11..S-14).
Las credenciales se pasan **solo por variables de entorno** (nunca en ficheros del repo) y la salida es anonimizada: estado HTTP, latencia y nombres de campos, sin valores.

```powershell
$env:TRELLO_KEY="..."; $env:TRELLO_TOKEN="..."; node scripts/spikes/trello.mjs
$env:SESAME_REGION="eu1"; $env:SESAME_TOKEN="..."; node scripts/spikes/sesame.mjs
# A3ERP: ejecutar DENTRO de la red de MANSERA (el servicio no es accesible desde Internet)
$env:A3_URL="https://servidor:puerto"; $env:A3_USER="..."; $env:A3_PASS="..."; node scripts/spikes/a3erp.mjs
```
Anota el resultado (fecha, entorno, evidencia) en `memory/SUPUESTOS.md`. No hay spike de PGMWin: pendiente de documentar (Q2).
