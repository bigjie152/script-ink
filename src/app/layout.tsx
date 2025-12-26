import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Noto_Serif_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "剧本墨坊 Script Ink",
  description: "剧本杀创作与协作平台",
};

export const runtime = "edge";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} ${displayFont.variable} antialiased`}>
        <SiteHeader />
        <main className="mx-auto min-h-screen w-full max-w-6xl px-6 pb-20 pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
