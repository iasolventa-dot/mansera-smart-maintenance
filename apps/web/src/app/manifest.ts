import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MANSERA Smart Maintenance",
    short_name: "MANSERA",
    description: "Panel unificado de mantenimiento con IA trazable.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fa",
    theme_color: "#1f3f6e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
