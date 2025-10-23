import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AUVP Uploader",
  description:
    "Painel administrativo para upload e gestão de arquivos com distribuição via CDN.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}
      >
        <div className="relative min-h-screen">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_55%)]" />
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 sm:px-8 lg:px-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
