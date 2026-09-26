import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

// In dev the client survives hot reloads. It remembers which generated class made it, so after
// `prisma generate` (a new model or column) the next reload builds a fresh one instead of an outdated one.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: typeof PrismaClient };

// Hosted Postgres (Supabase) requires SSL, which node-postgres doesn't enable by default.
// Supabase signs its certs with its own CA, so verify against that CA.
// DATABASE_CA_CERT is either a file path or the PEM text itself (handy on Vercel).
function sslConfig(connectionString: string | undefined) {
  if (!connectionString || /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) return undefined;
  const setting = process.env.DATABASE_CA_CERT ?? "certs/supabase-ca.crt";
  if (setting.includes("-----BEGIN")) return { ca: setting.replace(/\\n/g, "\n") };
  // A local file, read at runtime only: don't let the bundler trace the whole project for it.
  return existsSync(/*turbopackIgnore: true*/ setting) ? { ca: readFileSync(/*turbopackIgnore: true*/ setting, "utf8") } : true;
}

function create() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    // A new TLS connection to a far-away database costs seconds, so keep idle ones around.
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  // The pooler may close idle connections. Without a listener that would crash the server.
  pool.on("error", (error) => console.error("Database pool error", error.message));
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const cached = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;
if (!cached && globalForPrisma.prisma) void globalForPrisma.prisma.$disconnect().catch(() => {});

export const db = cached ?? create();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}
