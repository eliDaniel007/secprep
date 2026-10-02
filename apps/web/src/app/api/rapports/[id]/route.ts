import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ contenu: z.string().max(100000) });

/** Enregistrement automatique du contenu (ne cree pas de version). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const rapport = await prisma.rapport.findUnique({ where: { id: params.id } });
  if (!rapport || rapport.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });
  }

  await prisma.rapport.update({
    where: { id: params.id },
    data: { contenu: parse.data.contenu },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });
  const rapport = await prisma.rapport.findUnique({ where: { id: params.id } });
  if (!rapport || rapport.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });
  }
  await prisma.rapport.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
