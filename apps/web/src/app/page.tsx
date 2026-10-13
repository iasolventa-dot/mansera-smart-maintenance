import { redirect } from "next/navigation";
import { homeFor } from "@msm/core";
import { getSession } from "@/lib/session";

export default async function Index() {
  const session = await getSession();
  redirect(session ? homeFor(session.role) : "/login");
}
