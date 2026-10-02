import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({
  verdict: z.string().nullable().optional(),
  notes: z.string().max(50000).optional(),
  preuves: z.array(z.string()).optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const enquete = await prisma.enquete.findUnique({ where: { id: params.id } });
  if (!enquete || enquete.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Enquete introuvable." }, { status: 404 });
  }

  await prisma.enquete.update({
    where: { id: params.id },
    data: {
      ...(parse.data.verdict !== undefined ? { verdict: parse.data.verdict } : {}),
      ...(parse.data.notes !== undefined ? { notes: parse.data.notes } : {}),
      ...(parse.data.preuves !== undefined ? { preuves: JSON.stringify(parse.data.preuves) } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
