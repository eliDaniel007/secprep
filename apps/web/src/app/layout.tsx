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
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap"
        />
        {/* Applique le theme (choix sauvegarde, sinon systeme) avant le rendu
            pour eviter tout clignotement clair/sombre. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('secprep-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
