"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBELLE_MODELE, type TypeModele } from "@/lib/modeles";

export function NouveauRapport({
  scenarios,
}: {
  scenarios: { slug: string; titre: string; type: string }[];
}) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);

  async function creer(payload: Record<string, unknown>) {
    setChargement(true);
    try {
      const res = await fetch("/api/rapports/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) router.push(`/rapports/${data.id}`);
    } finally {
      setChargement(false);
    }
  }

  const modeles = Object.keys(LIBELLE_MODELE) as TypeModele[];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">A partir d'un scenario (avec verite terrain)</h2>
        <p className="text-sm text-muted">
          Redige un rapport sur un cas reel ; l'IA pourra comparer aux faits attendus.
        </p>
        <div className="space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.slug}
              disabled={chargement}
              onClick={() => creer({ scenarioSlug: s.slug })}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:border-muted"
            >
              <span className="font-medium">{s.titre}</span>
              <span className="ml-2 chip">{s.type}</span>
            </button>
          ))}
          {scenarios.length === 0 && (
            <p className="text-sm text-muted">Aucun scenario (lance `pnpm seed`).</p>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Modele vierge</h2>
        <p className="text-sm text-muted">Un squelette de rapport a remplir.</p>
        <div className="space-y-2">
          {modeles.map((m) => (
            <button
              key={m}
              disabled={chargement}
              onClick={() => creer({ modele: m })}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:border-muted"
            >
              {LIBELLE_MODELE[m]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
