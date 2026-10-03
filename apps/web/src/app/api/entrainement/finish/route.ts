import { NextResponse } from "next/server";
import { z } from "zod";
import { GABARITS, GABARITS_QCM } from "@secprep/generators";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({
  reponses: z
    .array(
      z.object({
        gabarit: z.string(),
        graine: z.string(),
        choix: z.number().int().nonnegative().nullable(),
      }),
    )
    .max(20),
});

/**
 * Correction apatride : on REGENERE chaque question depuis {gabarit, graine}
 * (deterministe) et on compare l'index choisi a la bonne reponse calculee.
 */
export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  let corrects = 0;
  const details = parse.data.reponses.map((r) => {
    const gen = GABARITS_QCM.includes(r.gabarit) ? GABARITS[r.gabarit] : undefined;
    if (!gen) {
      return { correct: false, bonneReponse: -1, enonce: "", options: [] as string[], explication: "" };
    }
    const q = gen(r.graine);
    const bonne = typeof q.reponse === "number" ? q.reponse : -1;
    const correct = r.choix !== null && r.choix === bonne;
    if (correct) corrects++;
    return {
      correct,
      bonneReponse: bonne,
      choix: r.choix,
      enonce: q.enonce,
      options: q.options ?? [],
      explication: q.explication,
    };
  });

  return NextResponse.json({
    corrects,
    total: parse.data.reponses.length,
    details,
  });
}
