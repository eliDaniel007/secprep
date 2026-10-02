import { z } from "zod";

/** Les deux modes d'aide IA. */
export const MODES = ["coach", "correcteur"] as const;
export type ModeIA = (typeof MODES)[number];

/** Grille de criteres evalues en mode Correcteur (note /20 chacun). */
export const CRITERES = [
  "exactitude_technique",
  "structure",
  "clarte",
  "preuves_citees",
  "recommandations_realistes",
  "ton_professionnel",
] as const;
export type Critere = (typeof CRITERES)[number];

export const LIBELLE_CRITERE: Record<Critere, string> = {
  exactitude_technique: "Exactitude technique",
  structure: "Structure",
  clarte: "Clarte",
  preuves_citees: "Preuves citees",
  recommandations_realistes: "Recommandations realistes",
  ton_professionnel: "Ton professionnel",
};

const affirmationNonAppuyee = z.object({
  affirmation: z.string(),
  pourquoi: z.string(),
});

/** Sortie du mode Coach : questions et pistes, SANS reecrire le rapport. */
export const sortieCoachSchema = z.object({
  mode: z.literal("coach"),
  resume: z.string(),
  elementsManquants: z.array(z.string()),
  questions: z.array(z.string()),
  pistesMethodo: z.array(z.string()),
  affirmationsNonAppuyees: z.array(affirmationNonAppuyee),
});
export type SortieCoach = z.infer<typeof sortieCoachSchema>;

/** Sortie du mode Correcteur : note par critere + note globale. */
export const sortieCorrecteurSchema = z.object({
  mode: z.literal("correcteur"),
  criteres: z
    .array(
      z.object({
        critere: z.enum(CRITERES),
        note: z.number().min(0).max(20),
        commentaire: z.string(),
      }),
    )
    .min(1),
  pointsForts: z.array(z.string()),
  erreurs: z.array(z.string()),
  elementsManquants: z.array(z.string()),
  affirmationsNonAppuyees: z.array(affirmationNonAppuyee),
  noteGlobale: z.number().min(0).max(100),
  syntheseFinale: z.string(),
});
export type SortieCorrecteur = z.infer<typeof sortieCorrecteurSchema>;

export const sortieIASchema = z.discriminatedUnion("mode", [
  sortieCoachSchema,
  sortieCorrecteurSchema,
]);
export type SortieIA = z.infer<typeof sortieIASchema>;

/** Verite terrain d'un scenario de lab. */
export const veriteTerrainSchema = z.object({
  iocs: z.array(z.string()).default([]),
  chronologie: z.array(z.string()).default([]),
  bonnesActions: z.array(z.string()).default([]),
  faitsAttendus: z.array(z.string()).default([]),
});
export type VeriteTerrain = z.infer<typeof veriteTerrainSchema>;
