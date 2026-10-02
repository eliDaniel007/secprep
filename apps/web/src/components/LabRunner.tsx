"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface LaboInfo {
  slug: string;
  titre: string;
  intro: string;
  consigne: string;
  indice: string;
  outils: string[];
  objectifSy0701: string;
}

type Ligne = { type: "cmd" | "out" | "err" | "sys"; texte: string };
type Etat = "demarrage" | "pret" | "docker_indispo" | "erreur";

export function LabRunner({ labo }: { labo: LaboInfo }) {
  const [etat, setEtat] = useState<Etat>("demarrage");
  const [messageErreur, setMessageErreur] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [commande, setCommande] = useState("");
  const [histo, setHisto] = useState<string[]>([]);
  const [histoIdx, setHistoIdx] = useState(-1);
  const [occupe, setOccupe] = useState(false);
  const [indiceVisible, setIndiceVisible] = useState(false);
  const [validation, setValidation] = useState<{ reussi: boolean; explication: string | null } | null>(null);
  const [validationEnCours, setValidationEnCours] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement | null>(null);

  async function demarrer() {
    setEtat("demarrage");
    setMessageErreur("");
    try {
      const res = await fetch("/api/sandbox/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laboSlug: labo.slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionId(data.sessionId);
        sessionRef.current = data.sessionId;
        setEtat("pret");
        setLignes([
          { type: "sys", texte: "Conteneur isole demarre (reseau desactive, /work en lecture/ecriture)." },
          { type: "sys", texte: "Tape tes commandes ci-dessous, puis clique « Valider » quand tu penses avoir reussi." },
        ]);
      } else if (data.code === "DOCKER_INDISPONIBLE") {
        setEtat("docker_indispo");
        setMessageErreur(data.erreur);
      } else {
        setEtat("erreur");
        setMessageErreur(data.erreur ?? "Erreur inconnue.");
      }
    } catch {
      setEtat("erreur");
      setMessageErreur("Erreur reseau.");
    }
  }

  useEffect(() => {
    void demarrer();
    return () => {
      const id = sessionRef.current;
      if (id) {
        fetch("/api/sandbox/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lignes]);

  async function lancerCommande() {
    const cmd = commande.trim();
    if (!cmd || !sessionId || occupe) return;
    setLignes((l) => [...l, { type: "cmd", texte: cmd }]);
    setHisto((h) => [...h, cmd]);
    setHistoIdx(-1);
    setCommande("");
    setOccupe(true);
    try {
      const res = await fetch("/api/sandbox/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, commande: cmd }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.stdout) setLignes((l) => [...l, { type: "out", texte: data.stdout.replace(/\n$/, "") }]);
        if (data.stderr) setLignes((l) => [...l, { type: "err", texte: data.stderr.replace(/\n$/, "") }]);
        if (!data.stdout && !data.stderr) setLignes((l) => [...l, { type: "out", texte: "" }]);
      } else {
        setLignes((l) => [...l, { type: "err", texte: data.erreur ?? "Erreur." }]);
      }
    } catch {
      setLignes((l) => [...l, { type: "err", texte: "Erreur reseau." }]);
    } finally {
      setOccupe(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      void lancerCommande();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (histo.length === 0) return;
      const idx = histoIdx === -1 ? histo.length - 1 : Math.max(0, histoIdx - 1);
      setHistoIdx(idx);
      setCommande(histo[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histoIdx === -1) return;
      const idx = histoIdx + 1;
      if (idx >= histo.length) {
        setHistoIdx(-1);
        setCommande("");
      } else {
        setHistoIdx(idx);
        setCommande(histo[idx] ?? "");
      }
    }
  }

  async function valider() {
    if (!sessionId) return;
    setValidationEnCours(true);
    setValidation(null);
    try {
      const res = await fetch("/api/labs/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, laboSlug: labo.slug }),
      });
      const data = await res.json();
      if (res.ok) setValidation({ reussi: data.reussi, explication: data.explication });
    } finally {
      setValidationEnCours(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/labs" className="text-sm text-muted hover:text-text">
          ← Labos
        </Link>
        <h1 className="text-xl font-bold">{labo.titre}</h1>
        <p className="text-xs text-muted">objectif SY0-701 {labo.objectifSy0701}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Consigne */}
        <div className="space-y-3">
          <div className="card space-y-3">
            <p className="text-sm text-muted">{labo.intro}</p>
            <p className="font-medium">{labo.consigne}</p>
            <div className="flex flex-wrap gap-1.5">
              {labo.outils.map((o) => (
                <span key={o} className="chip font-mono">{o}</span>
              ))}
            </div>
            {indiceVisible ? (
              <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-sm">
                💡 {labo.indice}
              </p>
            ) : (
              <button onClick={() => setIndiceVisible(true)} className="text-sm font-medium text-warn hover:underline">
                Afficher l'indice
              </button>
            )}
          </div>

          <div className="card space-y-3">
            <button
              onClick={valider}
              disabled={etat !== "pret" || validationEnCours}
              className="btn-brand w-full"
            >
              {validationEnCours ? "Verification…" : "Valider"}
            </button>
            {validation && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  validation.reussi
                    ? "border-ok/40 bg-ok/10 text-ok"
                    : "border-danger/40 bg-danger/10 text-danger"
                }`}
              >
                {validation.reussi ? "✓ Reussi !" : "✗ Pas encore — reessaie."}
                {validation.explication && (
                  <p className="mt-1 text-text">{validation.explication}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Terminal */}
        <div>
          {etat === "docker_indispo" ? (
            <div className="card space-y-3">
              <p className="font-semibold text-warn">Terminal indisponible</p>
              <p className="text-sm text-muted">{messageErreur}</p>
              <button onClick={demarrer} className="btn-ghost">
                Reessayer
              </button>
            </div>
          ) : etat === "erreur" ? (
            <div className="card space-y-3">
              <p className="text-danger">{messageErreur}</p>
              <button onClick={demarrer} className="btn-ghost">
                Reessayer
              </button>
            </div>
          ) : (
            <div className="flex h-[28rem] flex-col overflow-hidden rounded-xl border border-border bg-[#0b1020] font-mono text-sm">
              <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-1.5 text-xs text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
                <span className="ml-2">sandbox — /work {etat === "demarrage" && "(demarrage…)"}</span>
              </div>
              <div className="flex-1 overflow-auto p-3 leading-relaxed">
                {lignes.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.type === "cmd"
                        ? "text-brand"
                        : l.type === "err"
                          ? "text-danger"
                          : l.type === "sys"
                            ? "text-muted"
                            : "text-text"
                    }
                  >
                    {l.type === "cmd" ? (
                      <span>
                        <span className="text-ok">$ </span>
                        {l.texte}
                      </span>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-mono">{l.texte}</pre>
                    )}
                  </div>
                ))}
                <div ref={finRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                <span className="text-ok">$</span>
                <input
                  value={commande}
                  onChange={(e) => setCommande(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={etat !== "pret" || occupe}
                  autoFocus
                  spellCheck={false}
                  className="flex-1 bg-transparent text-text outline-none placeholder:text-muted"
                  placeholder={etat === "pret" ? "ex. ls -l /work" : "demarrage du conteneur…"}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
