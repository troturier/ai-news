import "server-only";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";

/** Admins only; for any other visitor the page "does not exist". */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") notFound();
  return session.user;
}
