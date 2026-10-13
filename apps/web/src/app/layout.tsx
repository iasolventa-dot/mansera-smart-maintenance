import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { MotionRoot } from "@msm/ui";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "MANSERA Smart Maintenance", template: "%s · MANSERA Smart Maintenance" },
  description: "Un solo acceso a PGMWin, A3, Trello y Sésame, con inteligencia artificial trazable.",
  applicationName: "MANSERA Smart Maintenance",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "MANSERA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f3f6e" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1424" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar (evita el parpadeo). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("msm-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>
        <MotionRoot>{children}</MotionRoot>
      </body>
    </html>
  );
}
