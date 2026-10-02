import { normaliser } from "@secprep/bank/text";
import { pointsBase, appliquerIndice } from "./scoring";
import type {
  Difficulte,
  GrilleLibre,
  Resultat,
  ResultatLibreDetail,
} from "./types";

/** Correction d'un QCM (une bonne reponse). */
export function corrigerQcm(
  bonneReponse: number,
  indexChoisi: number,
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  const correct = indexChoisi === bonneReponse;
  return {
    correct,
    pointsGagnes: correct ? appliquerIndice(max, indiceUtilise) : 0,
    pointsMax: max,
  };
}

/** Correction d'un vrai/faux. */
export function corrigerVf(
  bonneReponse: boolean,
  valeurChoisie: boolean,
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  const correct = valeurChoisie === bonneReponse;
  return {
    correct,
    pointsGagnes: correct ? appliquerIndice(max, indiceUtilise) : 0,
    pointsMax: max,
  };
}

/** Un groupe de synonymes est trouve si au moins un de ses termes (normalise)
 *  apparait dans le texte normalise de l'utilisateur. */
function groupeTrouve(groupe: string[], texteNorm: string): boolean {
  return groupe.some((syn) => {
    const s = normaliser(syn);
    return s.length > 0 && texteNorm.includes(s);
  });
}

/**
 * Correction hors-ligne d'une reponse libre.
 * Score = (groupes trouves / groupes total) * points, arrondi.
 * Reussite si ce score atteint `seuil_reussite`. L'indice divise ensuite par 2.
 */
export function corrigerLibre(
  grille: GrilleLibre,
  texte: string,
  indiceUtilise = false,
): Resultat {
  const texteNorm = normaliser(texte);
  const total = grille.mots_cles.length;
  const manques: number[] = [];
  let trouves = 0;

  grille.mots_cles.forEach((groupe, i) => {
    if (texteNorm.length > 0 && groupeTrouve(groupe, texteNorm)) {
      trouves++;
    } else {
      manques.push(i);
    }
  });

  const max = grille.points;
  const brut = total === 0 ? 0 : Math.round((trouves / total) * max);
  const reussi = brut >= grille.seuil_reussite;

  const detail: ResultatLibreDetail = {
    groupesTrouves: trouves,
    groupesTotal: total,
    groupesManques: manques,
  };

  return {
    correct: reussi,
    pointsGagnes: appliquerIndice(brut, indiceUtilise),
    pointsMax: max,
    detail,
  };
}
