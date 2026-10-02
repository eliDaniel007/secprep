import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Charge le .env de la racine du monorepo (packages/db/src -> ../../..).
// Ne surcharge pas les variables deja definies dans l'environnement.
loadEnv({
  path: resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..", ".env"),
});

// Client Prisma partage (singleton en developpement pour eviter de multiplier
// les connexions lors du hot-reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
