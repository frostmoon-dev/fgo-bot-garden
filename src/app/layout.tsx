import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Cormorant_Garamond, Figtree } from "next/font/google";
import { schemeOf, themeColors, themeStyle } from "@/lib/appearance";
import { getSettings } from "@/lib/data/queries";
import "./globals.css";

// Two families, used everywhere. Figtree is a clear humanist sans for everything you read; Cormorant
// Garamond is a classical serif for titles, and its italic, which reads like calligraphy, for character
// names. Atkinson Hyperlegible replaces Figtree for the "Clear" font setting.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});
// Next.js has no size metrics for this newer font, so it can't build a size-matched fallback
// (and warns on every compile). Use plain system fallbacks instead.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
  preload: false,
});

const fontVariables = [figtree, cormorant, atkinson].map((f) => f.variable).join(" ");

// Appearance settings live in the database, so every page renders per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bot Garden",
  description: "A personal Fate/Grand Order style visual novel chat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1724",
};

async function appearance() {
  try {
    const s = await getSettings();
    return { theme: s.theme, customBg: s.customBg, font: s.font, narration: s.narrationStyle, frames: s.frameStyle };
  } catch {
    // The login page must still render if the database is unreachable.
    return { theme: "night", customBg: "", font: "fgo", narration: "italic", frames: "fgo" };
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { theme, customBg, font, narration, frames } = await appearance();
  const colors = themeColors(theme, customBg);
  return (
    <html
      lang="en"
      data-font={font}
      data-narration={narration}
      data-frames={frames}
      data-scheme={schemeOf(colors)}
      style={themeStyle(colors)}
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
