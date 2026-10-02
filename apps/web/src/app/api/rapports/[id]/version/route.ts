import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ contenu: z.string().max(100000) });

/** Enregistre une version (instantane) du rapport. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const rapport = await prisma.rapport.findUnique({ where: { id: params.id } });
  if (!rapport || rapport.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });
  }

  const [, version] = await prisma.$transaction([
    prisma.rapport.update({ where: { id: params.id }, data: { contenu: parse.data.contenu } }),
    prisma.rapportVersion.create({
      data: { rapportId: params.id, contenu: parse.data.contenu },
    }),
  ]);

  return NextResponse.json({ ok: true, versionId: version.id, creeLe: version.creeLe });
}
