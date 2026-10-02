"use client";

import type { Correction, QuestionClient, ReponseUtilisateur, TypeQuestion } from "@/lib/quiz-api";

const CHOIX_UNIQUE: TypeQuestion[] = ["qcm", "scenario", "urgence", "plan_reprise"];

/** Etat de reponse controle (independant du type a l'exterieur). */
export type Answer =
  | { kind: "choix"; index: number | null }
  | { kind: "multi"; indices: number[] }
  | { kind: "vf"; valeur: boolean | null }
  | { kind: "libre"; texte: string }
  | { kind: "ordre"; ordre: { i: number; texte: string }[] }
  | { kind: "assoc"; valeurs: string[] }
  | { kind: "cas"; choix: (number | null)[] };

export function answerInitial(q: QuestionClient): Answer {
  if (CHOIX_UNIQUE.includes(q.type)) return { kind: "choix", index: null };
  switch (q.type) {
    case "qcm_multiple":
      return { kind: "multi", indices: [] };
    case "vf":
      return { kind: "vf", valeur: null };
    case "libre":
      return { kind: "libre", texte: "" };
    case "ordonnancement":
      return { kind: "ordre", ordre: q.elements ?? [] };
    case "appariement":
      return { kind: "assoc", valeurs: (q.gauches ?? []).map(() => "") };
    case "cas_complexe":
      return { kind: "cas", choix: (q.etapes ?? []).map(() => null) };
    default:
      return { kind: "choix", index: null };
  }
}

export function answerPrete(a: Answer): boolean {
  switch (a.kind) {
    case "choix":
      return a.index !== null;
    case "multi":
      return a.indices.length > 0;
    case "vf":
      return a.valeur !== null;
    case "libre":
      return a.texte.trim().length > 0;
    case "ordre":
      return true;
    case "assoc":
      return a.valeurs.every((v) => v !== "");
    case "cas":
      return a.choix.every((c) => c !== null);
  }
}

export function answerVersReponse(
  q: QuestionClient,
  a: Answer,
): ReponseUtilisateur | null {
  if (a.kind === "choix" && a.index !== null)
    return { type: q.type as "qcm", index: a.index };
  if (a.kind === "multi") return { type: "qcm_multiple", indices: a.indices };
  if (a.kind === "vf" && a.valeur !== null) return { type: "vf", valeur: a.valeur };
  if (a.kind === "libre") return { type: "libre", texte: a.texte };
  if (a.kind === "ordre") return { type: "ordonnancement", ordre: a.ordre.map((e) => e.i) };
  if (a.kind === "assoc") return { type: "appariement", associations: a.valeurs };
  if (a.kind === "cas") return { type: "cas_complexe", choix: a.choix.map((c) => c ?? -1) };
  return null;
}

