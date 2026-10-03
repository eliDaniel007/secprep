import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { genererToken, hacherToken } from "@/lib/capteur";

const schema = z.object({
  nom: z.string().min(1).max(80),
  // Consentement obligatoire : reseau/machine autorise.
  consentement: z.literal(true),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { erreur: "Le consentement est obligatoire pour enregistrer un capteur." },
      { status: 400 },
    );
  }

  const token = genererToken();
  const tokenHash = hacherToken(token);

  // Jeu de journaux dedie (origine reelle) pour ce capteur.
  const jeu = await prisma.jeuJournaux.create({
    data: {
      slug: `capteur-${randomUUID().slice(0, 8)}`,
      titre: `Capteur : ${parse.data.nom}`,
      description: "Journaux reels envoyes par un capteur local.",
      graine: "",
    },
  });

  const capteur = await prisma.capteur.create({
    data: {
      utilisateurId: u.id,
      nom: parse.data.nom,
      tokenHash,
      jeuId: jeu.id,
    },
  });

  await prisma.auditCapteur.create({
    data: { capteurId: capteur.id, action: "register", details: `Capteur "${parse.data.nom}" cree.` },
  });

  // Le jeton n'est affiche qu'une seule fois.
  return NextResponse.json({ id: capteur.id, token });
}
