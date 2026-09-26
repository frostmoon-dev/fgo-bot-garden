import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  // Optional: the AI model can be set in the app instead (Connection page), which takes precedence.
  LLM_BASE_URL: z.string().url().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  APP_PASSWORD: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("assets"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

// Read lazily so `next build` does not need secrets.
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse({
      ...process.env,
      LLM_BASE_URL: process.env.LLM_BASE_URL || undefined,
      LLM_API_KEY: process.env.LLM_API_KEY || undefined,
      LLM_MODEL: process.env.LLM_MODEL || undefined,
      SUPABASE_URL: process.env.SUPABASE_URL || undefined,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
      SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || undefined,
    });
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment variables: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}
