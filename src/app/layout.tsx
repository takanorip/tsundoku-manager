import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "積読棚",
  description: "買った本と、まだ読んでいない本を並べておく棚。",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-mode="light" className="h-full antialiased">
      <body className="min-h-full bg-kumo-canvas text-kumo-default">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
