export const DOMAINES: Record<number, { court: string; long: string; part: number }> = {
  1: { court: "Concepts generaux", long: "Concepts generaux de securite", part: 12 },
  2: { court: "Menaces & vulnerabilites", long: "Menaces, vulnerabilites et mitigations", part: 22 },
  3: { court: "Architecture", long: "Architecture de securite", part: 18 },
  4: { court: "Operations", long: "Operations de securite", part: 28 },
  5: { court: "Gestion du programme", long: "Gestion et supervision du programme de securite", part: 20 },
};

export const DIFFICULTES = ["facile", "moyen", "difficile"] as const;

export const LIBELLE_TYPE: Record<string, string> = {
  qcm: "QCM",
  qcm_multiple: "QCM multiple",
  vf: "Vrai / Faux",
  libre: "Reponse libre",
  scenario: "Scenario",
  urgence: "Urgence",
  plan_reprise: "Plan de reprise",
  ordonnancement: "Ordonnancement",
  appariement: "Appariement",
  cas_complexe: "Cas complexe",
};
