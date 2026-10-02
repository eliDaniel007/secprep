/**
 * Algorithme de repetition espacee SM-2 (SuperMemo 2).
 * Reference : https://super-memory.com/english/ol/sm2.htm
 */

export interface EtatSM2 {
  /** Nombre de revisions reussies consecutives. */
  repetitions: number;
  /** Intervalle en jours avant la prochaine revision. */
  intervalleJours: number;
  /** Facteur de facilite (ease factor), >= 1.3. */
  facilite: number;
}

export const ETAT_SM2_INITIAL: EtatSM2 = {
  repetitions: 0,
  intervalleJours: 0,
  facilite: 2.5,
};

/** Qualite de reponse SM-2 (0..5) derivee d'une correction de quiz. */
export function qualiteSM2(correct: boolean, indiceUtilise: boolean): number {
  if (!correct) return 2;
  return indiceUtilise ? 4 : 5;
}

/**
 * Calcule le nouvel etat SM-2 apres une revision de qualite `q` (0..5).
 * q < 3 : echec -> on recommence (intervalle 1 jour).
 */
export function planifierSM2(etat: EtatSM2, q: number): EtatSM2 {
  const qualite = Math.max(0, Math.min(5, Math.round(q)));

  let facilite =
    etat.facilite + (0.1 - (5 - qualite) * (0.08 + (5 - qualite) * 0.02));
  if (facilite < 1.3) facilite = 1.3;
  facilite = Math.round(facilite * 1000) / 1000;

  let repetitions: number;
  let intervalleJours: number;

  if (qualite < 3) {
    repetitions = 0;
    intervalleJours = 1;
  } else {
    repetitions = etat.repetitions + 1;
    if (repetitions === 1) intervalleJours = 1;
    else if (repetitions === 2) intervalleJours = 6;
    else intervalleJours = Math.round(etat.intervalleJours * facilite);
  }

  return { repetitions, intervalleJours, facilite };
}

/** Date de la prochaine revision a partir de `depuis` (defaut : maintenant). */
export function prochaineRevision(
  intervalleJours: number,
  depuis: Date = new Date(),
): Date {
  const d = new Date(depuis);
  d.setDate(d.getDate() + intervalleJours);
  return d;
}
