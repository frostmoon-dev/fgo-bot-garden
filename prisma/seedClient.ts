import { existsSync, readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

// The seed scripts use the direct connection (migrations need it too), with Supabase's CA when it isn't local.
export function client() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const local = !connectionString || /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  const caPath = process.env.DATABASE_CA_CERT ?? "certs/supabase-ca.crt";
  const ssl = local ? undefined : caPath.includes("-----BEGIN") ? { ca: caPath } : existsSync(caPath) ? { ca: readFileSync(caPath, "utf8") } : true;
  return new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString, ssl })) });
}
