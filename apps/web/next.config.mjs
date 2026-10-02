/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les packages du monorepo sont du TypeScript source : Next doit les transpiler.
  transpilePackages: ["@secprep/bank", "@secprep/db", "@secprep/quiz"],
  experimental: {
    // @node-rs/argon2 et @prisma/client sont des modules serveur natifs.
    serverComponentsExternalPackages: ["@node-rs/argon2", "@prisma/client"],
  },
};

export default nextConfig;
