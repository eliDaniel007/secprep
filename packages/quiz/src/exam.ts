/**
 * Logique du simulateur d'examen SY0-701.
 * NB : le bareme reel de CompTIA (100-900) est confidentiel. On utilise une
 * approximation lineaire assumee, affichee comme telle dans l'interface.
 */

/** Ponderation officielle des domaines (en %). */
export const PONDERATION_DOMAINE: Record<number, number> = {
  1: 12,
  2: 22,
  3: 18,
  4: 28,
  5: 20,
};

export const EXAMEN_SCORE_MIN = 100;
export const EXAMEN_SCORE_MAX = 900;
export const EXAMEN_SEUIL_REUSSITE = 750;
export const EXAMEN_NB_MAX = 90;
export const EXAMEN_DUREE_MIN = 90;

/**
 * Repartit `nombre` questions entre les 5 domaines selon la ponderation.
 * Utilise la methode du plus grand reste pour que la somme fasse `nombre`.
 */
export function repartitionExamen(nombre: number): Record<number, number> {
  const domaines = [1, 2, 3, 4, 5];
  const bruts = domaines.map((d) => ({
    d,
    exact: (PONDERATION_DOMAINE[d]! / 100) * nombre,
  }));
  const base = bruts.map((b) => ({ d: b.d, n: Math.floor(b.exact), reste: b.exact - Math.floor(b.exact) }));
  let attribue = base.reduce((s, b) => s + b.n, 0);
  const restant = nombre - attribue;
  // Distribue les unites restantes aux plus grands restes.
  base
    .slice()
    .sort((a, b) => b.reste - a.reste)
    .slice(0, restant)
    .forEach((b) => {
      b.n += 1;
    });
  const res: Record<number, number> = {};
  for (const b of base) res[b.d] = b.n;
  return res;
}

/** Convertit un ratio de points (0..1) en score echelonne 100-900. */
export function scoreExamen(pointsGagnes: number, pointsMax: number): number {
  const ratio = pointsMax === 0 ? 0 : pointsGagnes / pointsMax;
  const borne = Math.max(0, Math.min(1, ratio));
  return Math.round(EXAMEN_SCORE_MIN + borne * (EXAMEN_SCORE_MAX - EXAMEN_SCORE_MIN));
}

export function examenReussi(score: number): boolean {
  return score >= EXAMEN_SEUIL_REUSSITE;
}
