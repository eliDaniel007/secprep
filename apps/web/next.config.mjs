import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Racine du monorepo (apps/web -> ../../).
const monorepoRoot = path.join(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les packages du monorepo sont du TypeScript source : Next doit les transpiler.
  transpilePackages: [
    "@secprep/bank",
    "@secprep/db",
    "@secprep/quiz",
    "@secprep/report-grader",
    "@secprep/siem-query",
    "@secprep/labs",
    "@secprep/sandbox",
    "@secprep/packgen",
    "@secprep/generators",
  ],
  experimental: {
    // Trace les fichiers depuis la racine du monorepo (pnpm) pour que le moteur
    // Prisma soit embarque dans les fonctions serverless sur Vercel.
    outputFileTracingRoot: monorepoRoot,
    // Modules serveur natifs / lourds a ne pas bundler cote client.
    serverComponentsExternalPackages: [
      "@node-rs/argon2",
      "@prisma/client",
      "@anthropic-ai/sdk",
    ],
    // Force l'inclusion du moteur de requete Prisma (.so.node) dans le bundle
    // serverless (Vercel), introuvable sinon depuis le store pnpm.
    outputFileTracingIncludes: {
      "**/*": [
        "../../node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/*.node",
        "../../node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client/**",
        "../../node_modules/.prisma/client/*.node",
      ],
    },
  },
};

export default nextConfig;
