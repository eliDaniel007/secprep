import { Alea, hashChaine } from "@secprep/loggen";

/** Identifiant stable d'une question generee. */
export function idGenere(gabarit: string, graine: string): string {
  return `G-${gabarit}-${hashChaine(graine).toString(16)}`;
}

/**
 * Construit des options de QCM : place la bonne reponse parmi des distracteurs
 * (dedupliques), a une position deterministe. Renvoie {options, reponse}.
 */
/** Met a l'echelle le premier nombre trouve dans une chaine (garde le format,
 *  ex. "26 750 $" -> "80 250 $"). Renvoie null si aucun nombre. */
function scaleNombre(s: string, facteur: number): string | null {
  const m = s.match(/\d[\d\s]*\d|\d/);
  if (!m || m.index === undefined) return null;
  const brut = m[0].replace(/\s/g, "");
  const n = Number.parseInt(brut, 10);
  if (!Number.isFinite(n)) return null;
  const nv = Math.max(1, Math.round(n * facteur));
  const fmt = nv.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return s.slice(0, m.index) + fmt + s.slice(m.index + m[0].length);
}

export function qcm(
  alea: Alea,
  bonne: string,
  distracteurs: string[],
): { options: string[]; reponse: number } {
  const uniques: string[] = [];
  for (const d of distracteurs) {
    if (d !== bonne && !uniques.includes(d)) uniques.push(d);
  }
  // Complete avec des variantes numeriques plausibles (jamais de "_1").
  const facteurs = [2, 3, 5, 10, 0.5, 4, 7];
  for (const f of facteurs) {
    if (uniques.length >= 3) break;
    const v = scaleNombre(bonne, f);
    if (v && v !== bonne && !uniques.includes(v)) uniques.push(v);
  }
  // Repli ultime (chaines non numeriques) : suffixe discret.
  let n = 2;
  while (uniques.length < 3) {
    const faux = `${bonne} (${n})`;
    if (!uniques.includes(faux)) uniques.push(faux);
    n++;
  }
  const choisis = uniques.slice(0, 3);
  const pos = alea.entier(0, 3);
  const options = [...choisis];
  options.splice(pos, 0, bonne);
  return { options, reponse: pos };
}
