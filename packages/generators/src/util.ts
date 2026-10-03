import { Alea, hashChaine } from "@secprep/loggen";

/** Identifiant stable d'une question generee. */
export function idGenere(gabarit: string, graine: string): string {
  return `G-${gabarit}-${hashChaine(graine).toString(16)}`;
}

/**
 * Construit des options de QCM : place la bonne reponse parmi des distracteurs
 * (dedupliques), a une position deterministe. Renvoie {options, reponse}.
 */
export function qcm(
  alea: Alea,
  bonne: string,
  distracteurs: string[],
): { options: string[]; reponse: number } {
  const uniques: string[] = [];
  for (const d of distracteurs) {
    if (d !== bonne && !uniques.includes(d)) uniques.push(d);
  }
  // Complete si pas assez de distracteurs uniques.
  let n = 1;
  while (uniques.length < 3) {
    const faux = `${bonne}_${n}`;
    if (!uniques.includes(faux)) uniques.push(faux);
    n++;
  }
  const choisis = uniques.slice(0, 3);
  const pos = alea.entier(0, 3);
  const options = [...choisis];
  options.splice(pos, 0, bonne);
  return { options, reponse: pos };
}
