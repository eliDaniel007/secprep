import Link from "next/link";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";
import { NouveauRapport } from "@/components/NouveauRapport";

export default async function RapportsPage() {
  const u = await exigerUtilisateur();

  const [rapports, scenarios] = await Promise.all([
    prisma.rapport.findMany({
      where: { utilisateurId: u.id },
      orderBy: { misAJourLe: "desc" },
      include: { _count: { select: { corrections: true, versions: true } } },
    }),
    prisma.scenarioLab.findMany({
      orderBy: { titre: "asc" },
      select: { slug: true, titre: true, type: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="mt-1 text-muted">
          Redige des rapports d'incident et fais-les analyser (Coach ou Correcteur).
        </p>
      </div>

      <NouveauRapport scenarios={scenarios} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mes rapports</h2>
        {rapports.length === 0 ? (
          <p className="text-muted">Aucun rapport pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {rapports.map((r) => (
              <Link
                key={r.id}
                href={`/rapports/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-muted"
              >
                <span className="font-medium">{r.titre}</span>
                <span className="flex items-center gap-3 text-muted">
                  <span className="chip">{r.modele}</span>
                  <span>{r._count.versions} version(s)</span>
                  <span>{r._count.corrections} analyse(s)</span>
                  <span>{new Date(r.misAJourLe).toLocaleDateString("fr-CA")}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
