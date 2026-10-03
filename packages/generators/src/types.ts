/** Question generee, au FORMAT de la banque (snake_case) pour etre validee par
 *  @secprep/bank (questionSchema) et chargee par le seed. */
export interface QuestionGeneree {
  id: string;
  domaine: number;
  cours_google?: number;
  type: "qcm" | "plan_reprise" | "appariement";
  difficulte: "facile" | "moyen" | "difficile";
  temps_sec: number;
  enonce: string;
  explication: string;
  indice?: string;
  astuce?: string;
  tags: string[];
  objectif_sy0701?: string;
  source: "genere";
  statut: "brouillon";
  // Specifique au type :
  options?: string[];
  reponse?: number | "paires_dans_l_ordre";
  paires?: { gauche: string; droite: string }[];
}
