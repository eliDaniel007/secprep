"use client";

import { useCallback, useEffect, useState } from "react";

interface Ref {
  gabarit: string;
  graine: string;
}
interface QuestionEntr {
  ref: Ref;
  domaine: number;
  type: string;
  difficulte: string;
  enonce: string;
  options: string[];
}
interface Detail {
  correct: boolean;
  bonneReponse: number;
  choix?: number | null;
  enonce: string;
  options: string[];
  explication: string;
}
interface Resultat {
  corrects: number;
  total: number;
  details: Detail[];
}

const AXES: { id: string; label: string; gabarits: string[] }[] = [
  { id: "tous", label: "Tous", gabarits: [] },
  { id: "calcul", label: "Calculs & réseau", gabarits: ["CIDR", "RAID", "ENTROPIE", "ALE", "CHMOD", "RPO"] },
  { id: "concepts", label: "Concepts", gabarits: ["CRYPTO", "CONTROLE", "ATTAQUE"] },
  { id: "soc", label: "Scénarios SOC", gabarits: ["SOC"] },
];

export function EntrainementRunner() {
  const [axe, setAxe] = useState("tous");
  const [nombre, setNombre] = useState(10);
  const [questions, setQuestions] = useState<QuestionEntr[] | null>(null);
  const [choix, setChoix] = useState<(number | null)[]>([]);
  const [index, setIndex] = useState(0);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const demarrer = useCallback(async () => {
    setErreur(null);
    setChargement(true);
    setResultat(null);
    setIndex(0);
    try {
      const gabarits = AXES.find((a) => a.id === axe)?.gabarits ?? [];
      const res = await fetch("/api/entrainement/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, gabarits: gabarits.length ? gabarits : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.erreur ?? "Génération impossible.");
        return;
      }
      setQuestions(data.questions);
      setChoix(data.questions.map(() => null));
    } finally {
      setChargement(false);
    }
  }, [axe, nombre]);

  useEffect(() => {
    void demarrer();
    // On ne redémarre pas automatiquement sur changement de réglage : via le bouton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function terminer() {
    if (!questions) return;
    setChargement(true);
    try {
      const reponses = questions.map((q, i) => ({
        gabarit: q.ref.gabarit,
        graine: q.ref.graine,
        choix: choix[i] ?? null,
      }));
      const res = await fetch("/api/entrainement/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponses }),
      });
      const data = await res.json();
      if (res.ok) setResultat(data);
      else setErreur(data.erreur ?? "Correction impossible.");
    } finally {
      setChargement(false);
    }
  }

  if (erreur) {
    return (
      <div className="card space-y-3">
        <p className="text-danger">{erreur}</p>
        <button onClick={() => void demarrer()} className="btn-brand">
          Réessayer
        </button>
      </div>
    );
  }

  // --- Écran de résultat ---
  if (resultat) {
    const pct = resultat.total ? Math.round((resultat.corrects / resultat.total) * 100) : 0;
    return (
      <div className="space-y-6">
        <div className="card text-center">
          <p className="text-sm text-muted">Série terminée</p>
          <div className="my-2 text-4xl font-black">{pct} %</div>
          <p className="text-muted">
            {resultat.corrects} / {resultat.total} correctes
          </p>
        </div>
        <div className="space-y-3">
          {resultat.details.map((d, i) => (
            <div key={i} className="card space-y-2">
              <div className="flex items-start gap-2">
                <span className={d.correct ? "text-ok" : "text-danger"}>
                  {d.correct ? "✓" : "✗"}
                </span>
                <p className="font-medium">{d.enonce}</p>
              </div>
              <ul className="space-y-1 text-sm">
                {d.options.map((o, j) => (
                  <li
                    key={j}
                    className={
                      j === d.bonneReponse
                        ? "font-semibold text-ok"
                        : j === d.choix && !d.correct
                          ? "text-danger line-through"
                          : "text-muted"
                    }
                  >
                    {j === d.bonneReponse ? "✓ " : "• "}
                    {o}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">{d.explication}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button onClick={() => void demarrer()} disabled={chargement} className="btn-brand">
            {chargement ? "Génération…" : "Nouvelle série"}
          </button>
        </div>
      </div>
    );
  }

  // --- Chargement / jeu ---
  if (!questions || chargement) {
    return <p className="text-muted">Génération des questions…</p>;
  }

  const q = questions[index]!;
  const repondues = choix.filter((c) => c !== null).length;

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label mb-0">Axe</span>
          {AXES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAxe(a.id)}
              className={`rounded-lg border px-3 py-1 text-sm transition ${
                axe === a.id ? "border-brand bg-brand/15 text-text" : "border-border bg-surface text-muted hover:text-text"
              }`}
            >
              {a.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {[10, 15, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNombre(n)}
                className={`rounded-lg border px-2.5 py-1 text-sm ${
                  nombre === n ? "border-brand bg-brand/15 text-text" : "border-border bg-surface text-muted"
                }`}
              >
                {n}
              </button>
            ))}
            <button onClick={() => void demarrer()} className="btn-ghost px-3 py-1.5 text-sm">
              Nouvelle série
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>Question {index + 1} / {questions.length}</span>
          <span className="chip">D{q.domaine}</span>
        </div>
        <div className="meter">
          <i style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold leading-snug">{q.enonce}</h2>
        <div className="space-y-2">
          {q.options.map((o, j) => (
            <label
              key={j}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                choix[index] === j ? "border-brand bg-brand/10" : "border-border bg-surface hover:border-muted"
              }`}
            >
              <input
                type="radio"
                name={`q-${index}`}
                checked={choix[index] === j}
                onChange={() => setChoix((prev) => prev.map((c, i) => (i === index ? j : c)))}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn-ghost"
        >
          ← Précédente
        </button>
        {index < questions.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-brand">
            Suivante →
          </button>
        ) : (
          <button onClick={terminer} disabled={chargement} className="btn-brand">
            {chargement ? "Correction…" : "Terminer"}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted">
        {repondues} / {questions.length} répondues · correction à la fin
      </p>
    </div>
  );
}
