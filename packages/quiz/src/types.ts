export type Difficulte = "facile" | "moyen" | "difficile";

/** Reponse rentree par l'utilisateur, selon le type de question. */
export type ReponseUtilisateur =
  | { type: "qcm"; index: number }
  | { type: "vf"; valeur: boolean }
  | { type: "libre"; texte: string };

/** Grille de correction d'une question libre (telle que stockee). */
export interface GrilleLibre {
  modele: string;
  mots_cles: string[][]; // groupes de synonymes
  points: number;
  seuil_reussite: number;
}

/** Resultat d'une correction. */
export interface Resultat {
  correct: boolean;
  /** Points gagnes (indice deja applique). */
  pointsGagnes: number;
  /** Points maximum possibles pour cette question. */
  pointsMax: number;
  /** Detail optionnel (pour la correction libre). */
  detail?: ResultatLibreDetail;
}

export interface ResultatLibreDetail {
  groupesTrouves: number;
  groupesTotal: number;
  /** Index des groupes manques (pour afficher ce qui manquait). */
  groupesManques: number[];
}
