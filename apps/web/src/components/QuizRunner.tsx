"use client";

import { useEffect, useRef, useState } from "react";
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
import type {
  Correction,
  Difficulte,
  QuestionClient,
  TypeQuestion,
} from "@/lib/quiz-api";

interface ResultatItem {
  question: QuestionClient;
  correction: Correction;
}

export function QuizRunner(props: {
  domaine?: number;
  difficulte?: Difficulte;
  nombre: number;
  ids?: string[];
  types?: TypeQuestion[];
  chrono?: boolean;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionClient[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [resultats, setResultats] = useState<ResultatItem[]>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch("/api/quiz/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domaine: props.domaine,
            difficulte: props.difficulte,
            nombre: props.nombre,
            ids: props.ids,
            types: props.types,
          }),
        });
        const data = await res.json();
        if (annule) return;
        if (!res.ok) return setErreur(data.erreur ?? "Erreur au demarrage.");
        setQuestions(data.questions);
      } catch {
        if (!annule) setErreur("Erreur reseau.");
      }
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (erreur) {
    return (
      <div className="card">
        <p className="text-danger">{erreur}</p>
        <Link href="/quiz" className="btn-ghost mt-4">
          Retour
        </Link>
      </div>
    );
  }
  if (!questions) return <p className="text-muted">Preparation des questions…</p>;
  if (questions.length === 0) {
    return (
      <div className="card">
        <p>Aucune question ne correspond a ces criteres.</p>
        <Link href="/quiz" className="btn-ghost mt-4">
          Changer les criteres
        </Link>
      </div>
    );
  }
  if (index >= questions.length) {
    return <Resultats resultats={resultats} router={router} />;
  }

  const q = questions[index]!;
  return (
    <QuestionView
      key={q.id}
      question={q}
      numero={index + 1}
      total={questions.length}
      chrono={props.chrono ?? false}
      onCorrige={(correction) => setResultats((r) => [...r, { question: q, correction }])}
      onSuivant={() => setIndex((i) => i + 1)}
    />
  );
}

