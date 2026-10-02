import { NextResponse } from "next/server";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

/** Cree un brouillon de rapport (Module 1) a partir d'une enquete SIEM. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const enquete = await prisma.enquete.findUnique({
    where: { id: params.id },
    include: { jeu: true },
  });
  if (!enquete || enquete.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Enquete introuvable." }, { status: 404 });
  }

  const preuves = JSON.parse(enquete.preuves) as string[];
  const evenements = preuves.length
    ? await prisma.evenement.findMany({ where: { id: { in: preuves } }, orderBy: { ts: "asc" } })
    : [];

  const lignesPreuves = evenements.map((e) => `- \`${e.raw}\``).join("\n");
  const contenu = `# Rapport d'incident — ${enquete.jeu.titre}

## Resume executif

_Verdict de l'enquete : **${enquete.verdict ?? "a determiner"}**._

## Chronologie

${enquete.notes ? enquete.notes : "_(a completer)_"}

## Indicateurs de compromission (preuves epinglees)

${lignesPreuves || "_(aucune preuve epinglee)_"}

## Impact

_(a completer)_

## Confinement

_(a completer)_

## Eradication

_(a completer)_

## Recuperation

_(a completer)_

## Lecons apprises

_(a completer)_
`;

  const rapport = await prisma.rapport.create({
    data: {
      utilisateurId: u.id,
      titre: `Rapport — ${enquete.jeu.titre}`,
      modele: "incident",
      contenu,
    },
  });

  return NextResponse.json({ id: rapport.id });
}
