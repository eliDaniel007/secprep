import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { verifierExercice, type VeritePaquets } from "@secprep/packgen";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ exerciceId: z.string(), reponse: z.string().max(200) });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const capture = await prisma.capture.findUnique({ where: { slug: params.slug } });
  if (!capture) return NextResponse.json({ erreur: "Capture inconnue." }, { status: 404 });

  const verite = JSON.parse(capture.veriteTerrain) as VeritePaquets;
  const r = verifierExercice(verite, parse.data.exerciceId, parse.data.reponse);
  return NextResponse.json(r);
}
