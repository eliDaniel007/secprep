import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { executer } from "@secprep/sandbox";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({
  sessionId: z.string(),
  commande: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const session = await prisma.sessionSandbox.findUnique({ where: { id: parse.data.sessionId } });
  if (!session || session.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Session introuvable." }, { status: 404 });
  }

  // La commande s'execute UNIQUEMENT dans le conteneur isole de cette session.
  const sortie = await executer(session.conteneur, parse.data.commande);
  return NextResponse.json(sortie);
}
