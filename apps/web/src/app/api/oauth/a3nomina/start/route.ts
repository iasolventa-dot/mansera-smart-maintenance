import { NextResponse, type NextRequest } from "next/server";
import { startA3NominaOAuth } from "@/lib/oauth-a3nomina";

export const dynamic = "force-dynamic";

/** Inicia la autorización con Wolters Kluwer (solo TI; comprobaciones en el servidor). */
export async function GET(request: NextRequest) {
  const r = await startA3NominaOAuth(request.nextUrl.origin);
  return NextResponse.redirect("redirect" in r ? r.redirect : new URL(`/conexiones?oauth=${r.outcome}`, request.nextUrl.origin));
}
