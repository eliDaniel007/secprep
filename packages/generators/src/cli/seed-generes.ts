import { prisma } from "@secprep/db";
import { questionSchema, versRow } from "@secprep/bank";
import { GABARITS, genererLot } from "../index";

/**
 * `pnpm seed:generes` — genere un lot deterministe de questions par gabarit et
 * l'ajoute en base (upsert par `id`, idempotent).
 *
 * Les questions generees sont marquees `source: "genere"` et `statut: "brouillon"` :
 * elles restent HORS quiz/examen tant qu'un humain ne les a pas validees dans
 * la file de relecture (/admin/relecture).
 *
 * Usage : `pnpm seed:generes [N]` (N variantes par gabarit, defaut 8).
 */
const GRAINE_BASE = "secprep-generes-2026";

async function main(): Promise<void> {
  const n = Math.max(1, Math.min(100, Number(process.argv[2] ?? 8) || 8));

  let crees = 0;
  let majs = 0;
  let refuses = 0;

  for (const gabarit of Object.keys(GABARITS)) {
    const lot = genererLot(gabarit, GRAINE_BASE, n);
    for (const brute of lot) {
      // Garde-fou : on ne charge que ce qui passe le schema de la banque.
      const parse = questionSchema.safeParse(brute);
      if (!parse.success) {
        refuses++;
        console.error(`Refusee (${gabarit}) ${brute.id} :`, parse.error.issues[0]?.message);
        continue;
      }
      const row = versRow(parse.data);
      const existant = await prisma.question.findUnique({ where: { id: row.id } });
      await prisma.question.upsert({ where: { id: row.id }, create: row, update: row });
      if (existant) majs++;
      else crees++;
    }
    console.log(`Gabarit ${gabarit} : ${lot.length} variante(s).`);
  }

  console.log(
    `\nSeed generes termine : ${crees} creee(s), ${majs} mise(s) a jour, ${refuses} refusee(s).`,
  );
  const enBrouillon = await prisma.question.count({ where: { source: "genere", statut: "brouillon" } });
  console.log(`En attente de relecture (/admin/relecture) : ${enBrouillon} question(s).`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur pendant le seed des questions generees :", e);
  await prisma.$disconnect();
  process.exit(1);
});
