import { NextResponse, type NextRequest } from "next/server";
import { finishA3NominaOAuth } from "@/lib/oauth-a3nomina";

export const dynamic = "force-dynamic";

/** Retorno desde Wolters Kluwer: canjea el código en el servidor y vuelve a Conexiones con un código de resultado. */
export async function GET(request: NextRequest) {
  const outcome = await finishA3NominaOAuth(request.nextUrl.searchParams);
  return NextResponse.redirect(new URL(`/conexiones?oauth=${outcome}`, request.nextUrl.origin));
}
