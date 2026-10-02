import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { corriger, correctionAbandon, type LigneQuestion } from "@/lib/questions";
import { majRevision } from "@/lib/revision";

const reponseSchema = z.discriminatedUnion("type", [
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
]);

const schema = z.object({
  reponses: z.array(z.object({ questionId: z.string(), reponse: reponseSchema.optional() })),
});

export async function POST(
  req: Request,
  { params }: { params: { code: string } },
) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const duel = await prisma.duel.findUnique({ where: { code: params.code } });
  if (!duel) return NextResponse.json({ erreur: "Duel introuvable." }, { status: 404 });

  const deja = await prisma.duelParticipation.findUnique({
    where: { duelId_utilisateurId: { duelId: duel.id, utilisateurId: u.id } },
  });
  if (deja) return NextResponse.json({ erreur: "Deja joue." }, { status: 409 });

  const ids = JSON.parse(duel.questionIds) as string[];
  const lignes = (await prisma.question.findMany({
    where: { id: { in: ids } },
  })) as LigneQuestion[];
  const parId = new Map(lignes.map((l) => [l.id, l]));
  const reponseParId = new Map(parse.data.reponses.map((r) => [r.questionId, r.reponse]));

  let pointsGagnes = 0;
  let pointsMax = 0;
  let corrects = 0;
  const ecritures: ReturnType<typeof prisma.tentative.create>[] = [];
  const pourRevision: { questionId: string; correct: boolean }[] = [];

  for (const id of ids) {
    const l = parId.get(id);
    if (!l) continue;
    const rep = reponseParId.get(id);
    const res = rep ? corriger(l, rep, false) : correctionAbandon(l);
    if ("erreur" in res) continue;
    pointsGagnes += res.pointsGagnes;
    pointsMax += res.pointsMax;
    if (res.correct) corrects++;
    pourRevision.push({ questionId: id, correct: res.correct });
    ecritures.push(
      prisma.tentative.create({
        data: {
          utilisateurId: u.id,
          questionId: id,
          reponseDonnee: JSON.stringify(rep ?? { abandon: true }),
          correct: res.correct,
          score: res.pointsGagnes,
          tempsPris: 0,
        },
      }),
    );
  }

  await prisma.$transaction([
    ...ecritures,
    prisma.duelParticipation.create({
      data: {
        duelId: duel.id,
        utilisateurId: u.id,
        pointsGagnes,
        pointsMax,
        corrects,
        total: ids.length,
      },
    }),
  ]);

  for (const r of pourRevision) {
    await majRevision(u.id, r.questionId, r.correct, false);
  }

  return NextResponse.json({ pointsGagnes, pointsMax, corrects, total: ids.length });
}
