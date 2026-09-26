import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import type { Metadata, Viewport } from "next";
import { Allura, Atkinson_Hyperlegible_Next, Inter, M_PLUS_1, Nunito, Zen_Old_Mincho } from "next/font/google";
import { schemeOf, themeColors, themeStyle } from "@/lib/appearance";
import { getSettings } from "@/lib/data/queries";
import "./globals.css";

// FGO's own fonts (Fontworks Skip, Tsukushi Mincho) are commercial, so the default "FGO" style uses the
// closest free fonts: a clear gothic for text and an old-style mincho for chapter and place titles.
// Character names are in a flowing script with every font. Only the Latin subset is downloaded.
const mplus = M_PLUS_1({ variable: "--font-mplus", subsets: ["latin"] });
const zenOld = Zen_Old_Mincho({ variable: "--font-zen-old", subsets: ["latin"], weight: ["600"], preload: false });
const script = Allura({ variable: "--font-script", subsets: ["latin"], weight: "400" });

// Next.js has no size metrics for this newer font, so it can't build a size-matched fallback
// (and warns on every compile). Use plain system fallbacks instead.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
  preload: false,
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });

const fontVariables = [mplus, zenOld, script, atkinson, inter, nunito].map((f) => f.variable).join(" ");

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
    <html lang="en" data-font={font} data-narration={narration} data-frames={frames} data-scheme={schemeOf(colors)} style={themeStyle(colors)} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
