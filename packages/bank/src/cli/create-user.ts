import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { hash } from "@node-rs/argon2";
import { prisma } from "@secprep/db";

/**
 * `pnpm run create-user` — cree un compte (mot de passe hache avec argon2).
 * Mode non interactif si SEED_USER_EMAIL / SEED_USER_NAME / SEED_USER_PASSWORD
 * sont definis ; sinon demande interactivement. Aucun mot de passe n'est
 * ecrit en clair (ni en base, ni dans les logs).
 */
async function main(): Promise<void> {
  let courriel = process.env.SEED_USER_EMAIL?.trim() ?? "";
  let nom = process.env.SEED_USER_NAME?.trim() ?? "";
  let motDePasse = process.env.SEED_USER_PASSWORD ?? "";
  const role = (process.env.SEED_USER_ROLE?.trim() || "etudiant").toLowerCase();

  const interactif = !courriel || !nom || !motDePasse;
  if (interactif) {
    const rl = createInterface({ input: stdin, output: stdout });
    if (!courriel) courriel = (await rl.question("Courriel : ")).trim();
    if (!nom) nom = (await rl.question("Nom : ")).trim();
    if (!motDePasse)
      motDePasse = await rl.question("Mot de passe (min. 8 caracteres) : ");
    rl.close();
  }

  if (!courriel || !nom || !motDePasse) {
    console.error("Courriel, nom et mot de passe sont obligatoires.");
    process.exit(1);
  }
  if (motDePasse.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caracteres.");
    process.exit(1);
  }
  if (role !== "etudiant" && role !== "admin") {
    console.error('Role invalide (attendu "etudiant" ou "admin").');
    process.exit(1);
  }

  const existant = await prisma.utilisateur.findUnique({ where: { courriel } });
  if (existant) {
    console.error(`Un compte existe deja avec le courriel ${courriel}.`);
    process.exit(1);
  }

  const motDePasseHash = await hash(motDePasse);
  const u = await prisma.utilisateur.create({
    data: { courriel, nom, motDePasseHash, role },
  });

  console.log(`Compte cree : ${u.nom} <${u.courriel}> (role: ${u.role}).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Erreur pendant la creation du compte :", e);
  await prisma.$disconnect();
  process.exit(1);
});
