import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Inter, Nunito } from "next/font/google";
import { themeColors, themeStyle } from "@/lib/appearance";
import { getSettings } from "@/lib/data/queries";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], preload: false });

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
    return { theme: s.theme, customBg: s.customBg, font: s.font };
  } catch {
    // The login page must still render if the database is unreachable.
    return { theme: "night", customBg: "", font: "clear" };
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { theme, customBg, font } = await appearance();
  return (
    <html
      lang="en"
      data-font={font}
      style={themeStyle(themeColors(theme, customBg))}
      className={`${atkinson.variable} ${inter.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
