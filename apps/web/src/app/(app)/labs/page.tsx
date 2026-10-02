import Link from "next/link";
import { LABOS } from "@secprep/labs";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";

export default async function LabsPage() {
  const u = await exigerUtilisateur();
  const prog = await prisma.progressionLabo.findMany({ where: { utilisateurId: u.id } });
  const faits = new Set(prog.filter((p) => p.termine).map((p) => p.laboSlug));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Labos pratiques (terminal)</h1>
        <p className="mt-1 text-muted">
          Exercices Linux dans un conteneur isole, valides automatiquement.
          {faits.size}/{LABOS.length} termine(s).
        </p>
      </div>

      <div className="space-y-2">
        {LABOS.map((l) => (
          <Link
            key={l.slug}
            href={`/labs/${l.slug}`}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 hover:border-muted"
          >
            <div>
              <div className="flex items-center gap-2 font-medium">
                {faits.has(l.slug) && <span className="text-ok">✓</span>}
                {l.titre}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
                {l.outils.map((o) => (
                  <span key={o} className="chip font-mono">{o}</span>
                ))}
              </div>
            </div>
            <span className="text-xs text-muted">SY0-701 {l.objectifSy0701}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
