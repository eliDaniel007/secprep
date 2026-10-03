import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";
import { CapteursPanel, type CapteurVue } from "@/components/CapteursPanel";

export default async function CapteursPage() {
  const u = await exigerUtilisateur();
  const capteurs = await prisma.capteur.findMany({
    where: { utilisateurId: u.id },
    orderBy: { creeLe: "desc" },
    include: {
      jeu: { select: { slug: true, _count: { select: { evenements: true } } } },
      audits: { orderBy: { creeLe: "desc" }, take: 1 },
    },
  });

  const vues: CapteurVue[] = capteurs.map((c) => ({
    id: c.id,
    nom: c.nom,
    actif: c.actif,
    creeLe: c.creeLe.toISOString(),
    jeuSlug: c.jeu.slug,
    nbEvenements: c.jeu._count.evenements,
    dernierAudit: c.audits[0]
      ? `${c.audits[0].action} — ${c.audits[0].details} (${new Date(c.audits[0].creeLe).toLocaleString("fr-CA")})`
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Capteurs</h1>
        <p className="mt-1 text-muted">
          Agents locaux qui envoient des journaux reels vers la plateforme (passif,
          metadonnees uniquement).
        </p>
      </div>
      <CapteursPanel capteurs={vues} />
    </div>
  );
}
