import Link from "next/link";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";

export default async function SiemPage() {
  await exigerUtilisateur();
  const jeux = await prisma.jeuJournaux.findMany({
    orderBy: { creeLe: "desc" },
    include: { _count: { select: { evenements: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SIEM simule</h1>
        <p className="mt-1 text-muted">
          Investigue des jeux de journaux synthetiques : recherche, tableaux de
          bord, regles de detection, enquete.
        </p>
      </div>

      {jeux.length === 0 ? (
        <p className="text-muted">Aucun jeu de journaux (lance `pnpm seed`).</p>
      ) : (
        <div className="space-y-2">
          {jeux.map((j) => (
            <Link
              key={j.id}
              href={`/siem/${j.slug}`}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-muted"
            >
              <div>
                <div className="font-medium">{j.titre}</div>
                <div className="text-sm text-muted">{j.description}</div>
              </div>
              <span className="text-sm text-muted">{j._count.evenements} evenements</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
