"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOMAINES, DIFFICULTES } from "@/lib/domaines";

export function QuizConfigForm({ defaultDomaine }: { defaultDomaine?: number }) {
  const router = useRouter();
  const [domaine, setDomaine] = useState<string>(
    defaultDomaine ? String(defaultDomaine) : "",
  );
  const [difficulte, setDifficulte] = useState<string>("");
  const [nombre, setNombre] = useState<string>("10");
  const [chrono, setChrono] = useState(false);

  function demarrer() {
    const p = new URLSearchParams();
    if (domaine) p.set("domaine", domaine);
    if (difficulte) p.set("difficulte", difficulte);
    p.set("nombre", nombre);
    if (chrono) p.set("chrono", "1");
    router.push(`/quiz/session?${p.toString()}`);
  }

  return (
    <div className="card space-y-5">
      <div>
        <label className="label">Domaine</label>
        <div className="flex flex-wrap gap-2">
          <ChoixBouton actif={domaine === ""} onClick={() => setDomaine("")}>
            Tous
          </ChoixBouton>
          {Object.entries(DOMAINES).map(([n, meta]) => (
            <ChoixBouton
              key={n}
              actif={domaine === n}
              onClick={() => setDomaine(n)}
            >
              D{n} · {meta.court}
            </ChoixBouton>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Difficulte</label>
        <div className="flex flex-wrap gap-2">
          <ChoixBouton actif={difficulte === ""} onClick={() => setDifficulte("")}>
            Toutes
          </ChoixBouton>
          {DIFFICULTES.map((d) => (
            <ChoixBouton
              key={d}
              actif={difficulte === d}
              onClick={() => setDifficulte(d)}
            >
              {d}
            </ChoixBouton>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Nombre de questions</label>
        <div className="flex flex-wrap gap-2">
          {["5", "10", "20"].map((n) => (
            <ChoixBouton key={n} actif={nombre === n} onClick={() => setNombre(n)}>
              {n}
            </ChoixBouton>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Minuterie</label>
        <div className="flex flex-wrap gap-2">
          <ChoixBouton actif={!chrono} onClick={() => setChrono(false)}>
            Sans chrono
          </ChoixBouton>
          <ChoixBouton actif={chrono} onClick={() => setChrono(true)}>
            Chronometre (temps ecoule = rate)
          </ChoixBouton>
        </div>
      </div>

      <button onClick={demarrer} className="btn-brand w-full">
        Commencer
      </button>
    </div>
  );
}

function ChoixBouton({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        actif
          ? "border-brand bg-brand/15 text-text"
          : "border-border bg-surface-2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
