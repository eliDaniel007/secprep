import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { arreter } from "@secprep/sandbox";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ sessionId: z.string() });

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const session = await prisma.sessionSandbox.findUnique({ where: { id: parse.data.sessionId } });
  if (session && session.utilisateurId === u.id) {
    await arreter(session.conteneur).catch(() => {});
    await prisma.sessionSandbox.delete({ where: { id: session.id } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
