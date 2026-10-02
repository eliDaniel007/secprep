import { chargerBanque } from "../loader";
import { validerBanque } from "../validator";
import { afficherRapport } from "./rapport";

/** `pnpm run validate-bank` — valide seed/ + lots/ et sort en erreur si refus. */
function main(): void {
  const fichiers = chargerBanque();
  if (fichiers.length === 0) {
    console.error("Aucun fichier JSON trouve dans data/seed/ ou data/lots/.");
    process.exit(1);
  }
  const rapport = validerBanque(fichiers);
  afficherRapport(rapport);
  process.exit(rapport.ok ? 0 : 1);
}

main();
