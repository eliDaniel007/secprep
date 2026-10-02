import "server-only";
import { prisma } from "@secprep/db";
import {
  planifierSM2,
  qualiteSM2,
  prochaineRevision,
  ETAT_SM2_INITIAL,
  type EtatSM2,
} from "@secprep/quiz";

/**
 * Met a jour la planification SM-2 d'une question pour un utilisateur.
 * Regle : une question entre dans la file de revision quand elle est RATEE ;
 * si elle y est deja, chaque passage met a jour l'intervalle (et peut la
 * faire graduer loin dans le temps).
 */
export async function majRevision(
  utilisateurId: string,
  questionId: string,
  correct: boolean,
  indiceUtilise: boolean,
): Promise<void> {
  const existant = await prisma.revisionEspacee.findUnique({
    where: { utilisateurId_questionId: { utilisateurId, questionId } },
  });

  // Pas encore suivie et reussie du premier coup : on ne l'ajoute pas.
  if (!existant && correct) return;

  const etatAvant: EtatSM2 = existant
    ? {
        repetitions: existant.repetitions,
        intervalleJours: existant.intervalleJours,
        facilite: existant.facilite,
      }
    : ETAT_SM2_INITIAL;

  const q = qualiteSM2(correct, indiceUtilise);
  const etat = planifierSM2(etatAvant, q);
  const maintenant = new Date();
  // Une question ratee reste due immediatement (on peut la regrigner le jour
  // meme jusqu'a la reussir) ; une reussite s'espace selon SM-2.
  const prochaine = correct
    ? prochaineRevision(etat.intervalleJours, maintenant)
    : maintenant;

  await prisma.revisionEspacee.upsert({
    where: { utilisateurId_questionId: { utilisateurId, questionId } },
    create: {
      utilisateurId,
      questionId,
      repetitions: etat.repetitions,
      intervalleJours: etat.intervalleJours,
      facilite: etat.facilite,
      derniereRevision: maintenant,
      prochaineRevision: prochaine,
    },
    update: {
      repetitions: etat.repetitions,
      intervalleJours: etat.intervalleJours,
      facilite: etat.facilite,
      derniereRevision: maintenant,
      prochaineRevision: prochaine,
    },
  });
}

/** Ids des questions dues pour la revision (prochaineRevision <= maintenant). */
export async function questionsDues(utilisateurId: string): Promise<string[]> {
  const lignes = await prisma.revisionEspacee.findMany({
    where: { utilisateurId, prochaineRevision: { lte: new Date() } },
    orderBy: { prochaineRevision: "asc" },
    select: { questionId: true },
  });
  return lignes.map((l) => l.questionId);
}

/** Nombre de questions dues aujourd'hui. */
export async function nombreDues(utilisateurId: string): Promise<number> {
  return prisma.revisionEspacee.count({
    where: { utilisateurId, prochaineRevision: { lte: new Date() } },
  });
}
