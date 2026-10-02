import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecPrep — Entrainement Security+",
  description:
    "Plateforme d'entrainement CompTIA Security+ (SY0-701) et de pratique SOC.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
