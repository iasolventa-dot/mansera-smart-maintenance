# Spikes de M1 (solo lectura)

Comprueban con credenciales REALES de prueba lo que hoy solo está documentado (`memory/SUPUESTOS.md`).
Las credenciales se pasan **solo por variables de entorno** (nunca en ficheros del repo). La salida muestra recuentos y
nombres de estructura (empresa, tableros, listas, departamentos, tipos de ausencia), nunca datos de personas.
Aun así, los nombres pueden incluir clientes: **no pegues la salida en el repositorio**; resume en SUPUESTOS.

Trello y Sésame usan los conectores reales (`packages/connectors`), así que el spike prueba exactamente el código que usará la plataforma:

```powershell
$env:SESAME_REGION="eu1"; $env:SESAME_TOKEN="..."; pnpm --filter @msm/connectors spike:sesame
$env:TRELLO_KEY="..."; $env:TRELLO_TOKEN="..."; pnpm --filter @msm/connectors spike:trello
$env:TRELLO_BOARD="<id del tablero de ofertas>"; pnpm --filter @msm/connectors spike:trello
# A3ERP: ejecutar DENTRO de la red de MANSERA (el servicio no es accesible desde Internet)
$env:A3_URL="https://servidor:puerto"; $env:A3_USER="..."; $env:A3_PASS="..."; node scripts/spikes/a3erp.mjs
```
Al terminar, borra las variables (`Remove-Item Env:SESAME_TOKEN`, etc.). No hay spike de PGMWin: pendiente de documentar.
