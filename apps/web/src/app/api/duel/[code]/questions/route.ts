import { NextResponse } from "next/server";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { versQuestionClient, type LigneQuestion } from "@/lib/questions";

const SELECT = {
  id: true,
  domaine: true,
  type: true,
  difficulte: true,
  tempsSec: true,
  enonce: true,
  indice: true,
  astuce: true,
  explication: true,
  contenu: true,
} as const;

export async function GET(
  _req: Request,
  { params }: { params: { code: string } },
) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const duel = await prisma.duel.findUnique({ where: { code: params.code } });
  if (!duel) return NextResponse.json({ erreur: "Duel introuvable." }, { status: 404 });

  const deja = await prisma.duelParticipation.findUnique({
    where: { duelId_utilisateurId: { duelId: duel.id, utilisateurId: u.id } },
  });
  if (deja) {
    return NextResponse.json({ erreur: "Tu as deja joue ce duel." }, { status: 409 });
  }

  const ids = JSON.parse(duel.questionIds) as string[];
  const lignes = (await prisma.question.findMany({
    where: { id: { in: ids } },
    select: SELECT,
  })) as LigneQuestion[];

  // Ordre fige (identique pour les deux joueurs).
  const parId = new Map(lignes.map((l) => [l.id, l]));
  const questions = ids
    .map((id) => parId.get(id))
    .filter((l): l is LigneQuestion => !!l)
    .map(versQuestionClient);

  return NextResponse.json({ mode: duel.mode, questions });
}
