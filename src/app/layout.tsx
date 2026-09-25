import type { Metadata, Viewport } from "next";
import { Cinzel, Noto_Sans } from "next/font/google";
import "./globals.css";

const body = Noto_Sans({ variable: "--font-body", subsets: ["latin"] });
const display = Cinzel({ variable: "--font-display", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "FGO Bot Garden",
  description: "A personal Fate/Grand Order style visual novel chat",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1020",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
