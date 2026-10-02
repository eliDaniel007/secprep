import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ action: z.enum(["valider", "rejeter"]) });

/** Relecture d'une question generee : valider (-> quiz/examen) ou rejeter (suppr.). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });
  if (u.role !== "admin") return NextResponse.json({ erreur: "Reserve aux admins." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Action invalide." }, { status: 400 });

  const q = await prisma.question.findUnique({ where: { id: params.id } });
  // On ne touche qu'aux brouillons generes (securite : pas de modif du contenu officiel).
  if (!q || q.source !== "genere" || q.statut !== "brouillon") {
    return NextResponse.json({ erreur: "Question introuvable ou deja traitee." }, { status: 404 });
  }

  if (parse.data.action === "valider") {
    await prisma.question.update({ where: { id: q.id }, data: { statut: "valide" } });
  } else {
    await prisma.question.delete({ where: { id: q.id } });
  }

  return NextResponse.json({ ok: true });
}
