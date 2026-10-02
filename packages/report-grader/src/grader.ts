import Anthropic from "@anthropic-ai/sdk";
import { sortieIASchema, type ModeIA, type SortieIA, type VeriteTerrain } from "./schemas";
import { systemePrompt, utilisateurPrompt } from "./prompts";

export class CleApiManquante extends Error {
  constructor() {
    super("Cle API Anthropic manquante (ANTHROPIC_API_KEY).");
    this.name = "CleApiManquante";
  }
}

export class ReponseIAInvalide extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReponseIAInvalide";
  }
}

export const MODELE_DEFAUT = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

/** Fonction d'appel au modele (injectable pour les tests). Renvoie le texte brut. */
export type AppelModele = (args: {
  systeme: string;
  utilisateur: string;
  modele: string;
}) => Promise<string>;

/** Appel reel a l'API Claude via le SDK officiel. */
function appelAnthropic(apiKey: string): AppelModele {
  const client = new Anthropic({ apiKey });
  return async ({ systeme, utilisateur, modele }) => {
    // Sur claude-opus-5-5, omettre `thinking` lance le raisonnement adaptatif
    // par defaut. On ne fixe pas le parametre pour rester compatible avec le
    // SDK installe et avec les modeles configurables via ANTHROPIC_MODEL.
    const reponse = await client.messages.create({
      model: modele,
      max_tokens: 16000,
      system: systeme,
      messages: [{ role: "user", content: utilisateur }],
    });
    const bloc = reponse.content.find((b) => b.type === "text");
    return bloc && bloc.type === "text" ? bloc.text : "";
  };
}

/** Enleve un eventuel bloc de code Markdown autour du JSON. */
function extraireJson(texte: string): string {
  const t = texte.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1]!.trim();
  // Sinon, du premier { au dernier }.
  const debut = t.indexOf("{");
  const fin = t.lastIndexOf("}");
  if (debut >= 0 && fin > debut) return t.slice(debut, fin + 1);
  return t;
}

export interface OptionsCorrection {
  mode: ModeIA;
  contexteScenario: string;
  verite: VeriteTerrain;
  rapportMarkdown: string;
  apiKey?: string;
  modele?: string;
  /** Pour les tests : remplace l'appel reel au modele. */
  appeler?: AppelModele;
}

export interface ResultatCorrection {
  sortie: SortieIA;
  modele: string;
}

/**
 * Corrige un rapport en mode Coach ou Correcteur.
 * Leve CleApiManquante si aucune cle et aucun appel injecte.
 * Leve ReponseIAInvalide si la sortie ne respecte pas le schema.
 */
export async function corrigerRapport(
  opts: OptionsCorrection,
): Promise<ResultatCorrection> {
  const modele = opts.modele ?? MODELE_DEFAUT;
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;

  const appeler =
    opts.appeler ??
    (apiKey ? appelAnthropic(apiKey) : null);
  if (!appeler) throw new CleApiManquante();

  const systeme = systemePrompt(opts.mode);
  const utilisateur = utilisateurPrompt(
    opts.contexteScenario,
    opts.verite,
    opts.rapportMarkdown,
  );

  const texte = await appeler({ systeme, utilisateur, modele });

  let brut: unknown;
  try {
    brut = JSON.parse(extraireJson(texte));
  } catch {
    throw new ReponseIAInvalide("La reponse de l'IA n'est pas un JSON valide.");
  }

  const parse = sortieIASchema.safeParse(brut);
  if (!parse.success) {
    throw new ReponseIAInvalide(
      "La reponse de l'IA ne respecte pas le schema attendu.",
    );
  }
  if (parse.data.mode !== opts.mode) {
    throw new ReponseIAInvalide("Le mode de la reponse ne correspond pas.");
  }

  return { sortie: parse.data, modele };
}
