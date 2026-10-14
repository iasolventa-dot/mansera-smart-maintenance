"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@msm/ui";

/** Error inesperado en una pantalla: mensaje claro, sin detalles técnicos, y opción de reintentar. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[pantalla] error", error.digest ?? "");
  }, [error]);
  return (
    <div role="alert" className="mx-auto mt-10 grid max-w-lg justify-items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center">
      <TriangleAlert className="size-10 text-warn-text" aria-hidden="true" />
      <h1 className="text-[22px] font-extrabold">No se pudo cargar esta pantalla</h1>
      <p className="text-[16px] text-muted">Puede ser un problema momentáneo de conexión con alguno de los sistemas. Inténtalo de nuevo; si se repite, avisa a TI{error.digest ? ` (referencia ${error.digest})` : ""}.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
