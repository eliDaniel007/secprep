import "server-only";
import {
  corrigerQcm,
  corrigerVf,
  corrigerLibre,
  corrigerQcmMultiple,
  corrigerOrdonnancement,
  corrigerAppariement,
  corrigerCasComplexe,
  pointsBase,
  type GrilleLibre,
  type Difficulte,
} from "@secprep/quiz";
import { melanger } from "./melange";
import type {
  Correction,
  QuestionClient,
  ReponseUtilisateur,
  TypeQuestion,
} from "./quiz-api";

/** Ligne de question telle que lue en base (champs utiles). */
export interface LigneQuestion {
  id: string;
  domaine: number;
  type: string;
  difficulte: string;
  tempsSec: number;
  enonce: string;
  indice: string | null;
  astuce: string | null;
  explication: string;
  contenu: string;
}

type Paire = { gauche: string; droite: string };

const CHOIX_UNIQUE = new Set(["qcm", "scenario", "urgence", "plan_reprise"]);

/** Convertit une ligne en payload client (sans reponse). */
export function versQuestionClient(l: LigneQuestion): QuestionClient {
  const c = JSON.parse(l.contenu);
  const base: QuestionClient = {
    id: l.id,
    domaine: l.domaine,
    type: l.type as TypeQuestion,
    difficulte: l.difficulte as Difficulte,
    tempsSec: l.tempsSec,
    enonce: l.enonce,
    indice: l.indice,
  };

  if (CHOIX_UNIQUE.has(l.type) || l.type === "qcm_multiple") {
    base.options = c.options as string[];
  } else if (l.type === "ordonnancement") {
    const elements = (c.elements as string[]).map((texte, i) => ({ i, texte }));
    base.elements = melanger(elements);
  } else if (l.type === "appariement") {
    const paires = c.paires as Paire[];
    base.gauches = paires.map((p) => p.gauche);
    base.droites = melanger(paires.map((p) => p.droite));
  } else if (l.type === "cas_complexe") {
    base.etapes = (c.etapes as Array<{ titre: string; enonce: string; options: string[] }>).map(
      (e) => ({ titre: e.titre, enonce: e.enonce, options: e.options }),
    );
  }
  return base;
}

/** Champs de revelation de la bonne reponse (selon le type). */
export function revelation(l: LigneQuestion): Partial<Correction> {
  const c = JSON.parse(l.contenu);
  switch (l.type) {
    case "qcm":
    case "scenario":
    case "urgence":
    case "plan_reprise":
      return { bonneReponseIndex: c.reponse };
    case "vf":
      return { bonneReponseVf: c.reponse };
    case "qcm_multiple":
      return { bonnesReponsesIndices: c.reponse };
    case "ordonnancement": {
      const elements = c.elements as string[];
      return { bonOrdre: (c.reponse as number[]).map((i) => ({ i, texte: elements[i]! })) };
    }
    case "appariement": {
      const paires = c.paires as Paire[];
      return { bonnesAssociations: paires.map((p) => ({ gauche: p.gauche, droite: p.droite })) };
    }
    case "cas_complexe": {
      const etapes = c.etapes as Array<{ reponse: number }>;
      return { bonnesReponsesEtapes: etapes.map((e) => e.reponse) };
    }
    case "libre": {
      const grille = c.reponse as GrilleLibre;
      return { modeleLibre: grille.modele, motsClesLibre: grille.mots_cles };
    }
    default:
      return {};
  }
}

/** Correction d'une question abandonnee (temps ecoule) : echec, 0 point,
 *  mais la bonne reponse est revelee pour apprendre. */
export function correctionAbandon(l: LigneQuestion): Correction {
  return {
    correct: false,
    pointsGagnes: 0,
    pointsMax: pointsBase(l.difficulte as Difficulte),
    explication: l.explication,
    astuce: l.astuce,
    ...revelation(l),
  };
}

/** Corrige une reponse cote serveur. Verifie la coherence de type. */
export function corriger(
  l: LigneQuestion,
  reponse: ReponseUtilisateur,
  indiceUtilise: boolean,
): Correction | { erreur: string } {
  if (l.type !== reponse.type) return { erreur: "Type de reponse incoherent." };
  const c = JSON.parse(l.contenu);
  const diff = l.difficulte as Difficulte;
  const commun = { explication: l.explication, astuce: l.astuce };

  switch (reponse.type) {
    case "qcm":
    case "scenario":
    case "urgence":
    case "plan_reprise": {
      const r = corrigerQcm(c.reponse, reponse.index, diff, indiceUtilise);
      return { ...r, ...commun, bonneReponseIndex: c.reponse };
    }
    case "vf": {
      const r = corrigerVf(c.reponse, reponse.valeur, diff, indiceUtilise);
      return { ...r, ...commun, bonneReponseVf: c.reponse };
    }
    case "qcm_multiple": {
      const r = corrigerQcmMultiple(c.reponse, reponse.indices, diff, indiceUtilise);
      return { ...r, ...commun, bonnesReponsesIndices: c.reponse };
    }
    case "ordonnancement": {
      const r = corrigerOrdonnancement(c.reponse, reponse.ordre, diff, indiceUtilise);
      const elements = c.elements as string[];
      return {
        ...r,
        ...commun,
        bonOrdre: (c.reponse as number[]).map((i) => ({ i, texte: elements[i]! })),
      };
    }
    case "appariement": {
      const paires = c.paires as Paire[];
      const bonnes = paires.map((p) => p.droite);
      const r = corrigerAppariement(bonnes, reponse.associations, diff, indiceUtilise);
      return {
        ...r,
        ...commun,
        bonnesAssociations: paires.map((p) => ({ gauche: p.gauche, droite: p.droite })),
      };
    }
    case "cas_complexe": {
      const etapes = c.etapes as Array<{ reponse: number }>;
      const bonnes = etapes.map((e) => e.reponse);
      const r = corrigerCasComplexe(bonnes, reponse.choix, diff, indiceUtilise);
      return { ...r, ...commun, bonnesReponsesEtapes: bonnes };
    }
    case "libre": {
      const grille = c.reponse as GrilleLibre;
      const r = corrigerLibre(grille, reponse.texte, indiceUtilise);
      return {
        correct: r.correct,
        pointsGagnes: r.pointsGagnes,
        pointsMax: r.pointsMax,
        ...commun,
        modeleLibre: grille.modele,
        motsClesLibre: grille.mots_cles,
        detailLibre: r.detail,
      };
    }
  }
}
