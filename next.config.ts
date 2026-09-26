import type { NextConfig } from "next";

// Uploads stored in Supabase Storage can be optimized too.
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

const nextConfig: NextConfig = {
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
