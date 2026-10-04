import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "@secprep/db";
import { questionSchema } from "../schemas";
import { versRow } from "../mapper";

/**
 * Import d'un lot externe de questions (format proche de la banque mais avec
 * `domaine` = "D1".."D5" et quelques types a adapter : vf/ordonnancement).
 *
 * Valide CHAQUE question individuellement via questionSchema (donc SANS la
 * detection de quasi-doublons bloquante de validate-bank), puis upsert en base.
 * Ecrit aussi le lot nettoye dans data/import/ pour le depot.
 *
 * Usage : pnpm --filter @secprep/bank import-lot <chemin.json> [--brouillon]
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const RACINE = join(__dirname, "..", "..", "..", "..");

type Brut = Record<string, unknown>;

function transformer(q: Brut): Brut {
  const out: Brut = { ...q };
  // domaine "D3" -> 3
  if (typeof q.domaine === "string") {
    const m = (q.domaine as string).match(/(\d)/);
    if (m) out.domaine = Number(m[1]);
  }
  // objectif_sy0701 : ne garder que le prefixe "X.Y"
  if (typeof q.objectif_sy0701 === "string") {
    const m = (q.objectif_sy0701 as string).match(/^\s*(\d+\.\d+)/);
    if (m) out.objectif_sy0701 = m[1];
  }
  // vf : le lot fournit options ["Vrai","Faux"] + reponse index -> booleen attendu
  if (q.type === "vf") {
    const opts = Array.isArray(q.options) ? (q.options as string[]) : null;
    const idx = typeof q.reponse === "number" ? q.reponse : 0;
    out.reponse = opts ? /vrai|oui|true/i.test(opts[idx] ?? "") : Boolean(q.reponse);
    delete out.options;
  }
  // ordonnancement : le lot fournit options (liste) + reponse (permutation) ->
  // le schema attend elements + reponse.
  if (q.type === "ordonnancement") {
    if (Array.isArray(q.options) && !q.elements) out.elements = q.options;
    delete (out as Brut).options;
  }
  // statut par defaut (valide sauf --brouillon)
  if (!("statut" in out)) out.statut = process.argv.includes("--brouillon") ? "brouillon" : "valide";
  return out;
}

async function main(): Promise<void> {
  const chemin = process.argv[2];
  if (!chemin) {
    console.error("Usage : import-lot <chemin.json> [--brouillon]");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(chemin, "utf-8"));
  const liste: Brut[] = Array.isArray(raw) ? raw : (raw.questions ?? []);
  console.log(`Lu : ${liste.length} question(s) depuis ${chemin}`);

  const valides: unknown[] = [];
  const rejets: Record<string, number> = {};
  const vus = new Set<string>();

  for (const brut of liste) {
    const t = transformer(brut);
    const parse = questionSchema.safeParse(t);
    if (!parse.success) {
      const type = String(brut.type ?? "?");
      rejets[type] = (rejets[type] ?? 0) + 1;
      continue;
    }
    if (vus.has(parse.data.id)) continue; // ids dupliques dans le fichier
    vus.add(parse.data.id);
    valides.push(parse.data);
  }

  console.log(`Valides : ${valides.length} · Rejets par type :`, rejets);

  // Upsert en base.
  let crees = 0;
  let majs = 0;
  for (const q of valides) {
    const row = versRow(q as Parameters<typeof versRow>[0]);
    const existant = await prisma.question.findUnique({ where: { id: row.id } });
    await prisma.question.upsert({ where: { id: row.id }, create: row, update: row });
    if (existant) majs++;
    else crees++;
  }
  console.log(`Base : ${crees} creee(s), ${majs} mise(s) a jour.`);
  const total = await prisma.question.count();
  console.log(`Total questions en base : ${total}.`);

  // Trace dans le depot (hors data/lots pour ne pas declencher la dedup du seed).
  const dossier = join(RACINE, "data", "import");
  mkdirSync(dossier, { recursive: true });
  const dest = join(dossier, "banque-importee.json");
  writeFileSync(
    dest,
    JSON.stringify({ meta: { nom: "Lot importe", langue: "fr" }, questions: valides }, null, 2),
    "utf-8",
  );
  console.log(`Lot nettoye ecrit dans ${dest}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur pendant l'import :", e);
  await prisma.$disconnect();
  process.exit(1);
});
