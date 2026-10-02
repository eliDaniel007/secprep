import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { prisma } from "@secprep/db";
import { getSession } from "@/lib/session";

const schema = z.object({
  nom: z.string().trim().min(2, "Le nom doit faire au moins 2 caracteres.").max(80),
  courriel: z.string().email("Courriel invalide."),
  motDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caracteres.").max(200),
});

/**
 * Inscription libre (role etudiant uniquement). Le role admin ne peut JAMAIS
 * etre obtenu via ce formulaire : il se donne en CLI (create-user).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { erreur: parse.error.issues[0]?.message ?? "Entree invalide." },
      { status: 400 },
    );
  }

  const { nom, courriel, motDePasse } = parse.data;
  const courrielNorm = courriel.trim().toLowerCase();

  const existant = await prisma.utilisateur.findUnique({ where: { courriel: courrielNorm } });
  if (existant) {
    return NextResponse.json(
      { erreur: "Un compte existe deja avec ce courriel." },
      { status: 409 },
    );
  }

  const motDePasseHash = await hash(motDePasse);
  const u = await prisma.utilisateur.create({
    data: { courriel: courrielNorm, nom, motDePasseHash, role: "etudiant" },
  });

  // Connexion immediate.
  const session = await getSession();
  session.userId = u.id;
  await session.save();

  return NextResponse.json({ ok: true });
}
