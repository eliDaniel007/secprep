// Types partages entre le client (runner de quiz) et le serveur (route handlers).
// Aucune reponse correcte n'est exposee dans QuestionClient : la correction se
// fait uniquement cote serveur.

export type Difficulte = "facile" | "moyen" | "difficile";
export type TypeQuiz = "qcm" | "vf" | "libre";

/** Les types de question geres en Phase 2. */
export const TYPES_PHASE2: TypeQuiz[] = ["qcm", "vf", "libre"];

/** Question telle qu'envoyee au client (SANS la bonne reponse). */
export interface QuestionClient {
  id: string;
  domaine: number;
  type: TypeQuiz;
  difficulte: Difficulte;
  tempsSec: number;
  enonce: string;
  indice: string | null;
  options?: string[]; // qcm uniquement
}

export interface DemarrerQuizReq {
  domaine?: number; // 1..5, sinon tous
  difficulte?: Difficulte; // sinon toutes
  nombre?: number; // defaut 10
  ids?: string[]; // mode explicite (ex. "refaire les erreurs")
}

export interface DemarrerQuizRes {
  questions: QuestionClient[];
}

export type ReponseUtilisateur =
  | { type: "qcm"; index: number }
  | { type: "vf"; valeur: boolean }
  | { type: "libre"; texte: string };

export interface RepondreReq {
  questionId: string;
  reponse: ReponseUtilisateur;
  indiceUtilise: boolean;
  tempsPris?: number;
}

export interface Correction {
  correct: boolean;
  pointsGagnes: number;
  pointsMax: number;
  explication: string;
  astuce: string | null;
  // Revelation de la bonne reponse selon le type :
  bonneReponseQcm?: number;
  bonneReponseVf?: boolean;
  modeleLibre?: string;
  motsClesLibre?: string[][];
  detailLibre?: {
    groupesTrouves: number;
    groupesTotal: number;
    groupesManques: number[];
  };
}
