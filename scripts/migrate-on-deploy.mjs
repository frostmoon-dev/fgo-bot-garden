// Brings the database schema up to date during a Vercel production build, so a deploy never runs
// against missing columns. Does nothing anywhere else: local builds and preview deploys leave the
// database alone, so an unmerged branch can't change the live one.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") process.exit(0);

// Migrations need the direct (session) connection; the pooled DATABASE_URL can hang on them.
if (!process.env.DIRECT_URL) {
  console.error(
    "DIRECT_URL is not set. Add it in Vercel (Settings → Environment Variables, Production): " +
      "Supabase's Session pooler connection string. The build stops so the app never runs on an old schema.",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
