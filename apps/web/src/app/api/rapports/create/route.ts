import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { MODELES, type TypeModele } from "@/lib/modeles";

const schema = z.object({
  titre: z.string().min(1).max(200).optional(),
  modele: z.enum(["incident", "postmortem", "escalade", "audit"]).optional(),
  scenarioSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body ?? {});
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  const { titre, modele, scenarioSlug } = parse.data;

  let scenarioId: string | null = null;
  let contenu: string = MODELES[(modele ?? "incident") as TypeModele];
  let titreFinal = titre ?? "Nouveau rapport";
  let typeModele: string = modele ?? "incident";

  if (scenarioSlug) {
    const scenario = await prisma.scenarioLab.findUnique({ where: { slug: scenarioSlug } });
    if (!scenario) return NextResponse.json({ erreur: "Scenario inconnu." }, { status: 404 });
    scenarioId = scenario.id;
    contenu = scenario.modeleMarkdown || MODELES.incident;
    titreFinal = titre ?? scenario.titre;
    typeModele = scenario.type;
  }

  const rapport = await prisma.rapport.create({
    data: {
      utilisateurId: u.id,
      scenarioId,
      titre: titreFinal,
      modele: typeModele,
      contenu,
    },
  });

  return NextResponse.json({ id: rapport.id });
}
