import { NextResponse } from "next/server";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const capteur = await prisma.capteur.findUnique({ where: { id: params.id } });
  if (!capteur || capteur.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Capteur introuvable." }, { status: 404 });
  }

  await prisma.capteur.update({
    where: { id: capteur.id },
    data: { actif: false, revokeLe: new Date() },
  });
  await prisma.auditCapteur.create({
    data: { capteurId: capteur.id, action: "revoke", details: "Jeton revoque." },
  });

  return NextResponse.json({ ok: true });
}
