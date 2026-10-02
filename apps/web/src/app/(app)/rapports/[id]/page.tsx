import { notFound } from "next/navigation";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";
import { RapportEditeur } from "@/components/RapportEditeur";
import type { SortieIA } from "@/lib/rapport-types";

export default async function RapportPage({ params }: { params: { id: string } }) {
  const u = await exigerUtilisateur();
  const rapport = await prisma.rapport.findUnique({
    where: { id: params.id },
    include: {
      scenario: true,
      versions: { orderBy: { creeLe: "desc" }, take: 20 },
      corrections: { orderBy: { creeLe: "desc" }, take: 10 },
    },
  });
  if (!rapport || rapport.utilisateurId !== u.id) notFound();

  const scenario = rapport.scenario
    ? { titre: rapport.scenario.titre, contexte: rapport.scenario.contexte }
    : null;

  const corrections = rapport.corrections.map((c) => ({
    id: c.id,
    mode: c.mode,
    creeLe: c.creeLe.toISOString(),
    sortie: JSON.parse(c.resultat) as SortieIA,
  }));

  const versions = rapport.versions.map((v) => ({
    id: v.id,
    creeLe: v.creeLe.toISOString(),
    contenu: v.contenu,
  }));

  return (
    <RapportEditeur
      id={rapport.id}
      titre={rapport.titre}
      contenuInitial={rapport.contenu}
      scenario={scenario}
      versions={versions}
      correctionsInitiales={corrections}
    />
  );
}
