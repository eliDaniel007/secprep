import Link from "next/link";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";

export default async function PaquetsPage() {
  await exigerUtilisateur();
  const captures = await prisma.capture.findMany({ orderBy: { titre: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analyse de paquets</h1>
        <p className="mt-1 text-muted">
          Captures synthetiques a investiguer : filtres, detail par couche, suivi
          de flux, statistiques et exercices.
        </p>
      </div>

      {captures.length === 0 ? (
        <p className="text-muted">Aucune capture (lance `pnpm seed`).</p>
      ) : (
        <div className="space-y-2">
          {captures.map((c) => (
            <Link
              key={c.slug}
              href={`/paquets/${c.slug}`}
              className="block rounded-xl border border-border bg-surface px-4 py-3 hover:border-muted"
            >
              <div className="font-medium">{c.titre}</div>
              <div className="text-sm text-muted">{c.description}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