/** Composant de saisie controle, reutilise par le quiz et l'examen. */
export function QuestionInputs({
  question,
  value,
  onChange,
  correction,
}: {
  question: QuestionClient;
  value: Answer;
  onChange: (a: Answer) => void;
  correction?: Correction | null;
}) {
  const fige = correction != null;
  const t = question.type;

  if (CHOIX_UNIQUE.includes(t) && value.kind === "choix") {
    return (
      <div className="space-y-2">
        {question.options!.map((opt, i) => (
          <OptionBouton
            key={i}
            label={opt}
            etat={
              fige
                ? i === correction?.bonneReponseIndex
                  ? "bon"
                  : value.index === i
                    ? "mauvais"
                    : "neutre"
                : value.index === i
                  ? "selection"
                  : "neutre"
            }
            disabled={fige}
            onClick={() => onChange({ kind: "choix", index: i })}
          />
        ))}
      </div>
    );
  }

  if (t === "qcm_multiple" && value.kind === "multi") {
    return (
      <div className="space-y-2">
        {question.options!.map((opt, i) => {
          const checked = value.indices.includes(i);
          const bon = correction?.bonnesReponsesIndices?.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={fige}
              onClick={() =>
                onChange({
                  kind: "multi",
                  indices: checked
                    ? value.indices.filter((x) => x !== i)
                    : [...value.indices, i],
                })
              }
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                fige
                  ? bon
                    ? "border-ok bg-ok/15"
                    : checked
                      ? "border-danger bg-danger/15"
                      : "border-border bg-surface-2"
                  : checked
                    ? "border-brand bg-brand/15"
                    : "border-border bg-surface-2 hover:border-muted"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                  checked ? "border-brand bg-brand text-brand-fg" : "border-muted"
                }`}
              >
                {checked ? "✓" : ""}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (t === "vf" && value.kind === "vf") {
    return (
      <div className="flex gap-3">
        {[
          { v: true, l: "Vrai" },
          { v: false, l: "Faux" },
        ].map(({ v, l }) => (
          <OptionBouton
            key={l}
            label={l}
            etat={
              fige
                ? correction?.bonneReponseVf === v
                  ? "bon"
                  : value.valeur === v
                    ? "mauvais"
                    : "neutre"
                : value.valeur === v
                  ? "selection"
                  : "neutre"
            }
            disabled={fige}
            onClick={() => onChange({ kind: "vf", valeur: v })}
            className="flex-1"
          />
        ))}
      </div>
    );
  }

  if (t === "libre" && value.kind === "libre") {
    return (
      <textarea
        className="input min-h-32 resize-y"
        placeholder="Redige ta reponse…"
        value={value.texte}
        onChange={(e) => onChange({ kind: "libre", texte: e.target.value })}
        disabled={fige}
      />
    );
  }

  if (t === "ordonnancement" && value.kind === "ordre") {
    const bouger = (pos: number, dir: -1 | 1) => {
      const cible = pos + dir;
      if (cible < 0 || cible >= value.ordre.length) return;
      const copie = [...value.ordre];
      [copie[pos], copie[cible]] = [copie[cible]!, copie[pos]!];
      onChange({ kind: "ordre", ordre: copie });
    };
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {value.ordre.map((e, pos) => (
            <div
              key={e.i}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-surface font-semibold">
                {pos + 1}
              </span>
              <span className="flex-1">{e.texte}</span>
              {!fige && (
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => bouger(pos, -1)}
                    className="rounded-lg border border-border px-2 py-0.5 hover:bg-surface"
                    aria-label="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => bouger(pos, 1)}
                    className="rounded-lg border border-border px-2 py-0.5 hover:bg-surface"
                    aria-label="Descendre"
                  >
                    ↓
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
        {fige && correction?.bonOrdre && (
          <p className="rounded-xl border border-ok/40 bg-ok/10 px-3 py-2 text-sm">
            Bon ordre :{" "}
            {correction.bonOrdre.map((e, k) => `${k + 1}. ${e.texte}`).join("  ·  ")}
          </p>
        )}
      </div>
    );
  }

  if (t === "appariement" && value.kind === "assoc") {
    return (
      <div className="space-y-2">
        {question.gauches!.map((g, i) => {
          const bonne = correction?.bonnesAssociations?.find((b) => b.gauche === g)?.droite;
          const juste = fige && value.valeurs[i] === bonne;
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-40 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2">
                {g}
              </span>
              <span className="text-muted">→</span>
              <select
                className={`input flex-1 ${fige ? (juste ? "border-ok" : "border-danger") : ""}`}
                value={value.valeurs[i]}
                disabled={fige}
                onChange={(e) => {
                  const copie = [...value.valeurs];
                  copie[i] = e.target.value;
                  onChange({ kind: "assoc", valeurs: copie });
                }}
              >
                <option value="">— choisir —</option>
                {question.droites!.map((d, k) => (
                  <option key={k} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {fige && !juste && bonne && (
                <span className="w-full text-xs text-ok">Bonne reponse : {bonne}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (t === "cas_complexe" && value.kind === "cas") {
    return (
      <div className="space-y-5">
        {question.etapes!.map((e, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-surface-2 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="chip">Etape {idx + 1}</span>
              <span className="font-semibold">{e.titre}</span>
              {fige && correction?.etapesCorrectes && (
                <span className={correction.etapesCorrectes[idx] ? "text-ok" : "text-danger"}>
                  {correction.etapesCorrectes[idx] ? "✓" : "✗"}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm">{e.enonce}</p>
            <div className="space-y-2">
              {e.options.map((opt, oi) => (
                <OptionBouton
                  key={oi}
                  label={opt}
                  etat={
                    fige
                      ? oi === correction?.bonnesReponsesEtapes?.[idx]
                        ? "bon"
                        : value.choix[idx] === oi
                          ? "mauvais"
                          : "neutre"
                      : value.choix[idx] === oi
                        ? "selection"
                        : "neutre"
                  }
                  disabled={fige}
                  onClick={() => {
                    const copie = [...value.choix];
                    copie[idx] = oi;
                    onChange({ kind: "cas", choix: copie });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function OptionBouton({
  label,
  etat,
  disabled,
  onClick,
  className = "",
}: {
  label: string;
  etat: "neutre" | "selection" | "bon" | "mauvais";
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  const style =
    etat === "bon"
      ? "border-ok bg-ok/15"
      : etat === "mauvais"
        ? "border-danger bg-danger/15"
        : etat === "selection"
          ? "border-brand bg-brand/15"
          : "border-border bg-surface-2 hover:border-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-default ${style} ${className}`}
    >
      {label}
    </button>
  );
}
