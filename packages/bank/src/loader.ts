import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FichierBanque } from "./validator.js";

// Racine du monorepo : packages/bank/src -> ../../..
const ICI = fileURLToPath(new URL(".", import.meta.url));
export const RACINE = resolve(ICI, "..", "..", "..");
export const DOSSIER_SEED = join(RACINE, "data", "seed");
export const DOSSIER_LOTS = join(RACINE, "data", "lots");

function lireJson(chemin: string): unknown {
  return JSON.parse(readFileSync(chemin, "utf-8"));
}

/** Charge tous les .json d'un dossier (tri alphabetique, deterministe). */
export function chargerDossier(dossier: string): FichierBanque[] {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort()
    .map((f) => ({
      nom: join(dossier, f),
      contenu: lireJson(join(dossier, f)),
    }));
}

/** Charge le seed puis les lots (dans cet ordre). */
export function chargerBanque(): FichierBanque[] {
  return [...chargerDossier(DOSSIER_SEED), ...chargerDossier(DOSSIER_LOTS)];
}
