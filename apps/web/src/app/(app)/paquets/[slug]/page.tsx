import { notFound } from "next/navigation";
import { prisma } from "@secprep/db";
import { genererCapture, type VeritePaquets } from "@secprep/packgen";
import { exigerUtilisateur } from "@/lib/auth";
import { PacketViewer } from "@/components/PacketViewer";

export default async function CapturePage({ params }: { params: { slug: string } }) {
  await exigerUtilisateur();
  const capture = await prisma.capture.findUnique({ where: { slug: params.slug } });
  if (!capture) notFound();

  // Paquets regeneres a la volee depuis la graine (reproductible).
  const cap = genererCapture(capture.slug, { graine: capture.graine });
  const verite = JSON.parse(capture.veriteTerrain) as VeritePaquets;

  // On n'envoie PAS les reponses des exercices au client.
  const exercices = verite.exercices.map((e) => ({
    id: e.id,
    question: e.question,
    indice: e.indice,
  }));

  return (
    <PacketViewer
      slug={capture.slug}
      titre={capture.titre}
      description={capture.description}
      paquets={cap.paquets}
      exercices={exercices}
    />
  );
}
