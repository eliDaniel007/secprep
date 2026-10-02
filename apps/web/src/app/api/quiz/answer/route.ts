import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { corriger, correctionAbandon, type LigneQuestion } from "@/lib/questions";
import { majRevision } from "@/lib/revision";

const schema = z.object({
  questionId: z.string(),
  indiceUtilise: z.boolean(),
  tempsPris: z.number().int().nonnegative().optional(),
  abandon: z.boolean().optional(),
  reponse: z.discriminatedUnion("type", [
    z.object({ type: z.literal("qcm"), index: z.number().int().nonnegative() }),
    z.object({ type: z.literal("scenario"), index: z.number().int().nonnegative() }),
    z.object({ type: z.literal("urgence"), index: z.number().int().nonnegative() }),
    z.object({ type: z.literal("plan_reprise"), index: z.number().int().nonnegative() }),
    z.object({ type: z.literal("qcm_multiple"), indices: z.array(z.number().int().nonnegative()) }),
    z.object({ type: z.literal("vf"), valeur: z.boolean() }),
    z.object({ type: z.literal("libre"), texte: z.string() }),
    z.object({ type: z.literal("ordonnancement"), ordre: z.array(z.number().int().nonnegative()) }),
    z.object({ type: z.literal("appariement"), associations: z.array(z.string()) }),
    z.object({ type: z.literal("cas_complexe"), choix: z.array(z.number().int().nonnegative()) }),
  ]).optional(),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  }
  const { questionId, indiceUtilise, tempsPris, reponse, abandon } = parse.data;
  if (!abandon && !reponse) {
    return NextResponse.json({ erreur: "Reponse manquante." }, { status: 400 });
  }

  const q = (await prisma.question.findUnique({
    where: { id: questionId },
  })) as LigneQuestion | null;
  if (!q) return NextResponse.json({ erreur: "Question inconnue." }, { status: 404 });

  const correction =
    abandon || !reponse ? correctionAbandon(q) : corriger(q, reponse, indiceUtilise);
  if ("erreur" in correction) {
    return NextResponse.json(correction, { status: 400 });
  }

  await prisma.$transaction([
    prisma.tentative.create({
      data: {
        utilisateurId: u.id,
        questionId: q.id,
        reponseDonnee: JSON.stringify(reponse ?? { abandon: true }),
        correct: correction.correct,
        score: correction.pointsGagnes,
        tempsPris: tempsPris ?? 0,
      },
    }),
    prisma.progressionDomaine.upsert({
      where: { utilisateurId_domaine: { utilisateurId: u.id, domaine: q.domaine } },
      create: {
        utilisateurId: u.id,
        domaine: q.domaine,
        questionsVues: 1,
        questionsReussies: correction.correct ? 1 : 0,
      },
      update: {
        questionsVues: { increment: 1 },
        questionsReussies: { increment: correction.correct ? 1 : 0 },
      },
    }),
  ]);

  // Planification de la revision espacee (SM-2).
  await majRevision(u.id, q.id, correction.correct, indiceUtilise);

  return NextResponse.json(correction);
}
