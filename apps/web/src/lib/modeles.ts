// Modeles de rapport (squelettes Markdown). Pur, utilisable client + serveur.

export const MODELES = {
  incident:
    "# Rapport d'incident\n\n## Resume executif\n\n## Chronologie\n\n## Impact\n\n## Cause racine\n\n## Confinement\n\n## Eradication\n\n## Recuperation\n\n## Lecons apprises\n",
  postmortem:
    "# Post-mortem (sans blame)\n\n## Contexte\n\n## Deroulement\n\n## Ce qui a bien fonctionne\n\n## Ce qui a mal fonctionne\n\n## Causes\n\n## Actions correctives\n",
  escalade:
    "# Note d'escalade\n\n## Situation\n\n## Impact et criticite\n\n## Actions deja prises\n\n## Decision / ressources demandees\n\n## Delai\n",
  audit:
    "# Rapport d'audit\n\n## Perimetre\n\n## Methodologie\n\n## Constats\n\n## Risques\n\n## Recommandations\n",
} as const;

export type TypeModele = keyof typeof MODELES;

export const LIBELLE_MODELE: Record<TypeModele, string> = {
  incident: "Rapport d'incident",
  postmortem: "Post-mortem sans blame",
  escalade: "Note d'escalade",
  audit: "Rapport d'audit",
};
