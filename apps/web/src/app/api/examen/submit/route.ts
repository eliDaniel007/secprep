import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { scoreExamen, examenReussi } from "@secprep/quiz";
import { utilisateurCourant } from "@/lib/auth";
import { corriger, correctionAbandon, type LigneQuestion } from "@/lib/questions";

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
  sessionId: z.string(),
  reponses: z.array(
    z.object({ questionId: z.string(), reponse: reponseSchema.optional() }),
  ),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const { sessionId, reponses } = parse.data;
  const session = await prisma.sessionExamen.findUnique({ where: { id: sessionId } });
  if (!session || session.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Session introuvable." }, { status: 404 });
  }
  if (session.finLe) {
    return NextResponse.json({ erreur: "Examen deja soumis." }, { status: 400 });
  }

  const { questionIds } = JSON.parse(session.detail) as { questionIds: string[] };
  const lignes = (await prisma.question.findMany({
    where: { id: { in: questionIds } },
  })) as LigneQuestion[];
  const parId = new Map(lignes.map((l) => [l.id, l]));
  const reponseParId = new Map(reponses.map((r) => [r.questionId, r.reponse]));

  let pointsGagnes = 0;
  let pointsMax = 0;
  let corrects = 0;
  const parDomaine = new Map<number, { total: number; corrects: number }>();
  const details: { questionId: string; correct: boolean; domaine: number }[] = [];
  const ecritures: ReturnType<typeof prisma.tentative.create>[] = [];

  for (const id of questionIds) {
    const l = parId.get(id);
    if (!l) continue;
    const rep = reponseParId.get(id);
    const res = rep ? corriger(l, rep, false) : correctionAbandon(l);
    if ("erreur" in res) continue;

    pointsGagnes += res.pointsGagnes;
    pointsMax += res.pointsMax;
    if (res.correct) corrects++;

    const agg = parDomaine.get(l.domaine) ?? { total: 0, corrects: 0 };
    agg.total++;
    if (res.correct) agg.corrects++;
    parDomaine.set(l.domaine, agg);

    details.push({ questionId: id, correct: res.correct, domaine: l.domaine });

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

  const score = scoreExamen(pointsGagnes, pointsMax);
  const reussi = examenReussi(score);
  const dureeSec = Math.max(
    0,
    Math.round((Date.now() - session.debutLe.getTime()) / 1000),
  );
  const repartition = [1, 2, 3, 4, 5].map((d) => ({
    domaine: d,
    ...(parDomaine.get(d) ?? { total: 0, corrects: 0 }),
  }));

  await prisma.$transaction([
    ...ecritures,
    ...repartition
      .filter((r) => r.total > 0)
      .map((r) =>
        prisma.progressionDomaine.upsert({
          where: { utilisateurId_domaine: { utilisateurId: u.id, domaine: r.domaine } },
          create: {
            utilisateurId: u.id,
            domaine: r.domaine,
            questionsVues: r.total,
            questionsReussies: r.corrects,
          },
          update: {
            questionsVues: { increment: r.total },
            questionsReussies: { increment: r.corrects },
          },
        }),
      ),
    prisma.sessionExamen.update({
      where: { id: sessionId },
      data: {
        finLe: new Date(),
        dureeSec,
        corrects,
        score,
        reussi,
        detail: JSON.stringify({ questionIds, repartition, details }),
      },
    }),
  ]);

  return NextResponse.json({
    score,
    reussi,
    total: questionIds.length,
    corrects,
    dureeSec,
    repartition,
  });
}
