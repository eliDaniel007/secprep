import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import {
  corrigerQcm,
  corrigerVf,
  corrigerLibre,
  type GrilleLibre,
  type Difficulte,
} from "@secprep/quiz";
import { utilisateurCourant } from "@/lib/auth";
import type { Correction } from "@/lib/quiz-api";

const schema = z.object({
  questionId: z.string(),
  indiceUtilise: z.boolean(),
  tempsPris: z.number().int().nonnegative().optional(),
  reponse: z.discriminatedUnion("type", [
    z.object({ type: z.literal("qcm"), index: z.number().int().nonnegative() }),
    z.object({ type: z.literal("vf"), valeur: z.boolean() }),
    z.object({ type: z.literal("libre"), texte: z.string() }),
  ]),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  }
  const { questionId, indiceUtilise, tempsPris, reponse } = parse.data;

  const q = await prisma.question.findUnique({ where: { id: questionId } });
  if (!q) return NextResponse.json({ erreur: "Question inconnue." }, { status: 404 });
  if (q.type !== reponse.type) {
    return NextResponse.json(
      { erreur: "Type de reponse incoherent." },
      { status: 400 },
    );
  }

  const difficulte = q.difficulte as Difficulte;
  const contenu = JSON.parse(q.contenu);
  let correction: Correction;

  if (reponse.type === "qcm") {
    const r = corrigerQcm(contenu.reponse, reponse.index, difficulte, indiceUtilise);
    correction = {
      ...r,
      explication: q.explication,
      astuce: q.astuce,
      bonneReponseQcm: contenu.reponse,
    };
  } else if (reponse.type === "vf") {
    const r = corrigerVf(contenu.reponse, reponse.valeur, difficulte, indiceUtilise);
    correction = {
      ...r,
      explication: q.explication,
      astuce: q.astuce,
      bonneReponseVf: contenu.reponse,
    };
  } else {
    const grille = contenu.reponse as GrilleLibre;
    const r = corrigerLibre(grille, reponse.texte, indiceUtilise);
    correction = {
      correct: r.correct,
      pointsGagnes: r.pointsGagnes,
      pointsMax: r.pointsMax,
      explication: q.explication,
      astuce: q.astuce,
      modeleLibre: grille.modele,
      motsClesLibre: grille.mots_cles,
      detailLibre: r.detail,
    };
  }

  // Enregistrement de la tentative + mise a jour de la progression.
  await prisma.$transaction([
    prisma.tentative.create({
      data: {
        utilisateurId: u.id,
        questionId: q.id,
        reponseDonnee: JSON.stringify(reponse),
        correct: correction.correct,
        score: correction.pointsGagnes,
        tempsPris: tempsPris ?? 0,
      },
    }),
    prisma.progressionDomaine.upsert({
      where: {
        utilisateurId_domaine: { utilisateurId: u.id, domaine: q.domaine },
      },
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

  return NextResponse.json(correction);
}
