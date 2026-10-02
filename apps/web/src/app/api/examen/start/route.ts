import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { repartitionExamen, EXAMEN_NB_MAX } from "@secprep/quiz";
import { utilisateurCourant } from "@/lib/auth";
import { melanger } from "@/lib/melange";
import { versQuestionClient, type LigneQuestion } from "@/lib/questions";

const schema = z.object({
  nombre: z.number().int().min(5).max(EXAMEN_NB_MAX).optional(),
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
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  // Toutes les questions valides, groupees par domaine.
  const toutes = (await prisma.question.findMany({
    where: { statut: "valide" },
    select: SELECT,
  })) as LigneQuestion[];

  const dispo = toutes.length;
  // L'examen cible 90 questions, mais plafonne au nombre disponible (banque
  // encore petite en Phase 3 ; les generateurs viendront en Phase 10).
  const cible = Math.min(parse.data.nombre ?? EXAMEN_NB_MAX, dispo);

  const parDomaine = new Map<number, LigneQuestion[]>();
  for (const q of toutes) {
    const arr = parDomaine.get(q.domaine) ?? [];
    arr.push(q);
    parDomaine.set(q.domaine, arr);
  }

  const voulu = repartitionExamen(cible);
  const choisies: LigneQuestion[] = [];
  const prises = new Set<string>();

  // 1) Tirage pondere par domaine (plafonne par la disponibilite).
  for (const d of [1, 2, 3, 4, 5]) {
    const pool = melanger(parDomaine.get(d) ?? []);
    for (const q of pool.slice(0, voulu[d] ?? 0)) {
      choisies.push(q);
      prises.add(q.id);
    }
  }
  // 2) Complement si le total est en dessous de la cible.
  if (choisies.length < cible) {
    const reste = melanger(toutes.filter((q) => !prises.has(q.id)));
    for (const q of reste) {
      if (choisies.length >= cible) break;
      choisies.push(q);
      prises.add(q.id);
    }
  }

  const ordreFinal = melanger(choisies);
  const questions = ordreFinal.map(versQuestionClient);

  const session = await prisma.sessionExamen.create({
    data: {
      utilisateurId: u.id,
      total: questions.length,
      detail: JSON.stringify({ questionIds: ordreFinal.map((q) => q.id) }),
    },
  });

  return NextResponse.json({ sessionId: session.id, questions });
}
