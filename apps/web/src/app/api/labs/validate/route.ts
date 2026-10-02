import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { trouverLabo } from "@secprep/labs";
import { executer } from "@secprep/sandbox";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ sessionId: z.string(), laboSlug: z.string() });

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const labo = trouverLabo(parse.data.laboSlug);
  if (!labo) return NextResponse.json({ erreur: "Labo inconnu." }, { status: 404 });

  const session = await prisma.sessionSandbox.findUnique({ where: { id: parse.data.sessionId } });
  if (!session || session.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Session introuvable." }, { status: 404 });
  }

  // On execute la commande de verification (de confiance) dans le conteneur.
  const sortie = await executer(session.conteneur, labo.verifCommande);
  const reussi = labo.attendu(sortie);

  if (reussi) {
    await prisma.progressionLabo.upsert({
      where: { utilisateurId_laboSlug: { utilisateurId: u.id, laboSlug: labo.slug } },
      create: { utilisateurId: u.id, laboSlug: labo.slug, termine: true, termineLe: new Date() },
      update: { termine: true, termineLe: new Date() },
    });
  }

  return NextResponse.json({
    reussi,
    explication: reussi ? labo.explication : null,
  });
}
