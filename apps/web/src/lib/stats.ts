import "server-only";
import { prisma } from "@secprep/db";

export interface StatDomaine {
  domaine: number;
  questionsDisponibles: number;
  tentatives: number;
  reussies: number;
  tauxReussite: number; // 0..1
}

export interface TableauBord {
  totalQuestions: number;
  totalTentatives: number;
  totalReussies: number;
  tauxGlobal: number;
  parDomaine: StatDomaine[];
  pointsFaibles: StatDomaine[]; // domaines les plus faibles (avec tentatives)
}

export async function tableauBord(utilisateurId: string): Promise<TableauBord> {
  // Questions disponibles par domaine (seules les questions validees comptent ;
  // les brouillons generes sont hors quiz/examen).
  const dispo = await prisma.question.groupBy({
    by: ["domaine"],
    where: { statut: "valide" },
    _count: { _all: true },
  });
  const dispoMap = new Map<number, number>();
  for (const d of dispo) dispoMap.set(d.domaine, d._count._all);

  // Tentatives de l'utilisateur, jointes au domaine de la question.
  const tentatives = await prisma.tentative.findMany({
    where: { utilisateurId },
    select: { correct: true, question: { select: { domaine: true } } },
  });

  const agg = new Map<number, { t: number; r: number }>();
  for (const t of tentatives) {
    const dom = t.question.domaine;
    const cur = agg.get(dom) ?? { t: 0, r: 0 };
    cur.t += 1;
    if (t.correct) cur.r += 1;
    agg.set(dom, cur);
  }

  const parDomaine: StatDomaine[] = [1, 2, 3, 4, 5].map((domaine) => {
    const a = agg.get(domaine) ?? { t: 0, r: 0 };
    return {
      domaine,
      questionsDisponibles: dispoMap.get(domaine) ?? 0,
      tentatives: a.t,
      reussies: a.r,
      tauxReussite: a.t === 0 ? 0 : a.r / a.t,
    };
  });

  const totalTentatives = tentatives.length;
  const totalReussies = tentatives.filter((t) => t.correct).length;
  const totalQuestions = [...dispoMap.values()].reduce((s, n) => s + n, 0);

  const pointsFaibles = parDomaine
    .filter((d) => d.tentatives > 0)
    .sort((a, b) => a.tauxReussite - b.tauxReussite)
    .slice(0, 3);

  return {
    totalQuestions,
    totalTentatives,
    totalReussies,
    tauxGlobal: totalTentatives === 0 ? 0 : totalReussies / totalTentatives,
    parDomaine,
    pointsFaibles,
  };
}

export interface StatQuestion {
  id: string;
  domaine: number;
  type: string;
  difficulte: string;
  enonce: string;
  tentatives: number;
  reussies: number;
  tauxReussite: number; // 0..1
  tempsMoyen: number; // secondes
}

/**
 * Statistiques par question (toutes tentatives confondues) : nombre de
 * tentatives, taux de reussite, temps moyen. Utile pour reperer les questions
 * trop faciles, trop dures ou mal ecrites. Ne compte que les questions validees.
 */
export async function statsParQuestion(): Promise<StatQuestion[]> {
  const questions = await prisma.question.findMany({
    where: { statut: "valide" },
    select: { id: true, domaine: true, type: true, difficulte: true, enonce: true },
  });
  const tentatives = await prisma.tentative.findMany({
    select: { questionId: true, correct: true, tempsPris: true },
  });

  const agg = new Map<string, { t: number; r: number; temps: number }>();
  for (const t of tentatives) {
    const cur = agg.get(t.questionId) ?? { t: 0, r: 0, temps: 0 };
    cur.t += 1;
    if (t.correct) cur.r += 1;
    cur.temps += t.tempsPris;
    agg.set(t.questionId, cur);
  }

  return questions
    .map((q) => {
      const a = agg.get(q.id) ?? { t: 0, r: 0, temps: 0 };
      return {
        ...q,
        tentatives: a.t,
        reussies: a.r,
        tauxReussite: a.t === 0 ? 0 : a.r / a.t,
        tempsMoyen: a.t === 0 ? 0 : Math.round(a.temps / a.t),
      };
    })
    // Les plus repondues d'abord, puis le plus faible taux de reussite.
    .sort((a, b) => b.tentatives - a.tentatives || a.tauxReussite - b.tauxReussite);
}
