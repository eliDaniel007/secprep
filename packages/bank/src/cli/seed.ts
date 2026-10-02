import { prisma } from "@secprep/db";
import { chargerBanque, chargerScenarios } from "../loader";
import { validerBanque } from "../validator";
import { versRow } from "../mapper";
import { afficherRapport } from "./rapport";

/**
 * `pnpm run seed` — valide PUIS charge la banque en base.
 * Idempotent : upsert par `id`. Refuse de charger si la validation echoue.
 */
async function main(): Promise<void> {
  const fichiers = chargerBanque();
  if (fichiers.length === 0) {
    console.error("Aucun fichier JSON trouve dans data/seed/ ou data/lots/.");
    process.exit(1);
  }

  const rapport = validerBanque(fichiers);
  afficherRapport(rapport);
  if (!rapport.ok) {
    console.error("Seed interrompu : la validation a echoue.");
    process.exit(1);
  }

  let crees = 0;
  let majs = 0;
  for (const q of rapport.questionsValides) {
    const row = versRow(q);
    const existant = await prisma.question.findUnique({ where: { id: row.id } });
    await prisma.question.upsert({
      where: { id: row.id },
      create: row,
      update: row,
    });
    if (existant) majs++;
    else crees++;
  }

  console.log(`Seed termine : ${crees} creee(s), ${majs} mise(s) a jour.`);
  const total = await prisma.question.count();
  console.log(`Total en base : ${total} question(s).`);

  // Scenarios de lab (Phase 5).
  const scenarios = chargerScenarios();
  let sCrees = 0;
  let sMajs = 0;
  for (const s of scenarios) {
    const existant = await prisma.scenarioLab.findUnique({ where: { slug: s.slug } });
    const data = {
      slug: s.slug,
      titre: s.titre,
      type: s.type,
      contexte: s.contexte,
      objectifSy0701: s.objectif_sy0701 ?? null,
      coursGoogle: s.cours_google ?? null,
      veriteTerrain: JSON.stringify({
        iocs: s.verite_terrain.iocs,
        chronologie: s.verite_terrain.chronologie,
        bonnesActions: s.verite_terrain.bonnes_actions,
        faitsAttendus: s.verite_terrain.faits_attendus,
      }),
      modeleMarkdown: s.modele_markdown ?? "",
    };
    await prisma.scenarioLab.upsert({ where: { slug: s.slug }, create: data, update: data });
    if (existant) sMajs++;
    else sCrees++;
  }
  if (scenarios.length > 0) {
    console.log(`Scenarios : ${sCrees} cree(s), ${sMajs} mis a jour.`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur pendant le seed :", e);
  await prisma.$disconnect();
  process.exit(1);
});
