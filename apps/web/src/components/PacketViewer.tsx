"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { statsProtocoles, conversations, suivreFlux, type Paquet } from "@secprep/packgen";

interface ExerciceClient {
  id: string;
  question: string;
  indice: string;
}

type Onglet = "paquets" | "stats" | "exercices";

export function PacketViewer({
  slug,
  titre,
  description,
  paquets,
  exercices,
}: {
  slug: string;
  titre: string;
  description: string;
  paquets: Paquet[];
  exercices: ExerciceClient[];
}) {
  const [onglet, setOnglet] = useState<Onglet>("paquets");
  const [filtre, setFiltre] = useState("");
  const [flux, setFlux] = useState<number | null>(null);
  const [selection, setSelection] = useState<Paquet | null>(null);

  const affiches = useMemo(() => {
    let list = paquets;
    if (flux !== null) list = suivreFlux(paquets, flux);
    const f = filtre.trim().toLowerCase();
    if (f) {
      list = list.filter((p) =>
        [p.proto, p.src, p.dst, p.info, p.sport, p.dport]
          .map((x) => String(x ?? "").toLowerCase())
          .some((s) => s.includes(f)),
      );
    }
    return list;
  }, [paquets, filtre, flux]);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/paquets" className="text-sm text-muted hover:text-text">
          ← Captures
        </Link>
        <h1 className="text-xl font-bold">{titre}</h1>
        <p className="text-sm text-muted">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["paquets", `Paquets (${paquets.length})`],
            ["stats", "Statistiques"],
            ["exercices", `Exercices (${exercices.length})`],
          ] as [Onglet, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setOnglet(k)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              onglet === k ? "bg-surface-2 text-text" : "text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {onglet === "paquets" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              placeholder="Filtre d'affichage (ex. DNS, 203.0.113.50, POST)"
              className="input flex-1 font-mono text-sm"
            />
            {flux !== null && (
              <button onClick={() => setFlux(null)} className="btn-ghost text-xs">
                Quitter le flux
              </button>
            )}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-2 text-muted">
                  <tr>
                    <th className="px-2 py-1.5">Nº</th>
                    <th className="px-2 py-1.5">Temps</th>
                    <th className="px-2 py-1.5">Source</th>
                    <th className="px-2 py-1.5">Destination</th>
                    <th className="px-2 py-1.5">Proto</th>
                    <th className="px-2 py-1.5">Long.</th>
                    <th className="px-2 py-1.5">Info</th>
                  </tr>
                </thead>
                <tbody>
                  {affiches.slice(0, 400).map((p) => (
                    <tr
                      key={p.no}
                      onClick={() => setSelection(p)}
                      className={`cursor-pointer border-t border-border hover:bg-surface-2 ${
                        selection?.no === p.no ? "bg-surface-2" : ""
                      } ${p.malveillant ? "text-warn" : ""}`}
                    >
                      <td className="px-2 py-1 font-mono">{p.no}</td>
                      <td className="whitespace-nowrap px-2 py-1 font-mono text-muted">
                        {new Date(p.ts).toLocaleTimeString("fr-CA")}
                      </td>
                      <td className="px-2 py-1 font-mono">{p.src}</td>
                      <td className="px-2 py-1 font-mono">{p.dst}</td>
                      <td className="px-2 py-1">{p.proto}</td>
                      <td className="px-2 py-1 text-muted">{p.length}</td>
                      <td className="px-2 py-1">{p.info}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              {selection ? (
                <DetailPaquet
                  paquet={selection}
                  onFlux={() => {
                    setFlux(selection.no);
                    setOnglet("paquets");
                  }}
                />
              ) : (
                <div className="card text-sm text-muted">
                  Clique sur un paquet pour voir le detail par couche.
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted">
            {affiches.length} paquet(s){flux !== null && " dans ce flux"}
            {affiches.length > 400 && " — 400 affiches"}
          </p>
        </div>
      )}

      {onglet === "stats" && <Stats paquets={paquets} />}

      {onglet === "exercices" && <Exercices slug={slug} exercices={exercices} />}
    </div>
  );
}

function DetailPaquet({ paquet, onFlux }: { paquet: Paquet; onFlux: () => void }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Paquet nº {paquet.no}</span>
        <button onClick={onFlux} className="btn-ghost text-xs">
          Suivre le flux
        </button>
      </div>
      {Object.entries(paquet.couches).map(([couche, champs]) => (
        <div key={couche} className="rounded-lg border border-border bg-surface-2 p-2 text-xs">
          <div className="mb-1 font-semibold text-brand">{couche}</div>
          <table className="w-full">
            <tbody>
              {Object.entries(champs).map(([k, v]) => (
                <tr key={k}>
                  <td className="py-0.5 pr-3 text-muted">{k}</td>
                  <td className="py-0.5 font-mono break-all">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Stats({ paquets }: { paquets: Paquet[] }) {
  const protos = useMemo(() => statsProtocoles(paquets), [paquets]);
  const conv = useMemo(() => conversations(paquets).slice(0, 10), [paquets]);
  const maxP = Math.max(1, ...protos.map((p) => p.count));
  const maxC = Math.max(1, ...conv.map((c) => c.paquets));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card">
        <p className="mb-2 font-semibold">Protocoles</p>
        <div className="space-y-1.5">
          {protos.map((p) => (
            <div key={p.proto} className="flex items-center gap-3 text-sm">
              <span className="w-16 shrink-0">{p.proto}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
                <div className="h-full bg-brand" style={{ width: `${(p.count / maxP) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-muted">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="mb-2 font-semibold">Top conversations</p>
        <div className="space-y-1.5 text-sm">
          {conv.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 truncate font-mono text-xs">
                {c.a} ↔ {c.b}
              </span>
              <div className="h-3 w-24 overflow-hidden rounded bg-surface-2">
                <div className="h-full bg-brand" style={{ width: `${(c.paquets / maxC) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-muted">{c.paquets}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Exercices({ slug, exercices }: { slug: string; exercices: ExerciceClient[] }) {
  return (
    <div className="space-y-3">
      {exercices.map((e) => (
        <ExerciceCarte key={e.id} slug={slug} exercice={e} />
      ))}
    </div>
  );
}

function ExerciceCarte({ slug, exercice }: { slug: string; exercice: ExerciceClient }) {
  const [reponse, setReponse] = useState("");
  const [res, setRes] = useState<{ reussi: boolean; indice: string | null } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function verifier() {
    setEnvoi(true);
    try {
      const r = await fetch(`/api/paquets/${slug}/verifier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciceId: exercice.id, reponse }),
      });
      const data = await r.json();
      if (r.ok) setRes(data);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="card space-y-3">
      <p className="font-medium">{exercice.question}</p>
      <div className="flex gap-2">
        <input
          value={reponse}
          onChange={(e) => setReponse(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verifier()}
          placeholder="Ta reponse…"
          className="input flex-1 font-mono text-sm"
          disabled={res?.reussi}
        />
        <button onClick={verifier} disabled={envoi || res?.reussi} className="btn-brand">
          Verifier
        </button>
      </div>
      {res && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            res.reussi ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {res.reussi ? "✓ Correct !" : `✗ Pas tout a fait. Indice : ${res.indice}`}
        </div>
      )}
    </div>
  );
}
