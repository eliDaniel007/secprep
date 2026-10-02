import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import {
  corrigerRapport,
  CleApiManquante,
  ReponseIAInvalide,
  veriteTerrainSchema,
  type SortieCorrecteur,
} from "@secprep/report-grader";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ mode: z.enum(["coach", "correcteur"]) });

const MAX_PAR_JOUR = Number(process.env.MAX_CORRECTIONS_JOUR ?? "20");

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  const { mode } = parse.data;

  const rapport = await prisma.rapport.findUnique({
    where: { id: params.id },
    include: { scenario: true },
  });
  if (!rapport || rapport.utilisateurId !== u.id) {
    return NextResponse.json({ erreur: "Rapport introuvable." }, { status: 404 });
  }

  // Plafond d'appels IA par jour et par utilisateur.
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const aujourdhui = await prisma.correctionRapport.count({
    where: { rapport: { utilisateurId: u.id }, creeLe: { gte: debutJour } },
  });
  if (aujourdhui >= MAX_PAR_JOUR) {
    return NextResponse.json(
      { erreur: `Plafond quotidien atteint (${MAX_PAR_JOUR} corrections/jour).`, code: "PLAFOND" },
      { status: 429 },
    );
  }

  const verite = rapport.scenario
    ? veriteTerrainSchema.parse(JSON.parse(rapport.scenario.veriteTerrain))
    : { iocs: [], chronologie: [], bonnesActions: [], faitsAttendus: [] };
  const contexte = rapport.scenario?.contexte ?? "Rapport libre, sans scenario de reference.";

  try {
    const { sortie, modele } = await corrigerRapport({
      mode,
      contexteScenario: contexte,
      verite,
      rapportMarkdown: rapport.contenu,
    });

    const noteGlobale =
      sortie.mode === "correcteur" ? (sortie as SortieCorrecteur).noteGlobale : null;

    await prisma.correctionRapport.create({
      data: {
        rapportId: rapport.id,
        mode,
        resultat: JSON.stringify(sortie),
        noteGlobale,
        modele,
      },
    });

    return NextResponse.json({ sortie, modele });
  } catch (e) {
    if (e instanceof CleApiManquante) {
      return NextResponse.json(
        {
          erreur:
            "Aucune cle API Claude configuree. Ajoutez ANTHROPIC_API_KEY dans .env pour activer la correction IA.",
          code: "CLE_MANQUANTE",
        },
        { status: 503 },
      );
    }
    if (e instanceof ReponseIAInvalide) {
      return NextResponse.json(
        { erreur: "La reponse de l'IA etait invalide. Reessayez.", code: "IA_INVALIDE" },
        { status: 502 },
      );
    }
    console.error("Erreur correction IA:", e);
    return NextResponse.json({ erreur: "Erreur lors de l'appel IA." }, { status: 500 });
  }
}
