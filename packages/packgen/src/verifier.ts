import type { VeritePaquets } from "./types";

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\.$/, "").replace(/\s+/g, " ");
}

/** Verifie la reponse a un exercice (comparaison normalisee). */
export function verifierExercice(
  verite: VeritePaquets,
  exerciceId: string,
  reponse: string,
): { reussi: boolean; indice: string | null } {
  const ex = verite.exercices.find((e) => e.id === exerciceId);
  if (!ex) return { reussi: false, indice: null };
  const reussi = norm(reponse) === norm(ex.reponse);
  return { reussi, indice: reussi ? null : ex.indice };
}
