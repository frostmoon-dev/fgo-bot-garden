import "server-only";
import { ZodError } from "zod";
import type { ActionResult } from "./actionResult";

function describe(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
  }
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") return "That id or name is already used.";
  if (code === "P2025") return "It no longer exists. Reload the page.";
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function safe<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.error(error);
    return { ok: false, error: describe(error) };
  }
}
