# Registro de decisiones (índice de ADR)

Formato de cada ADR en `memory/adr/NNNN-titulo.md`: Contexto · Decisión · Alternativas · Consecuencias · Estado (propuesto/aceptado/sustituido) · Fecha.

| ADR | Título | Estado |
|---|---|---|
| 0001 | API-first con política de acceso a datos (live por defecto; almacén mínimo y regenerable) | Aceptado |
| 0002 | Stack: monorepo pnpm+Turbo, Next.js+TS, Tailwind+shadcn+Motion, Supabase, Vercel | Aceptado (de hecho) |
| 0003 | Gateway on-prem saliente para apps locales | Propuesto (depende de Q1/M1) |
| 0004 | Multi-tenant desde el día 1 (`org_id` + RLS) | Aceptado (de hecho) |
| 0005 | Escrituras como propuesta con aprobación humana | Aceptado |
| 0006 | IA solo en servidor, con citas obligatorias y permisos heredados | Aceptado |
| 0007 | n8n solo para orquestación auxiliar no crítica | Propuesto |
| 0008 | Interfaz primero sobre contrato de datos `DataProvider` (reutilizable, no maqueta) | Aceptado |
| 0009 | Manual de usuario y asistente de ayuda con IA (fuente única, modo guía, límite diario) | Aceptado |
| 0010 | Credenciales de conectores en Supabase Vault (solo TI, auditoría sin valores) | Propuesto (implementado) |
| 0011 | Protocolo del gateway: trabajos firmados, lista blanca, solo salientes | Propuesto (implementado sin transporte) |
| 0012 | Credenciales de sistemas locales (A3ERP, PGMWin) solo en el gateway | Aceptado (decisión delegada por el usuario) |
| 0013 | a3innuva Nómina en el ecosistema (OAuth WKA, solo lectura, agregados) | Propuesto (implementado) |
| 0014 | Caché por organización y capa de datos reales (retención 24 h) | Propuesto (implementado) |
| 0015 | Vía de integración con PGMWin: lectura SQL sobre vistas (fase 1), API a medida para escribir | Propuesto (pendiente de MANSERA) |
| 0016 | Plan de costes de terceros por fases | Propuesto (pendiente de MANSERA) |

Para crear uno nuevo: copiar `adr/0000-plantilla.md`.
