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
  ],
  experimental: {
    // Modules serveur natifs / lourds a ne pas bundler cote client.
    serverComponentsExternalPackages: [
      "@node-rs/argon2",
      "@prisma/client",
      "@anthropic-ai/sdk",
    ],
  },
};

export default nextConfig;
