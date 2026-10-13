# ADR 0002 · Stack
- **Fecha:** 2026-10-13 · **Estado:** propuesto
**Decisión:** monorepo pnpm+Turborepo; Next.js (App Router)+TypeScript; Tailwind+shadcn/ui+Motion; Supabase (Auth/Postgres/RLS/Storage/Realtime/pgvector); Vercel; Zod; Vitest+Playwright. Stack ya dominado por SOLVENTA (Mi PRL, EasyProject).
**Alternativas:** backend dedicado (NestJS) — más piezas que operar sin necesidad en MVP; Remix/SvelteKit — menor reutilización.
**Consecuencias:** funciones serverless no alcanzan la LAN → gateway (ADR-0003). Revisar si el volumen o la latencia lo exigen.
