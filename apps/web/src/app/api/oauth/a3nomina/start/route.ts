import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, startA3NominaOAuth } from "@/lib/oauth-a3nomina";

export const dynamic = "force-dynamic";

/**
 * Inicia la autorización con Wolters Kluwer. Solo POST desde la propia aplicación (comprobación de Origin):
 * un enlace o formulario de otro sitio no puede lanzar el flujo a un TI con sesión abierta.
 */
export async function POST(request: NextRequest) {
  const origin = appOrigin(request.nextUrl.origin);
  if (request.headers.get("origin") !== origin && request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse("Origen no permitido", { status: 403 });
  }
  const r = await startA3NominaOAuth(origin);
  return NextResponse.redirect("redirect" in r ? r.redirect : new URL(`/conexiones?oauth=${r.outcome}`, origin), 303);
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/conexiones", appOrigin(request.nextUrl.origin)));
}
