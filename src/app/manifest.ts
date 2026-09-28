import type { MetadataRoute } from "next";

// Lets the site be added to a phone's home screen and open full screen, like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bond Garden",
    short_name: "Bond Garden",
    description: "A personal Fate/Grand Order style visual novel chat",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f1724",
    theme_color: "#0f1724",
    icons: [
      { src: "/assets/app/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/app/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/app/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
