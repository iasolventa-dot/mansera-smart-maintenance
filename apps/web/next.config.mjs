/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@msm/core", "@msm/ui"],
  // Configuración PÚBLICA de Supabase (staging "Mansera", UE). Se incrusta en el navegador por
  // diseño; la seguridad la da RLS. Una variable de entorno real (Vercel / .env.local) tiene
  // prioridad sobre estos valores por defecto. Aquí NUNCA va la service role ni ningún secreto.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://synwtbopxwvggicrfjjj.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_GlrfhOsMNW8m4fzjaMEKUg_AfOfeuXx",
  },
};
export default nextConfig;
