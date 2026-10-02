import type { Question } from "./schemas";

/** Ligne prete pour Prisma (modele Question). Le `contenu` specifique au
 *  type est serialise en JSON ; `tags` aussi. */
export interface QuestionRow {
  id: string;
  domaine: number;
  coursGoogle: number | null;
  type: string;
  difficulte: string;
  tempsSec: number;
  enonce: string;
  explication: string;
  indice: string | null;
  astuce: string | null;
  objectifSy0701: string | null;
  tags: string;
  contenu: string;
  source: string;
  statut: string;
}

/** Extrait le payload specifique au type (ce qui va dans `contenu`). */
export function extraireContenu(q: Question): unknown {
  switch (q.type) {
    case "qcm":
    case "scenario":
    case "urgence":
    case "plan_reprise":
      return { options: q.options, reponse: q.reponse };
    case "qcm_multiple":
      return { options: q.options, reponse: q.reponse };
    case "vf":
      return { reponse: q.reponse };
    case "libre":
      return { reponse: q.reponse };
    case "ordonnancement":
      return { elements: q.elements, reponse: q.reponse };
    case "appariement":
      return { paires: q.paires };
    case "cas_complexe":
      return { etapes: q.etapes };
  }
}

export function versRow(q: Question): QuestionRow {
  return {
    id: q.id,
    domaine: q.domaine,
    coursGoogle: q.cours_google ?? null,
    type: q.type,
    difficulte: q.difficulte,
    tempsSec: q.temps_sec,
    enonce: q.enonce,
    // cas_complexe porte l'explication par etape ; racine optionnelle.
    explication: q.explication ?? "",
    indice: q.indice ?? null,
    astuce: q.astuce ?? null,
    objectifSy0701: q.objectif_sy0701 ?? null,
    tags: JSON.stringify(q.tags ?? []),
    contenu: JSON.stringify(extraireContenu(q)),
    source: q.source ?? "officiel",
    statut: q.statut ?? "valide",
  };
}
