import { questionSchema, bankFileSchema, type Question } from "./schemas";
import { trouverDoublons, type PaireDoublon } from "./similarity";

export interface ProblemeValidation {
  fichier: string;
  id?: string;
  index: number; // position dans le tableau questions
  champ?: string;
  message: string;
}

export interface RapportValidation {
  ok: boolean;
  questionsValides: Question[];
  erreurs: ProblemeValidation[]; // bloquantes
  avertissements: ProblemeValidation[]; // non bloquantes
  doublons: PaireDoublon[];
  totalLues: number;
}

const OBJECTIF_REGEX = /^\d\.\d+$/;

export interface FichierBanque {
  nom: string;
  contenu: unknown;
}

/**
 * Valide un ou plusieurs fichiers de banque.
 * Regles bloquantes :
 *  - structure de fichier invalide
 *  - question non conforme au schema (champ manquant, type inconnu, index hors limites...)
 *  - id duplique (dans un fichier ou entre fichiers)
 *  - enonces quasi identiques (similarite > seuil)
 * Avertissements (non bloquants) :
 *  - objectif_sy0701 au format inattendu
 */
export function validerBanque(
  fichiers: FichierBanque[],
  options: { seuilSimilarite?: number } = {},
): RapportValidation {
  const seuil = options.seuilSimilarite ?? 0.9;
  const erreurs: ProblemeValidation[] = [];
  const avertissements: ProblemeValidation[] = [];
  const questionsValides: Question[] = [];
  const idsVus = new Map<string, string>(); // id -> fichier d'origine
  let totalLues = 0;

  for (const fichier of fichiers) {
    const parseFichier = bankFileSchema.safeParse(fichier.contenu);
    if (!parseFichier.success) {
      erreurs.push({
        fichier: fichier.nom,
        index: -1,
        message: `structure de fichier invalide : ${parseFichier.error.issues
          .map((i) => `${i.path.join(".")} ${i.message}`)
          .join("; ")}`,
      });
      continue;
    }

    const { questions } = parseFichier.data;
    questions.forEach((brut, index) => {
      totalLues++;
      const res = questionSchema.safeParse(brut);
      if (!res.success) {
        const idProbable =
          brut && typeof brut === "object" && "id" in brut
            ? String((brut as Record<string, unknown>).id)
            : undefined;
        for (const issue of res.error.issues) {
          erreurs.push({
            fichier: fichier.nom,
            id: idProbable,
            index,
            champ: issue.path.join(".") || undefined,
            message: issue.message,
          });
        }
        return;
      }

      const q = res.data;

      // id duplique
      if (idsVus.has(q.id)) {
        erreurs.push({
          fichier: fichier.nom,
          id: q.id,
          index,
          message: `id duplique (deja vu dans ${idsVus.get(q.id)})`,
        });
        return;
      }
      idsVus.set(q.id, fichier.nom);

      // objectif_sy0701 : avertissement de format
      if (q.objectif_sy0701 && !OBJECTIF_REGEX.test(q.objectif_sy0701)) {
        avertissements.push({
          fichier: fichier.nom,
          id: q.id,
          index,
          champ: "objectif_sy0701",
          message: `format inattendu "${q.objectif_sy0701}" (attendu ex. "4.9")`,
        });
      }

      questionsValides.push(q);
    });
  }

  // Quasi-doublons parmi les questions valides.
  const doublons = trouverDoublons(
    questionsValides.map((q) => ({ id: q.id, enonce: q.enonce })),
    seuil,
  );
  for (const d of doublons) {
    erreurs.push({
      fichier: "(comparaison)",
      id: d.idA,
      index: -1,
      message: `enonce quasi identique a ${d.idB} (similarite ${d.similarite.toFixed(
        3,
      )} > ${seuil})`,
    });
  }

  return {
    ok: erreurs.length === 0,
    questionsValides,
    erreurs,
    avertissements,
    doublons,
    totalLues,
  };
}
