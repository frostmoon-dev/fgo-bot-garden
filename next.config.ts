import type { NextConfig } from "next";

// Uploads stored in Supabase Storage can be optimized too.
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  // db.ts reads the database's CA certificate at runtime (certs/supabase-ca.crt), a path the bundler
  // can't see, so ship it with every server function. DATABASE_CA_CERT still takes precedence.
  outputFileTracingIncludes: { "/*": ["./certs/**/*"] },
  images: {
    // Sprite sheets are served as WebP: about a fifth of the PNG size.
    qualities: [75, 90],
    localPatterns: [
      { pathname: "/assets/**", search: "" },
      { pathname: "/uploads/**", search: "" },
    ],
    remotePatterns: supabase
      ? [{ protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/**" }]
      : [],
    // Sheets rarely change; keep optimized copies for a month.
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
