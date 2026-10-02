// Types et libelles cote client pour l'affichage des corrections IA.
// Volontairement decouple de @secprep/report-grader pour NE PAS importer le SDK
// Anthropic dans le bundle client.

export const LIBELLE_CRITERE: Record<string, string> = {
  exactitude_technique: "Exactitude technique",
  structure: "Structure",
  clarte: "Clarte",
  preuves_citees: "Preuves citees",
  recommandations_realistes: "Recommandations realistes",
  ton_professionnel: "Ton professionnel",
};

export interface AffirmationNonAppuyee {
  affirmation: string;
  pourquoi: string;
}

export interface SortieCoach {
  mode: "coach";
  resume: string;
  elementsManquants: string[];
  questions: string[];
  pistesMethodo: string[];
  affirmationsNonAppuyees: AffirmationNonAppuyee[];
}

export interface SortieCorrecteur {
  mode: "correcteur";
  criteres: { critere: string; note: number; commentaire: string }[];
  pointsForts: string[];
  erreurs: string[];
  elementsManquants: string[];
  affirmationsNonAppuyees: AffirmationNonAppuyee[];
  noteGlobale: number;
  syntheseFinale: string;
}

export type SortieIA = SortieCoach | SortieCorrecteur;
