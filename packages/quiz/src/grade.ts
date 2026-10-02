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

/** Correction d'un QCM a reponses multiples (tout ou rien). */
export function corrigerQcmMultiple(
  bonnes: number[],
  choisis: number[],
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  const b = new Set(bonnes);
  const c = new Set(choisis);
  const exact =
    b.size === c.size && [...b].every((x) => c.has(x));
  const bons = [...c].filter((x) => b.has(x)).length;
  return {
    correct: exact,
    pointsGagnes: exact ? appliquerIndice(max, indiceUtilise) : 0,
    pointsMax: max,
    bonsElements: bons,
    totalElements: bonnes.length,
  };
}

/** Correction d'un ordonnancement (ordre exact). */
export function corrigerOrdonnancement(
  bonOrdre: number[],
  ordreRecu: number[],
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  const exact =
    bonOrdre.length === ordreRecu.length &&
    bonOrdre.every((v, i) => v === ordreRecu[i]);
  const bons = bonOrdre.filter((v, i) => v === ordreRecu[i]).length;
  return {
    correct: exact,
    pointsGagnes: exact ? appliquerIndice(max, indiceUtilise) : 0,
    pointsMax: max,
    bonsElements: bons,
    totalElements: bonOrdre.length,
  };
}

/**
 * Correction d'un appariement.
 * `bonnesDroites[i]` = la droite correcte pour la gauche i (texte).
 * `associations[i]` = la droite choisie par l'utilisateur pour la gauche i (texte).
 * Comparaison normalisee ; tout ou rien pour la reussite, detail du nombre exact.
 */
export function corrigerAppariement(
  bonnesDroites: string[],
  associations: string[],
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  let bons = 0;
  bonnesDroites.forEach((bonne, i) => {
    const choisi = associations[i] ?? "";
    if (normaliser(choisi) === normaliser(bonne)) bons++;
  });
  const exact = bons === bonnesDroites.length;
  return {
    correct: exact,
    pointsGagnes: exact ? appliquerIndice(max, indiceUtilise) : 0,
    pointsMax: max,
    bonsElements: bons,
    totalElements: bonnesDroites.length,
  };
}

/**
 * Correction d'un cas complexe (suite d'etapes QCM).
 * Credit partiel : points = base * (etapes correctes / total).
 * Reussite si toutes les etapes sont correctes.
 */
export function corrigerCasComplexe(
  bonnesReponses: number[],
  choix: number[],
  difficulte: Difficulte,
  indiceUtilise = false,
): Resultat {
  const max = pointsBase(difficulte);
  const etapesCorrectes = bonnesReponses.map((bon, i) => choix[i] === bon);
  const bons = etapesCorrectes.filter(Boolean).length;
  const total = bonnesReponses.length;
  const brut = total === 0 ? 0 : Math.round((bons / total) * max);
  return {
    correct: bons === total,
    pointsGagnes: appliquerIndice(brut, indiceUtilise),
    pointsMax: max,
    bonsElements: bons,
    totalElements: total,
    etapesCorrectes,
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
