// Server actions return errors as values: thrown errors are hidden by React in production builds.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
