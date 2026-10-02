"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { LIBELLE_CRITERE, type SortieIA } from "@/lib/rapport-types";

interface Correction {
  id: string;
  mode: string;
  creeLe: string;
  sortie: SortieIA;
}
interface Version {
  id: string;
  creeLe: string;
  contenu: string;
}

type Statut = "enregistre" | "modifie" | "enregistrement";

export function RapportEditeur({
  id,
  titre,
  contenuInitial,
  scenario,
  versions: versionsInitiales,
  correctionsInitiales,
}: {
  id: string;
  titre: string;
  contenuInitial: string;
  scenario: { titre: string; contexte: string } | null;
  versions: Version[];
  correctionsInitiales: Correction[];
}) {
  const [contenu, setContenu] = useState(contenuInitial);
  const [statut, setStatut] = useState<Statut>("enregistre");
  const [onglet, setOnglet] = useState<"edition" | "apercu">("edition");
  const [versions, setVersions] = useState<Version[]>(versionsInitiales);
  const [corrections, setCorrections] = useState<Correction[]>(correctionsInitiales);
  const [mode, setMode] = useState<"coach" | "correcteur">("coach");
  const [analyse, setAnalyse] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enregistrement automatique (debounce).
  const sauver = useCallback(
    async (texte: string) => {
      setStatut("enregistrement");
      try {
        await fetch(`/api/rapports/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contenu: texte }),
        });
        setStatut("enregistre");
      } catch {
        setStatut("modifie");
      }
    },
    [id],
  );

  function onChange(v: string) {
    setContenu(v);
    setStatut("modifie");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void sauver(v), 1200);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const apercu = useMemo(() => {
    const brut = marked.parse(contenu, { async: false }) as string;
    return DOMPurify.sanitize(brut);
  }, [contenu]);

  async function enregistrerVersion() {
    const res = await fetch(`/api/rapports/${id}/version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu }),
    });
    const data = await res.json();
    if (res.ok) {
      setVersions((v) => [{ id: data.versionId, creeLe: data.creeLe, contenu }, ...v]);
      setStatut("enregistre");
    }
  }

  async function analyser() {
    setErreur(null);
    setAnalyse(true);
    try {
      // On s'assure que le contenu courant est enregistre avant l'analyse.
      await sauver(contenu);
      const res = await fetch(`/api/rapports/${id}/corriger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.erreur ?? "Analyse impossible.");
        return;
      }
      setCorrections((c) => [
        { id: crypto.randomUUID(), mode, creeLe: new Date().toISOString(), sortie: data.sortie },
        ...c,
      ]);
    } catch {
      setErreur("Erreur reseau.");
    } finally {
      setAnalyse(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/rapports" className="text-sm text-muted hover:text-text">
            ← Rapports
          </Link>
          <h1 className="text-xl font-bold">{titre}</h1>
        </div>
        <div className="flex items-center gap-3">
          <StatutBadge statut={statut} />
          <button onClick={enregistrerVersion} className="btn-ghost text-xs">
            Enregistrer une version
          </button>
        </div>
      </div>

      {scenario && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Scenario : {scenario.titre}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{scenario.contexte}</p>
        </details>
      )}

      {/* Onglets edition / apercu (mobile) */}
      <div className="flex gap-2 lg:hidden">
        <Onglet actif={onglet === "edition"} onClick={() => setOnglet("edition")}>
          Edition
        </Onglet>
        <Onglet actif={onglet === "apercu"} onClick={() => setOnglet("apercu")}>
          Apercu
        </Onglet>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={onglet === "edition" ? "" : "hidden lg:block"}>
          <textarea
            value={contenu}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            className="input min-h-[28rem] w-full resize-y font-mono text-sm leading-relaxed"
          />
        </div>
        <div className={onglet === "apercu" ? "" : "hidden lg:block"}>
          <div
            className="prose-secprep card min-h-[28rem] overflow-auto"
            dangerouslySetInnerHTML={{ __html: apercu }}
          />
        </div>
      </div>

      {/* Analyse IA */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Analyse IA</h2>
          <div className="flex items-center gap-2">
            <ModeBouton actif={mode === "coach"} onClick={() => setMode("coach")}>
              Coach
            </ModeBouton>
            <ModeBouton actif={mode === "correcteur"} onClick={() => setMode("correcteur")}>
              Correcteur
            </ModeBouton>
            <button onClick={analyser} disabled={analyse} className="btn-brand">
              {analyse ? "Analyse…" : "Analyser"}
            </button>
          </div>
        </div>
        <p className="text-sm text-muted">
          {mode === "coach"
            ? "Le Coach pose des questions et signale ce qui manque, sans reecrire ton rapport."
            : "Le Correcteur note chaque critere et donne une note globale."}
        </p>
        {erreur && (
          <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">{erreur}</p>
        )}
      </section>

      {/* Resultats */}
      {corrections.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Retours</h2>
          {corrections.map((c) => (
            <CarteCorrection key={c.id} correction={c} />
          ))}
        </section>
      )}

      {/* Historique des versions */}
      {versions.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Historique des versions</h2>
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm"
              >
                <span className="text-muted">
                  {new Date(v.creeLe).toLocaleString("fr-CA")}
                </span>
                <button
                  onClick={() => {
                    setContenu(v.contenu);
                    setStatut("modifie");
                    if (timer.current) clearTimeout(timer.current);
                    timer.current = setTimeout(() => void sauver(v.contenu), 400);
                  }}
                  className="btn-ghost text-xs"
                >
                  Restaurer
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatutBadge({ statut }: { statut: Statut }) {
  const txt =
    statut === "enregistre" ? "✓ Enregistre" : statut === "enregistrement" ? "Enregistrement…" : "Modifie";
  const cls = statut === "enregistre" ? "text-ok" : "text-muted";
  return <span className={`text-xs ${cls}`}>{txt}</span>;
}

function Onglet({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        actif ? "bg-surface-2 text-text" : "text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function ModeBouton({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        actif ? "border-brand bg-brand/15 text-text" : "border-border bg-surface-2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Liste({ titre, items }: { titre: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="font-medium">{titre}</p>
      <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function CarteCorrection({ correction }: { correction: Correction }) {
  const s = correction.sortie;
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <span className="chip">{s.mode === "coach" ? "Coach" : "Correcteur"}</span>
        <span className="text-xs text-muted">
          {new Date(correction.creeLe).toLocaleString("fr-CA")}
        </span>
      </div>

      {s.mode === "coach" ? (
        <>
          <p className="text-sm">{s.resume}</p>
          <Liste titre="Elements manquants" items={s.elementsManquants} />
          <Liste titre="Questions a te poser" items={s.questions} />
          <Liste titre="Pistes de methode" items={s.pistesMethodo} />
          <AffirmationsNonAppuyees items={s.affirmationsNonAppuyees} />
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black">{s.noteGlobale}/100</div>
            <p className="text-sm text-muted">{s.syntheseFinale}</p>
          </div>
          <div className="space-y-2">
            {s.criteres.map((c, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{LIBELLE_CRITERE[c.critere] ?? c.critere}</span>
                  <span className="text-muted">{c.note}/20</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.note / 20) * 100}%` }} />
                </div>
                <p className="mt-1 text-muted">{c.commentaire}</p>
              </div>
            ))}
          </div>
          <Liste titre="Points forts" items={s.pointsForts} />
          <Liste titre="Erreurs" items={s.erreurs} />
          <Liste titre="Elements manquants" items={s.elementsManquants} />
          <AffirmationsNonAppuyees items={s.affirmationsNonAppuyees} />
        </>
      )}
    </div>
  );
}

function AffirmationsNonAppuyees({
  items,
}: {
  items: { affirmation: string; pourquoi: string }[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-danger">Affirmations non appuyees par les faits</p>
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((a, i) => (
          <li key={i} className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">
            <span className="font-medium">{a.affirmation}</span>
            <span className="text-muted"> — {a.pourquoi}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
