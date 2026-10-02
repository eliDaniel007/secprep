import type { RapportValidation } from "../validator.js";

/** Affiche un rapport de validation lisible dans le terminal. */
export function afficherRapport(r: RapportValidation): void {
  console.log("");
  console.log("=== Validation de la banque SecPrep ===");
  console.log(`Questions lues     : ${r.totalLues}`);
  console.log(`Questions valides  : ${r.questionsValides.length}`);
  console.log(`Erreurs bloquantes : ${r.erreurs.length}`);
  console.log(`Avertissements     : ${r.avertissements.length}`);
  console.log("");

  if (r.avertissements.length > 0) {
    console.log("--- Avertissements (non bloquants) ---");
    for (const a of r.avertissements) {
      const loc = a.id ? `[${a.id}]` : `#${a.index}`;
      const champ = a.champ ? ` (${a.champ})` : "";
      console.log(`  ! ${loc}${champ} ${a.message}`);
    }
    console.log("");
  }

  if (r.erreurs.length > 0) {
    console.log("--- Erreurs (lot REFUSE) ---");
    for (const e of r.erreurs) {
      const loc = e.id ? `[${e.id}]` : `#${e.index}`;
      const champ = e.champ ? ` (${e.champ})` : "";
      const fich = e.fichier ? ` {${shortName(e.fichier)}}` : "";
      console.log(`  x ${loc}${champ}${fich} ${e.message}`);
    }
    console.log("");
    console.log(`RESULTAT : REFUSE (${r.erreurs.length} erreur(s))`);
  } else {
    console.log("RESULTAT : OK — tout est valide.");
  }
  console.log("");
}

function shortName(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? p;
}
