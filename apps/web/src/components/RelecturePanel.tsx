"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BrouillonVue {
  id: string;
  domaine: number;
  type: string;
  difficulte: string;
  enonce: string;
  explication: string;
  options: string[] | null;
  reponse: number | string | null;
  paires: { gauche: string; droite: string }[] | null;
}

export function RelecturePanel({ brouillons }: { brouillons: BrouillonVue[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function traiter(id: string, action: "valider" | "rejeter") {
    setErreur(null);
    setEnCours(id);
    try {
      const res = await fetch(`/api/admin/relecture/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErreur(data.erreur ?? "Action impossible.");
        return;
      }
      router.refresh();
    } finally {
      setEnCours(null);
    }
  }

  if (brouillons.length === 0) {
    return (
      <p className="text-muted">
        Aucune question generee en attente. Lance <code className="rounded bg-surface-2 px-1">pnpm seed:generes</code> pour en produire.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {erreur && <p className="text-sm text-danger">{erreur}</p>}
      {brouillons.map((q) => (
        <div key={q.id} className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="chip">D{q.domaine}</span>
            <span className="chip">{q.type}</span>
            <span className="chip">{q.difficulte}</span>
            <span className="font-mono">{q.id}</span>
          </div>
          <p className="font-medium">{q.enonce}</p>

          {q.options && (
            <ul className="space-y-1 text-sm">
              {q.options.map((o, i) => (
                <li
                  key={i}
                  className={i === q.reponse ? "font-semibold text-ok" : "text-muted"}
                >
                  {i === q.reponse ? "✓ " : "• "}
                  {o}
                </li>
              ))}
            </ul>
          )}

          {q.paires && (
            <ul className="space-y-1 text-sm text-muted">
              {q.paires.map((p, i) => (
                <li key={i}>
                  {p.gauche} → {p.droite}
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm text-muted">
            <span className="font-semibold text-text">Explication : </span>
            {q.explication}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => traiter(q.id, "valider")}
              disabled={enCours === q.id}
              className="btn-brand px-3 py-1.5 text-sm"
            >
              Valider
            </button>
            <button
              onClick={() => traiter(q.id, "rejeter")}
              disabled={enCours === q.id}
              className="btn-ghost px-3 py-1.5 text-sm text-danger"
            >
              Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
