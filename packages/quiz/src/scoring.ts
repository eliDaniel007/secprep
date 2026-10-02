import type { Difficulte } from "./types";

/** Points de base d'une question selon sa difficulte. */
export const POINTS_BASE: Record<Difficulte, number> = {
  facile: 10,
  moyen: 20,
  difficile: 30,
};

/** Facteur applique quand un indice a ete utilise (bonne reponse comptee a moitie). */
export const FACTEUR_INDICE = 0.5;

export function pointsBase(difficulte: Difficulte): number {
  return POINTS_BASE[difficulte];
}

/** Applique la penalite d'indice a un nombre de points gagnes. */
export function appliquerIndice(points: number, indiceUtilise: boolean): number {
  return indiceUtilise ? Math.round(points * FACTEUR_INDICE) : points;
}
