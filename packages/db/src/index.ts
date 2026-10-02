import { PrismaClient } from "@prisma/client";

// Client Prisma partage (singleton en developpement pour eviter de multiplier
// les connexions lors du hot-reload).
//
// Note : ce package ne charge PAS le .env lui-meme (il resterait fragile une
// fois bundle par Next). Les variables d'environnement (DATABASE_URL...) sont
// fournies par l'appelant : dotenv-cli pour les scripts CLI, et le chargement
// d'env de Next pour l'application web.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
