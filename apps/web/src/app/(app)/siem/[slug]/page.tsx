import { notFound } from "next/navigation";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";
import { SiemConsole, type EvenementClient } from "@/components/SiemConsole";

export default async function SiemJeuPage({ params }: { params: { slug: string } }) {
  const u = await exigerUtilisateur();
  const jeu = await prisma.jeuJournaux.findUnique({ where: { slug: params.slug } });
  if (!jeu) notFound();

  const [evenementsDb, enqueteExistante] = await Promise.all([
    prisma.evenement.findMany({
      where: { jeuId: jeu.id },
      orderBy: { ts: "asc" },
    }),
    prisma.enquete.findFirst({ where: { jeuId: jeu.id, utilisateurId: u.id } }),
  ]);

  const enquete =
    enqueteExistante ??
    (await prisma.enquete.create({
      data: { utilisateurId: u.id, jeuId: jeu.id, titre: `Enquete — ${jeu.titre}` },
    }));

  const evenements: EvenementClient[] = evenementsDb.map((e) => ({
    id: e.id,
    ts: e.ts.getTime(),
    source: e.source,
    action: e.action,
    champs: JSON.parse(e.champs),
    raw: e.raw,
    malveillant: e.malveillant,
  }));

  return (
    <SiemConsole
      titre={jeu.titre}
      evenements={evenements}
      enquete={{
        id: enquete.id,
        verdict: enquete.verdict,
        notes: enquete.notes,
        preuves: JSON.parse(enquete.preuves) as string[],
      }}
    />
  );
}
