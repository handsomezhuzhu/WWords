import type { ReactNode } from "react";

import type { Metadata, Viewport } from "next";

import { designTokens } from "@/lib/design-tokens";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${designTokens.brand.name} Frontend`,
    template: `%s | ${designTokens.brand.name}`,
  },
  description: designTokens.brand.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c9652f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground"
        >
          跳到主要内容
        </a>
        <div id="main-content" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
