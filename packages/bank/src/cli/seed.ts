import { prisma } from "@secprep/db";
import { chargerBanque } from "../loader";
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
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur pendant le seed :", e);
  await prisma.$disconnect();
  process.exit(1);
});
