/**
 * Detection de quasi-doublons d'enonces.
 * Methode : Jaccard sur trigrammes de caracteres apres normalisation.
 * Zero dependance externe.
 */

/** Minuscules, accents retires, ponctuation -> espace, espaces compactes. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Ensemble de trigrammes de caracteres (sur le texte normalise). */
export function trigrammes(texte: string): Set<string> {
  const t = normaliser(texte);
  const set = new Set<string>();
  if (t.length < 3) {
    if (t.length > 0) set.add(t);
    return set;
  }
  for (let i = 0; i <= t.length - 3; i++) {
    set.add(t.slice(i, i + 3));
  }
  return set;
}

/** Indice de Jaccard entre deux ensembles : |A∩B| / |A∪B|. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Similarite entre deux enonces (0..1). */
export function similariteEnonces(x: string, y: string): number {
  return jaccard(trigrammes(x), trigrammes(y));
}

export interface PaireDoublon {
  idA: string;
  idB: string;
  similarite: number;
}

/**
 * Compare tous les enonces deux a deux et renvoie les paires dont la
 * similarite depasse le seuil. O(n^2) — convient pour quelques milliers
 * (au-dela, prevoir du MinHash/shingling indexe, cf. Phase 10).
 */
export function trouverDoublons(
  items: Array<{ id: string; enonce: string }>,
  seuil = 0.9,
): PaireDoublon[] {
  const prepares = items.map((it) => ({
    id: it.id,
    grams: trigrammes(it.enonce),
  }));
  const paires: PaireDoublon[] = [];
  for (let i = 0; i < prepares.length; i++) {
    for (let j = i + 1; j < prepares.length; j++) {
      const a = prepares[i]!;
      const b = prepares[j]!;
      const sim = jaccard(a.grams, b.grams);
      if (sim > seuil) {
        paires.push({ idA: a.id, idB: b.id, similarite: sim });
      }
    }
  }
  return paires;
}
