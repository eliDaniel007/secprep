"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DOMAINES, LIBELLE_TYPE } from "@/lib/domaines";
import type {
  Correction,
  Difficulte,
  QuestionClient,
  ReponseUtilisateur,
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
          }),
        });
        const data = await res.json();
        if (annule) return;
        if (!res.ok) {
          setErreur(data.erreur ?? "Erreur au demarrage.");
          return;
        }
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

  if (!questions) {
    return <p className="text-muted">Preparation des questions…</p>;
  }

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

  // Ecran de resultats.
  if (index >= questions.length) {
    return <Resultats resultats={resultats} router={router} />;
  }

  const q = questions[index]!;

  function onCorrige(correction: Correction) {
    setResultats((r) => [...r, { question: q, correction }]);
  }

  return (
    <QuestionView
      key={q.id}
      question={q}
      numero={index + 1}
      total={questions.length}
      onCorrige={onCorrige}
      onSuivant={() => setIndex((i) => i + 1)}
    />
  );
}

/* ---------------- Une question ---------------- */

function QuestionView({
  question,
  numero,
  total,
  onCorrige,
  onSuivant,
}: {
  question: QuestionClient;
  numero: number;
  total: number;
  onCorrige: (c: Correction) => void;
  onSuivant: () => void;
}) {
  const [indiceVisible, setIndiceVisible] = useState(false);
  const [choix, setChoix] = useState<number | null>(null);
  const [vf, setVf] = useState<boolean | null>(null);
  const [texte, setTexte] = useState("");
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const meta = DOMAINES[question.domaine]!;

  const peutValider =
    correction === null &&
    ((question.type === "qcm" && choix !== null) ||
      (question.type === "vf" && vf !== null) ||
      (question.type === "libre" && texte.trim().length > 0));

  async function valider() {
    if (!peutValider) return;
    let reponse: ReponseUtilisateur;
    if (question.type === "qcm") reponse = { type: "qcm", index: choix! };
    else if (question.type === "vf") reponse = { type: "vf", valeur: vf! };
    else reponse = { type: "libre", texte };

    setEnvoi(true);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          reponse,
          indiceUtilise: indiceVisible,
        }),
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

  return (
    <div className="space-y-5">
      {/* Progression */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>
            Question {numero} / {total}
          </span>
          <span className="flex items-center gap-2">
            <span className="chip">D{question.domaine}</span>
            <span className="chip">{LIBELLE_TYPE[question.type]}</span>
            <span className="chip">{question.difficulte}</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${(numero / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="card space-y-5">
        <h2 className="text-lg font-semibold leading-snug">{question.enonce}</h2>

        {/* Saisie selon le type */}
        {question.type === "qcm" && (
          <div className="space-y-2">
            {question.options!.map((opt, i) => (
              <OptionChoix
                key={i}
                label={opt}
                selectionne={choix === i}
                etat={
                  correction
                    ? i === correction.bonneReponseQcm
                      ? "bon"
                      : choix === i
                        ? "mauvais"
                        : "neutre"
                    : "neutre"
                }
                disabled={correction !== null}
                onClick={() => setChoix(i)}
              />
            ))}
          </div>
        )}

        {question.type === "vf" && (
          <div className="flex gap-3">
            {[
              { v: true, l: "Vrai" },
              { v: false, l: "Faux" },
            ].map(({ v, l }) => (
              <OptionChoix
                key={l}
                label={l}
                selectionne={vf === v}
                etat={
                  correction
                    ? correction.bonneReponseVf === v
                      ? "bon"
                      : vf === v
                        ? "mauvais"
                        : "neutre"
                    : "neutre"
                }
                disabled={correction !== null}
                onClick={() => setVf(v)}
                className="flex-1"
              />
            ))}
          </div>
        )}

        {question.type === "libre" && (
          <textarea
            className="input min-h-32 resize-y"
            placeholder="Redige ta reponse…"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            disabled={correction !== null}
          />
        )}

        {/* Indice */}
        {question.indice && correction === null && (
          <div>
            {indiceVisible ? (
              <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
                💡 {question.indice}{" "}
                <span className="text-muted">(−50 % sur cette question)</span>
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

        {/* Action */}
        {correction === null ? (
          <button
            onClick={valider}
            disabled={!peutValider || envoi}
            className="btn-brand w-full"
          >
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

      <p className="text-center text-xs text-muted">
        {meta.long} · objectif SY0-701
      </p>
    </div>
  );
}

function OptionChoix({
  label,
  selectionne,
  etat,
  disabled,
  onClick,
  className = "",
}: {
  label: string;
  selectionne: boolean;
  etat: "neutre" | "bon" | "mauvais";
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  const styleEtat =
    etat === "bon"
      ? "border-ok bg-ok/15"
      : etat === "mauvais"
        ? "border-danger bg-danger/15"
        : selectionne
          ? "border-brand bg-brand/15"
          : "border-border bg-surface-2 hover:border-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default ${styleEtat} ${className}`}
    >
      {label}
    </button>
  );
}

function FeedbackCorrection({
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
          correction.correct
            ? "border-ok/40 bg-ok/10 text-ok"
            : "border-danger/40 bg-danger/10 text-danger"
        }`}
      >
        <div className="flex items-center justify-between font-semibold">
          <span>{correction.correct ? "✓ Correct" : "✗ A revoir"}</span>
          <span>
            +{correction.pointsGagnes} / {correction.pointsMax} pts
          </span>
        </div>
      </div>

      {type === "libre" && correction.detailLibre && (
        <div className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
          <p className="font-medium">
            {correction.detailLibre.groupesTrouves} /{" "}
            {correction.detailLibre.groupesTotal} notions clefs trouvees
          </p>
          {correction.detailLibre.groupesManques.length > 0 &&
            correction.motsClesLibre && (
              <p className="mt-1 text-muted">
                Manquait :{" "}
                {correction.detailLibre.groupesManques
                  .map((i) => correction.motsClesLibre![i]![0])
                  .join(", ")}
              </p>
            )}
          {correction.modeleLibre && (
            <details className="mt-2">
              <summary className="cursor-pointer text-brand">
                Voir la reponse modele
              </summary>
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

/* ---------------- Resultats ---------------- */

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
              <span
                className={r.correction.correct ? "text-ok" : "text-danger"}
              >
                {r.correction.correct ? "✓" : "✗"}
              </span>
              <span className="line-clamp-1">{r.question.enonce}</span>
            </span>
            <span className="shrink-0 text-muted">
              +{r.correction.pointsGagnes}
            </span>
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
