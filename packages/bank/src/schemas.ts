import { z } from "zod";

/**
 * Schemas Zod — SOURCE DE VERITE UNIQUE pour la banque de questions.
 *
 * On valide le JSON brut tel qu'il est redige (snake_case : cours_google,
 * temps_sec, objectif_sy0701). La transformation vers le modele Prisma
 * (camelCase + contenu JSON) se fait dans mapper.ts.
 *
 * L'union discriminee par `type` garantit que chaque type a exactement les
 * champs attendus. Les index de reponse sont verifies par superRefine.
 */

export const DOMAINES = [1, 2, 3, 4, 5] as const;
export const DIFFICULTES = ["facile", "moyen", "difficile"] as const;
export const TYPES = [
  "qcm",
  "qcm_multiple",
  "vf",
  "libre",
  "scenario",
  "urgence",
  "plan_reprise",
  "ordonnancement",
  "appariement",
  "cas_complexe",
] as const;
export const SOURCES = ["officiel", "lot", "genere"] as const;
export const STATUTS = ["brouillon", "valide"] as const;

const domaine = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
const difficulte = z.enum(DIFFICULTES);
const coursGoogle = z.number().int().min(1).max(9).optional();

// Champs communs a tous les types.
const base = {
  id: z.string().min(1),
  domaine,
  cours_google: coursGoogle,
  difficulte,
  temps_sec: z.number().int().positive(),
  enonce: z.string().min(1),
  explication: z.string().min(1),
  indice: z.string().optional(),
  astuce: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  objectif_sy0701: z.string().optional(),
  source: z.enum(SOURCES).optional(),
  statut: z.enum(STATUTS).optional(),
};

// --- Types a choix (index dans options) ---
const optionsSchema = z.array(z.string().min(1)).min(2);

const qcmLike = z.object({
  ...base,
  type: z.enum(["qcm", "scenario", "urgence", "plan_reprise"]),
  options: optionsSchema,
  reponse: z.number().int().nonnegative(),
});

const qcmMultiple = z.object({
  ...base,
  type: z.literal("qcm_multiple"),
  options: optionsSchema,
  reponse: z.array(z.number().int().nonnegative()).min(1),
});

const vf = z.object({
  ...base,
  type: z.literal("vf"),
  reponse: z.boolean(),
});

const libre = z.object({
  ...base,
  type: z.literal("libre"),
  reponse: z.object({
    modele: z.string().min(1),
    mots_cles: z.array(z.array(z.string().min(1)).min(1)).min(1),
    points: z.number().int().positive(),
    seuil_reussite: z.number().int().nonnegative(),
  }),
});

const ordonnancement = z.object({
  ...base,
  type: z.literal("ordonnancement"),
  elements: z.array(z.string().min(1)).min(2),
  reponse: z.array(z.number().int().nonnegative()).min(2),
});

const appariement = z.object({
  ...base,
  type: z.literal("appariement"),
  paires: z
    .array(
      z.object({
        gauche: z.string().min(1),
        droite: z.string().min(1),
      }),
    )
    .min(2),
  // Les paires sont fournies deja associees ; marqueur conventionnel.
  reponse: z.literal("paires_dans_l_ordre"),
});

const etape = z.object({
  titre: z.string().min(1),
  enonce: z.string().min(1),
  options: optionsSchema,
  reponse: z.number().int().nonnegative(),
  explication: z.string().min(1),
});

const casComplexe = z.object({
  ...base,
  // Pour un cas complexe, l'explication est portee par chaque etape ;
  // l'explication racine est donc optionnelle.
  explication: z.string().min(1).optional(),
  type: z.literal("cas_complexe"),
  etapes: z.array(etape).min(1),
});

/** Union discriminee par `type`. */
export const questionSchema = z
  .discriminatedUnion("type", [
    qcmLike,
    qcmMultiple,
    vf,
    libre,
    ordonnancement,
    appariement,
    casComplexe,
  ])
  .superRefine((q, ctx) => {
    // Verification des index de reponse hors limites.
    if (
      q.type === "qcm" ||
      q.type === "scenario" ||
      q.type === "urgence" ||
      q.type === "plan_reprise"
    ) {
      if (q.reponse >= q.options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reponse"],
          message: `index de reponse ${q.reponse} hors limites (${q.options.length} options)`,
        });
      }
    }
    if (q.type === "qcm_multiple") {
      for (const idx of q.reponse) {
        if (idx >= q.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["reponse"],
            message: `index de reponse ${idx} hors limites (${q.options.length} options)`,
          });
        }
      }
    }
    if (q.type === "ordonnancement") {
      const n = q.elements.length;
      if (q.reponse.length !== n) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reponse"],
          message: `reponse (${q.reponse.length}) doit avoir autant d'entrees que elements (${n})`,
        });
      }
      const attendu = new Set(Array.from({ length: n }, (_, i) => i));
      const recu = new Set(q.reponse);
      if (recu.size !== n || [...attendu].some((i) => !recu.has(i))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reponse"],
          message: `reponse doit etre une permutation des index 0..${n - 1}`,
        });
      }
    }
    if (q.type === "cas_complexe") {
      q.etapes.forEach((e, i) => {
        if (e.reponse >= e.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["etapes", i, "reponse"],
            message: `etape ${i}: index ${e.reponse} hors limites (${e.options.length} options)`,
          });
        }
      });
    }
  });

export type Question = z.infer<typeof questionSchema>;

/** Gabarit (section `gabarits` du JSON). Valide de facon souple en Phase 1 :
 *  les generateurs seront implementes en Phase 10. */
export const gabaritSchema = z
  .object({
    id: z.string().min(1),
    domaine,
    type: z.enum(TYPES),
    difficulte: z.array(difficulte).min(1),
  })
  .passthrough();

export const metaSchema = z
  .object({
    nom: z.string().optional(),
    version: z.string().optional(),
    langue: z.string().optional(),
  })
  .passthrough();

/** Fichier de banque complet. */
export const bankFileSchema = z.object({
  meta: metaSchema.optional(),
  questions: z.array(z.unknown()).default([]),
  gabarits: z.array(z.unknown()).optional().default([]),
});

export type BankFile = z.infer<typeof bankFileSchema>;

/** Scenario de lab avec verite terrain (Phase 5). Format des fichiers
 *  data/scenarios/*.json (snake_case). */
export const scenarioSchema = z.object({
  slug: z.string().min(1),
  titre: z.string().min(1),
  type: z.enum(["incident", "audit", "postmortem", "escalade"]),
  contexte: z.string().min(1),
  objectif_sy0701: z.string().optional(),
  cours_google: z.number().int().min(1).max(9).optional(),
  verite_terrain: z.object({
    iocs: z.array(z.string()).optional().default([]),
    chronologie: z.array(z.string()).optional().default([]),
    bonnes_actions: z.array(z.string()).optional().default([]),
    faits_attendus: z.array(z.string()).optional().default([]),
  }),
  modele_markdown: z.string().optional().default(""),
});
export type ScenarioLabSource = z.infer<typeof scenarioSchema>;

export const scenarioFileSchema = z.object({
  scenarios: z.array(scenarioSchema).default([]),
});
