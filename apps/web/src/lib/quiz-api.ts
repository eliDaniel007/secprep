// Types partages entre le client (runner) et le serveur (route handlers).
// Aucune reponse correcte n'est exposee dans QuestionClient : la correction se
// fait uniquement cote serveur.

export type Difficulte = "facile" | "moyen" | "difficile";

export type TypeQuestion =
  | "qcm"
  | "qcm_multiple"
  | "vf"
  | "libre"
  | "scenario"
  | "urgence"
  | "plan_reprise"
  | "ordonnancement"
  | "appariement"
  | "cas_complexe";

/** Types a choix unique (meme rendu qu'un QCM). */
export const TYPES_CHOIX_UNIQUE: TypeQuestion[] = [
  "qcm",
  "scenario",
  "urgence",
  "plan_reprise",
];

export interface EtapeClient {
  titre: string;
  enonce: string;
  options: string[];
}

/** Question telle qu'envoyee au client (SANS la bonne reponse). */
export interface QuestionClient {
  id: string;
  domaine: number;
  type: TypeQuestion;
  difficulte: Difficulte;
  tempsSec: number;
  enonce: string;
  indice: string | null;
  options?: string[]; // choix unique + qcm_multiple
  elements?: { i: number; texte: string }[]; // ordonnancement (melange)
  gauches?: string[]; // appariement
  droites?: string[]; // appariement (melange)
  etapes?: EtapeClient[]; // cas_complexe
}

export interface DemarrerQuizReq {
  domaine?: number;
  difficulte?: Difficulte;
  nombre?: number;
  ids?: string[];
  types?: TypeQuestion[]; // restreindre a certains types (ex. urgence)
}

export interface DemarrerQuizRes {
  questions: QuestionClient[];
}

export type ReponseUtilisateur =
  | { type: "qcm"; index: number }
  | { type: "scenario"; index: number }
  | { type: "urgence"; index: number }
  | { type: "plan_reprise"; index: number }
  | { type: "qcm_multiple"; indices: number[] }
  | { type: "vf"; valeur: boolean }
  | { type: "libre"; texte: string }
  | { type: "ordonnancement"; ordre: number[] } // index originaux, ordre choisi
  | { type: "appariement"; associations: string[] } // droite choisie par gauche (texte)
  | { type: "cas_complexe"; choix: number[] }; // un index par etape

export interface Correction {
  correct: boolean;
  pointsGagnes: number;
  pointsMax: number;
  explication: string;
  astuce: string | null;
  // Revelation de la bonne reponse selon le type :
  bonneReponseIndex?: number; // choix unique
  bonneReponseVf?: boolean;
  bonnesReponsesIndices?: number[]; // qcm_multiple
  bonOrdre?: { i: number; texte: string }[]; // ordonnancement
  bonnesAssociations?: { gauche: string; droite: string }[]; // appariement
  etapesCorrectes?: boolean[]; // cas_complexe
  bonnesReponsesEtapes?: number[]; // cas_complexe
  bonsElements?: number;
  totalElements?: number;
  modeleLibre?: string;
  motsClesLibre?: string[][];
  detailLibre?: {
    groupesTrouves: number;
    groupesTotal: number;
    groupesManques: number[];
  };
}
