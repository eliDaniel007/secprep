"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DOMAINES, LIBELLE_TYPE } from "@/lib/domaines";
import {
  QuestionInputs,
  answerInitial,
  answerPrete,
  answerVersReponse,
  type Answer,
} from "@/components/QuestionInputs";
import type { QuestionClient } from "@/lib/quiz-api";

const EXAMEN_DUREE_SEC = 90 * 60;

interface ResultatExamen {
  score: number;
  reussi: boolean;
  total: number;
  corrects: number;
  dureeSec: number;
  repartition: { domaine: number; total: number; corrects: number }[];
}

type Phase = "chargement" | "quiz" | "revue" | "resultat";

export function ExamRunner() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const [reste, setReste] = useState(EXAMEN_DUREE_SEC);
  const [resultat, setResultat] = useState<ResultatExamen | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const soumisRef = useRef(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch("/api/examen/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (annule) return;
        if (!res.ok) return setErreur(data.erreur ?? "Erreur au demarrage.");
        setSessionId(data.sessionId);
        setQuestions(data.questions);
        setAnswers(data.questions.map((q: QuestionClient) => answerInitial(q)));
        setFlags(data.questions.map(() => false));
        setPhase("quiz");
      } catch {
        if (!annule) setErreur("Erreur reseau.");
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  const soumettre = useMemo(
    () =>
      async function soumettre() {
        if (soumisRef.current) return;
        soumisRef.current = true;
        setEnvoi(true);
        try {
          const reponses = questions.map((q, i) => ({
            questionId: q.id,
            // On n'envoie la reponse que si elle est reellement complete ;
            // sinon la question est laissee sans reponse (comptee ratee).
            reponse: answerPrete(answers[i]!)
              ? answerVersReponse(q, answers[i]!) ?? undefined
              : undefined,
          }));
          const res = await fetch("/api/examen/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, reponses }),
          });
          const data = await res.json();
          if (res.ok) {
            setResultat(data);
            setPhase("resultat");
          } else {
            setErreur(data.erreur ?? "Erreur a la soumission.");
            soumisRef.current = false;
          }
        } finally {
          setEnvoi(false);
        }
      },
    [questions, answers, sessionId],
  );

  // Minuterie globale.
  useEffect(() => {
    if (phase !== "quiz" && phase !== "revue") return;
    if (reste <= 0) {
      void soumettre();
      return;
    }
    const id = setTimeout(() => setReste((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [reste, phase, soumettre]);

  if (erreur) {
    return (
      <div className="card">
        <p className="text-danger">{erreur}</p>
        <Link href="/examen" className="btn-ghost mt-4">
          Retour
        </Link>
      </div>
    );
  }
  if (phase === "chargement") return <p className="text-muted">Preparation de l'examen…</p>;
  if (phase === "resultat" && resultat) {
    return <ResultatVue resultat={resultat} router={router} />;
  }

  const repondues = answers.filter((a) => answerPrete(a)).length;

  if (phase === "revue") {
    return (
      <Revue
        questions={questions}
        answers={answers}
        flags={flags}
        reste={reste}
        repondues={repondues}
        envoi={envoi}
        onAller={(i) => {
          setIndex(i);
          setPhase("quiz");
        }}
        onSoumettre={soumettre}
      />
    );
  }

  const q = questions[index]!;
  return (
    <div className="space-y-5">
      <Chrono reste={reste} libelle="Examen" />

      <Navigateur
        questions={questions}
        answers={answers}
        flags={flags}
        index={index}
        onAller={setIndex}
      />

      <div className="flex items-center justify-between text-sm text-muted">
        <span>Question {index + 1} / {questions.length}</span>
        <span className="flex items-center gap-2">
          <span className="chip">D{q.domaine}</span>
          <span className="chip">{LIBELLE_TYPE[q.type]}</span>
        </span>
      </div>

      <div className="card space-y-5">
        <h2 className="text-lg font-semibold leading-snug">{q.enonce}</h2>
        <QuestionInputs
          question={q}
          value={answers[index]!}
          onChange={(a) =>
            setAnswers((prev) => prev.map((x, i) => (i === index ? a : x)))
          }
        />
        <button
          onClick={() => setFlags((f) => f.map((x, i) => (i === index ? !x : x)))}
          className={`text-sm font-medium ${flags[index] ? "text-warn" : "text-muted hover:text-text"}`}
        >
          {flags[index] ? "✓ Marquee pour revision" : "⚑ Marquer pour revision"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn-ghost"
        >
          ← Precedente
        </button>
        {index < questions.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-brand">
            Suivante →
          </button>
        ) : (
          <button onClick={() => setPhase("revue")} className="btn-brand">
            Revue finale
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted">{repondues} / {questions.length} repondues</p>
    </div>
  );
}

function Chrono({ reste, libelle }: { reste: number; libelle: string }) {
  const min = Math.floor(reste / 60);
  const sec = reste % 60;
  const urgent = reste <= 60;
  return (
    <div
      className={`sticky top-16 z-10 flex items-center justify-between rounded-xl border px-4 py-2 text-sm font-semibold backdrop-blur ${
        urgent ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-surface-2/80 text-text"
      }`}
    >
      <span>⏱ {libelle}</span>
      <span>
        {min}:{String(sec).padStart(2, "0")}
      </span>
    </div>
  );
}

function Navigateur({
  questions,
  answers,
  flags,
  index,
  onAller,
}: {
  questions: QuestionClient[];
  answers: Answer[];
  flags: boolean[];
  index: number;
  onAller: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((_, i) => {
        const prete = answerPrete(answers[i]!);
        const actif = i === index;
        return (
          <button
            key={i}
            onClick={() => onAller(i)}
            className={`relative h-8 w-8 rounded-lg border text-xs font-semibold transition ${
              actif
                ? "border-brand bg-brand text-brand-fg"
                : prete
                  ? "border-ok/50 bg-ok/15 text-text"
                  : "border-border bg-surface-2 text-muted hover:border-muted"
            }`}
          >
            {i + 1}
            {flags[i] && <span className="absolute -right-1 -top-1 text-warn">⚑</span>}
          </button>
        );
      })}
    </div>
  );
}

function Revue({
  questions,
  answers,
  flags,
  reste,
  repondues,
  envoi,
  onAller,
  onSoumettre,
}: {
  questions: QuestionClient[];
  answers: Answer[];
  flags: boolean[];
  reste: number;
  repondues: number;
  envoi: boolean;
  onAller: (i: number) => void;
  onSoumettre: () => void;
}) {
  const nonRepondues = questions.filter((_, i) => !answerPrete(answers[i]!)).length;
  const marquees = flags.filter(Boolean).length;
  return (
    <div className="space-y-5">
      <Chrono reste={reste} libelle="Examen" />
      <h1 className="text-2xl font-bold">Revue finale</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat libelle="Repondues" valeur={`${repondues}/${questions.length}`} />
        <Stat libelle="Sans reponse" valeur={String(nonRepondues)} />
        <Stat libelle="Marquees" valeur={String(marquees)} />
      </div>

      <Navigateur
        questions={questions}
        answers={answers}
        flags={flags}
        index={-1}
        onAller={onAller}
      />
      <p className="text-sm text-muted">
        Clique sur un numero pour revenir a la question. Les cases vertes sont
        repondues, le drapeau indique une question marquee.
      </p>

      {nonRepondues > 0 && (
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
          Attention : {nonRepondues} question(s) sans reponse seront comptees
          comme ratees.
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={onSoumettre} disabled={envoi} className="btn-brand">
          {envoi ? "Correction…" : "Soumettre l'examen"}
        </button>
        <button onClick={() => onAller(0)} className="btn-ghost">
          Revenir aux questions
        </button>
      </div>
    </div>
  );
}

function ResultatVue({
  resultat,
  router,
}: {
  resultat: ResultatExamen;
  router: ReturnType<typeof useRouter>;
}) {
  const min = Math.floor(resultat.dureeSec / 60);
  const sec = resultat.dureeSec % 60;
  return (
    <div className="space-y-6">
      <div
        className={`card text-center ${
          resultat.reussi ? "border-ok/50" : "border-danger/50"
        }`}
      >
        <p className="text-sm text-muted">Score d'examen (100–900)</p>
        <div className={`my-2 text-5xl font-black ${resultat.reussi ? "text-ok" : "text-danger"}`}>
          {resultat.score}
        </div>
        <p className="font-semibold">
          {resultat.reussi ? "✓ Reussi (seuil 750)" : "✗ Echoue (seuil 750)"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {resultat.corrects} / {resultat.total} correctes · {min}:{String(sec).padStart(2, "0")}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Revue par domaine</h2>
        <div className="space-y-3">
          {resultat.repartition
            .filter((r) => r.total > 0)
            .map((r) => {
              const taux = r.total ? Math.round((r.corrects / r.total) * 100) : 0;
              return (
                <div key={r.domaine} className="card">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      D{r.domaine} · {DOMAINES[r.domaine]!.court}
                    </span>
                    <span className="text-sm text-muted">
                      {r.corrects}/{r.total} · {taux} %
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${taux}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/examen" className="btn-brand">
          Refaire un examen
        </Link>
        <button onClick={() => router.push("/")} className="btn-ghost">
          Tableau de bord
        </button>
      </div>
    </div>
  );
}

function Stat({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-bold">{valeur}</div>
      <div className="mt-1 text-xs text-muted">{libelle}</div>
    </div>
  );
}