function QuestionView({
  question,
  numero,
  total,
  chrono,
  onCorrige,
  onSuivant,
}: {
  question: QuestionClient;
  numero: number;
  total: number;
  chrono: boolean;
  onCorrige: (c: Correction) => void;
  onSuivant: () => void;
}) {
  const [answer, setAnswer] = useState<Answer>(() => answerInitial(question));
  const [indiceVisible, setIndiceVisible] = useState(false);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [reste, setReste] = useState(question.tempsSec);
  const correctionRef = useRef<Correction | null>(null);
  correctionRef.current = correction;
  const meta = DOMAINES[question.domaine]!;

  async function envoyer(body: Record<string, unknown>) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: Correction = await res.json();
      if (res.ok) {
        setCorrection(data);
        onCorrige(data);
      }
    } finally {
      setEnvoi(false);
    }
  }

  async function valider() {
    const reponse = answerVersReponse(question, answer);
    if (!reponse) return;
    await envoyer({ questionId: question.id, reponse, indiceUtilise: indiceVisible });
  }

  useEffect(() => {
    if (!chrono || correction !== null) return;
    if (reste <= 0) {
      if (correctionRef.current === null) {
        void envoyer({ questionId: question.id, indiceUtilise: indiceVisible, abandon: true });
      }
      return;
    }
    const id = setTimeout(() => setReste((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reste, chrono, correction]);

  const presqueFini = chrono && reste <= 10;
  const peutValider = correction === null && answerPrete(answer);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>Question {numero} / {total}</span>
          <span className="flex items-center gap-2">
            <span className="chip">D{question.domaine}</span>
            <span className="chip">{LIBELLE_TYPE[question.type]}</span>
            <span className="chip">{question.difficulte}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-brand transition-all" style={{ width: `${(numero / total) * 100}%` }} />
        </div>
      </div>

      {chrono && correction === null && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2 text-sm font-semibold ${
            presqueFini ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-surface-2 text-muted"
          }`}
        >
          <span>⏱ Temps restant</span>
          <span>{reste}s</span>
        </div>
      )}

      <div className="card space-y-5">
        <h2 className="text-lg font-semibold leading-snug">{question.enonce}</h2>

        <QuestionInputs
          question={question}
          value={answer}
          onChange={setAnswer}
          correction={correction}
        />

        {question.indice && correction === null && (
          <div>
            {indiceVisible ? (
              <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
                💡 {question.indice} <span className="text-muted">(−50 % sur cette question)</span>
              </p>
            ) : (
              <button
                onClick={() => setIndiceVisible(true)}
                className="text-sm font-medium text-warn hover:underline"
              >
                Afficher un indice (−50 %)
              </button>
            )}
          </div>
        )}

        {correction === null ? (
          <button onClick={valider} disabled={!peutValider || envoi} className="btn-brand w-full">
            {envoi ? "Correction…" : "Valider"}
          </button>
        ) : (
          <FeedbackCorrection correction={correction} type={question.type} />
        )}
      </div>

      {correction !== null && (
        <button onClick={onSuivant} className="btn-brand w-full">
          {numero < total ? "Question suivante" : "Voir les resultats"}
        </button>
      )}

      <p className="text-center text-xs text-muted">{meta.long} · objectif SY0-701</p>
    </div>
  );
}

export function FeedbackCorrection({
  correction,
  type,
}: {
  correction: Correction;
  type: string;
}) {
  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border px-4 py-3 ${
          correction.correct ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
        }`}
      >
        <div className="flex items-center justify-between font-semibold">
          <span>{correction.correct ? "✓ Correct" : "✗ A revoir"}</span>
          <span>+{correction.pointsGagnes} / {correction.pointsMax} pts</span>
        </div>
        {correction.totalElements != null && (
          <p className="mt-1 text-sm">
            {correction.bonsElements} / {correction.totalElements} elements corrects
          </p>
        )}
      </div>

      {type === "libre" && correction.detailLibre && (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p className="font-medium">
            {correction.detailLibre.groupesTrouves} / {correction.detailLibre.groupesTotal} notions clefs trouvees
          </p>
          {correction.detailLibre.groupesManques.length > 0 && correction.motsClesLibre && (
            <p className="mt-1 text-muted">
              Manquait :{" "}
              {correction.detailLibre.groupesManques
                .map((i) => correction.motsClesLibre![i]![0])
                .join(", ")}
            </p>
          )}
          {correction.modeleLibre && (
            <details className="mt-2">
              <summary className="cursor-pointer text-brand">Voir la reponse modele</summary>
              <p className="mt-1 text-text">{correction.modeleLibre}</p>
            </details>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
        <p>
          <span className="font-medium text-muted">Explication — </span>
          {correction.explication}
        </p>
        {correction.astuce && (
          <p className="mt-2">
            <span className="font-medium text-muted">Astuce — </span>
            {correction.astuce}
          </p>
        )}
      </div>
    </div>
  );
}

function Resultats({
  resultats,
  router,
}: {
  resultats: ResultatItem[];
  router: ReturnType<typeof useRouter>;
}) {
  const totalPts = resultats.reduce((s, r) => s + r.correction.pointsGagnes, 0);
  const maxPts = resultats.reduce((s, r) => s + r.correction.pointsMax, 0);
  const corrects = resultats.filter((r) => r.correction.correct).length;
  const erreurs = resultats.filter((r) => !r.correction.correct);
  const taux = resultats.length ? Math.round((corrects / resultats.length) * 100) : 0;

  function refaireErreurs() {
    const ids = erreurs.map((r) => r.question.id).join(",");
    router.push(`/quiz/session?ids=${ids}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card text-center">
        <p className="text-sm text-muted">Resultat de la session</p>
        <div className="my-2 text-4xl font-black">{taux} %</div>
        <p className="text-muted">
          {corrects} / {resultats.length} questions · {totalPts} / {maxPts} points
        </p>
      </div>

      <div className="space-y-2">
        {resultats.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className={r.correction.correct ? "text-ok" : "text-danger"}>
                {r.correction.correct ? "✓" : "✗"}
              </span>
              <span className="line-clamp-1">{r.question.enonce}</span>
            </span>
            <span className="shrink-0 text-muted">+{r.correction.pointsGagnes}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {erreurs.length > 0 && (
          <button onClick={refaireErreurs} className="btn-brand">
            Refaire les {erreurs.length} erreur(s)
          </button>
        )}
        <Link href="/quiz" className="btn-ghost">
          Nouveau quiz
        </Link>
        <Link href="/" className="btn-ghost">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}
