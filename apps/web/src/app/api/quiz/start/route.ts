import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { melanger } from "@/lib/melange";
import { versQuestionClient, type LigneQuestion } from "@/lib/questions";

const TYPES = [
  "qcm",
  "qcm_multiple",
  "vf",
  "libre",
  "scenario",
  "urgence",
  "plan_reprise",
  "ordonnancement",
  "appariement",
  "cas_complexe",
] as const;

const schema = z.object({
  domaine: z.number().int().min(1).max(5).optional(),
  difficulte: z.enum(["facile", "moyen", "difficile"]).optional(),
  nombre: z.number().int().min(1).max(90).optional(),
  ids: z.array(z.string()).optional(),
  types: z.array(z.enum(TYPES)).optional(),
});

const SELECT = {
  id: true,
  domaine: true,
  type: true,
  difficulte: true,
  tempsSec: true,
  enonce: true,
  indice: true,
  astuce: true,
  explication: true,
  contenu: true,
} as const;

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body ?? {});
  if (!parse.success) {
    return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  }
  const { domaine, difficulte, ids, types } = parse.data;
  const nombre = parse.data.nombre ?? 10;

  const lignes = (await prisma.question.findMany({
    where: {
      statut: "valide",
      ...(types && types.length > 0 ? { type: { in: types } } : {}),
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      ...(domaine ? { domaine } : {}),
      ...(difficulte ? { difficulte } : {}),
    },
    select: SELECT,
  })) as LigneQuestion[];

  const choisies = melanger(lignes).slice(0, nombre);
  const questions = choisies.map(versQuestionClient);

  return NextResponse.json({ questions });
}
