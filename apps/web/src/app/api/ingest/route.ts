import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { tokenDepuisHeader, hacherToken, minimiserChamps } from "@/lib/capteur";

const MAX_PAR_REQUETE = 500;
const MAX_PAR_MINUTE = 20; // limitation de debit : lots d'ingestion / minute

const schema = z.object({
  evenements: z
    .array(
      z.object({
        ts: z.number().int().optional(),
        source: z.string().max(80),
        action: z.string().max(80),
        champs: z.record(z.unknown()).optional(),
        // raw : accepte mais on ne garde qu'un resume (jamais de charge utile).
        raw: z.string().max(500).optional(),
      }),
    )
    .max(MAX_PAR_REQUETE),
});

export async function POST(req: Request) {
  const token = tokenDepuisHeader(req.headers.get("authorization"));
  if (!token) {
    return NextResponse.json({ erreur: "Jeton de capteur manquant." }, { status: 401 });
  }

  const capteur = await prisma.capteur.findUnique({ where: { tokenHash: hacherToken(token) } });
  if (!capteur || !capteur.actif) {
    return NextResponse.json({ erreur: "Jeton invalide ou revoque." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  // Limitation de debit : lots d'ingestion dans la derniere minute.
  const ilYaUneMinute = new Date(Date.now() - 60_000);
  const recents = await prisma.auditCapteur.count({
    where: { capteurId: capteur.id, action: "ingest", creeLe: { gte: ilYaUneMinute } },
  });
  if (recents >= MAX_PAR_MINUTE) {
    return NextResponse.json({ erreur: "Limite de debit atteinte." }, { status: 429 });
  }

  const evenements = parse.data.evenements.map((e) => ({
    jeuId: capteur.jeuId,
    ts: new Date(e.ts ?? Date.now()),
    source: e.source,
    action: e.action,
    champs: JSON.stringify(minimiserChamps(e.champs ?? {})),
    raw: (e.raw ?? "").slice(0, 300),
    malveillant: false,
    origine: "reel",
  }));

  if (evenements.length > 0) {
    await prisma.evenement.createMany({ data: evenements });
  }
  await prisma.auditCapteur.create({
    data: { capteurId: capteur.id, action: "ingest", details: `${evenements.length} evenement(s) recu(s).` },
  });

  return NextResponse.json({ ok: true, recus: evenements.length });
}
