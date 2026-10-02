import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { TYPES_PHASE2, type QuestionClient } from "@/lib/quiz-api";

const schema = z.object({
  domaine: z.number().int().min(1).max(5).optional(),
  difficulte: z.enum(["facile", "moyen", "difficile"]).optional(),
  nombre: z.number().int().min(1).max(90).optional(),
  ids: z.array(z.string()).optional(),
});

/** Melange de Fisher-Yates. */
function melanger<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body ?? {});
  if (!parse.success) {
    return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  }
  const { domaine, difficulte, ids } = parse.data;
  const nombre = parse.data.nombre ?? 10;

  const lignes = await prisma.question.findMany({
    where: {
      statut: "valide",
      type: { in: TYPES_PHASE2 },
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      ...(domaine ? { domaine } : {}),
      ...(difficulte ? { difficulte } : {}),
    },
    select: {
      id: true,
      domaine: true,
      type: true,
      difficulte: true,
      tempsSec: true,
      enonce: true,
      indice: true,
      contenu: true,
    },
  });

  const choisies = melanger(lignes).slice(0, nombre);

  const questions: QuestionClient[] = choisies.map((q) => {
    const base: QuestionClient = {
      id: q.id,
      domaine: q.domaine,
      type: q.type as QuestionClient["type"],
      difficulte: q.difficulte as QuestionClient["difficulte"],
      tempsSec: q.tempsSec,
      enonce: q.enonce,
      indice: q.indice,
    };
    if (q.type === "qcm") {
      const contenu = JSON.parse(q.contenu) as { options: string[] };
      base.options = contenu.options;
    }
    return base;
  });

  return NextResponse.json({ questions });
}
