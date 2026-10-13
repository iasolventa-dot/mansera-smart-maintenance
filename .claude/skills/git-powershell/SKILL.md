---
name: git-powershell
description: Úsala tras cada bloque de cambios de código o documentación para entregar al usuario los comandos PowerShell de git add/commit/push, con mensaje convencional en español y comprobaciones previas.
---
# Entrega de commits al usuario (PowerShell)

El usuario trabaja en Windows y ejecuta git él mismo. Tras cada bloque de cambios, entrega un bloque como este (adaptando mensaje y ficheros):

```powershell
cd <ruta de la raíz del proyecto>
git status
git add -A
git commit -m "feat(conectores): añade conector Trello con lectura de tableros"
git push
```

## Reglas
- Siempre desde la **raíz de este proyecto** (nunca desde `C:\Users\<usuario>`): recordar `cd` explícito.
- Antes: confirmar que `.gitignore` cubre `.env*` y datos reales; si `git status` mostraría ficheros sensibles, avisar y NO sugerir `git add -A`; usar `git add <rutas>`.
- Mensajes convencionales en español: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`. Un commit = un cambio coherente.
- No hacer push por cuenta propia (el permiso está denegado en `.claude/settings.json`).
- Primera vez: `git init`, `git branch -M main`, `git remote add origin <url>` (el usuario ya habrá creado el repo vacío en GitHub).
