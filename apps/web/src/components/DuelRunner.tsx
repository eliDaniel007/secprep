"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIBELLE_TYPE } from "@/lib/domaines";
import {
  QuestionInputs,
  answerInitial,
  answerPrete,
  answerVersReponse,
  type Answer,
} from "@/components/QuestionInputs";
import type { QuestionClient } from "@/lib/quiz-api";

interface Resultat {
  pointsGagnes: number;
  pointsMax: number;
  corrects: number;
  total: number;
}

export function DuelRunner({ code }: { code: string }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[] | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [index, setIndex] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const soumisRef = useRef(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch(`/api/duel/${code}/questions`);
        const data = await res.json();
        if (annule) return;
        if (!res.ok) return setErreur(data.erreur ?? "Chargement impossible.");
        setQuestions(data.questions);
        setAnswers(data.questions.map((q: QuestionClient) => answerInitial(q)));
      } catch {
        if (!annule) setErreur("Erreur reseau.");
      }
    })();
    return () => {
      annule = true;
    };
  }, [code]);

  async function soumettre() {
    if (soumisRef.current || !questions) return;
    soumisRef.current = true;
    setEnvoi(true);
    try {
      const reponses = questions.map((q, i) => ({
        questionId: q.id,
        reponse: answerPrete(answers[i]!) ? answerVersReponse(q, answers[i]!) ?? undefined : undefined,
      }));
      const res = await fetch(`/api/duel/${code}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponses }),
      });
      const data = await res.json();
      if (res.ok) setResultat(data);
      else {
        setErreur(data.erreur ?? "Soumission impossible.");
        soumisRef.current = false;
      }
    } finally {
      setEnvoi(false);
    }
  }

  if (erreur) {
    return (
      <div className="card">
        <p className="text-danger">{erreur}</p>
        <Link href={`/duel/${code}`} className="btn-ghost mt-4">
          Voir le duel
        </Link>
      </div>
    );
  }
  if (!questions) return <p className="text-muted">Préparation du duel…</p>;

  if (resultat) {
    const pct = resultat.pointsMax
      ? Math.round((resultat.pointsGagnes / resultat.pointsMax) * 100)
      : 0;
    return (
      <div className="space-y-6">
        <div className="card text-center">
          <p className="text-sm text-muted">Ton résultat</p>
          <div className="my-2 text-4xl font-black">{pct} %</div>
          <p className="text-muted">
            {resultat.corrects} / {resultat.total} correctes
          </p>
        </div>
        <p className="text-center text-sm text-muted">
          Partage le code <span className="font-mono text-text">{code}</span> à ton
          binôme, puis compare vos scores.
        </p>
        <div className="flex justify-center gap-3">
          <Link href={`/duel/${code}`} className="btn-brand">
            Voir la comparaison
          </Link>
          <Link href="/duel" className="btn-ghost">
            Tous les défis
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[index]!;
  const repondues = answers.filter((a) => answerPrete(a)).length;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>Question {index + 1} / {questions.length}</span>
          <span className="flex items-center gap-2">
            <span className="chip">D{q.domaine}</span>
            <span className="chip">{LIBELLE_TYPE[q.type]}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="card space-y-5">
        <h2 className="text-lg font-semibold leading-snug">{q.enonce}</h2>
        <QuestionInputs
          question={q}
          value={answers[index]!}
          onChange={(a) => setAnswers((prev) => prev.map((x, i) => (i === index ? a : x)))}
        />
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
          <button onClick={soumettre} disabled={envoi} className="btn-brand">
            {envoi ? "Envoi…" : "Terminer"}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted">
        {repondues} / {questions.length} répondues · correction à la fin
      </p>
    </div>
  );
}
