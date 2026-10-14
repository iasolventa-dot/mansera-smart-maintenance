/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Los paquetes del monorepo se publican como TypeScript fuente.
  transpilePackages: ["@msm/connectors", "@msm/core", "@msm/ui"],
  // Cabeceras de seguridad (revisión completa 2026-10-14). Sin CSP de scripts por ahora (Next usa scripts en línea);
  // frame-ancestors impide incrustar la aplicación en otra web (clickjacking sobre «Eliminar» o «Conectar»).
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Micrófono permitido solo para «Dictar parte»; el resto, desactivado.
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
      ],
    }];
  },
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
