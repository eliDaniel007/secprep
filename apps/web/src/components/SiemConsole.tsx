"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rechercher, ErreurRequete, type ResultatRecherche } from "@secprep/siem-query";

export interface EvenementClient {
  id: string;
  ts: number;
  source: string;
  action: string;
  champs: Record<string, string | number>;
  raw: string;
  malveillant: boolean;
}

interface EnqueteClient {
  id: string;
  verdict: string | null;
  notes: string;
  preuves: string[];
}

type Onglet = "recherche" | "tableau" | "regles" | "enquete";

const EXEMPLES = [
  'result=echec',
  'result=echec | stats count by user',
  'result=echec | top src_ip 5',
  'src_ip=203.0.113.66',
  'action=succes_auth NON src_ip=10.0.0.1',
];

export function SiemConsole({
  titre,
  evenements,
  enquete,
}: {
  titre: string;
  evenements: EvenementClient[];
  enquete: EnqueteClient;
}) {
  const [onglet, setOnglet] = useState<Onglet>("recherche");
  const [requete, setRequete] = useState("result=echec");
  const [resultat, setResultat] = useState<ResultatRecherche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvenementClient | null>(null);
  const [preuves, setPreuves] = useState<string[]>(enquete.preuves);

  function lancer(q: string) {
    setErreur(null);
    try {
      setResultat(rechercher(evenements as never, q));
      setRequete(q);
    } catch (e) {
      setErreur(e instanceof ErreurRequete ? e.message : "Requete invalide.");
      setResultat(null);
    }
  }

  function togglePreuve(id: string) {
    setPreuves((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{titre}</h1>
        <p className="mt-1 text-sm text-muted">
          {evenements.length} evenements · source : simule
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["recherche", "Recherche"],
            ["tableau", "Tableau de bord"],
            ["regles", "Regles de detection"],
            ["enquete", `Enquete (${preuves.length})`],
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

      {onglet === "recherche" && (
        <Recherche
          requete={requete}
          setRequete={setRequete}
          lancer={lancer}
          erreur={erreur}
          resultat={resultat}
          onDetail={setDetail}
          preuves={preuves}
          onPin={togglePreuve}
        />
      )}
      {onglet === "tableau" && <TableauBord evenements={evenements} />}
      {onglet === "regles" && <ReglesDetection evenements={evenements} />}
      {onglet === "enquete" && (
        <PanneauEnquete
          enquete={enquete}
          evenements={evenements}
          preuves={preuves}
          setPreuves={setPreuves}
        />
      )}

      {detail && <DetailJson evenement={detail} onFermer={() => setDetail(null)} />}
    </div>
  );
}

/* ---------------- Recherche ---------------- */

function Recherche({
  requete,
  setRequete,
  lancer,
  erreur,
  resultat,
  onDetail,
  preuves,
  onPin,
}: {
  requete: string;
  setRequete: (s: string) => void;
  lancer: (q: string) => void;
  erreur: string | null;
  resultat: ResultatRecherche | null;
  onDetail: (e: EvenementClient) => void;
  preuves: string[];
  onPin: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lancer(requete)}
          placeholder="ex. result=echec ET src_ip=203.0.113.66 | stats count by user"
          className="input flex-1 font-mono text-sm"
        />
        <button onClick={() => lancer(requete)} className="btn-brand">
          Rechercher
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted">Exemples :</span>
        {EXEMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => lancer(ex)}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 font-mono text-muted hover:text-text"
          >
            {ex}
          </button>
        ))}
      </div>

      {erreur && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erreur}
        </p>
      )}

      {resultat?.type === "count" && (
        <div className="card text-center">
          <div className="text-4xl font-black">{resultat.total}</div>
          <div className="text-sm text-muted">evenements</div>
        </div>
      )}

      {resultat?.type === "stats" && (
        <div className="card">
          <p className="mb-2 text-sm text-muted">Regroupe par {resultat.champ}</p>
          <TableStats lignes={resultat.lignes} />
        </div>
      )}

      {resultat?.type === "evenements" && (
        <>
          <Histogramme evenements={resultat.evenements as unknown as EvenementClient[]} />
          <p className="text-sm text-muted">{resultat.total} resultat(s)</p>
          <TableEvenements
            evenements={resultat.evenements.slice(0, 200) as unknown as EvenementClient[]}
            onDetail={onDetail}
            preuves={preuves}
            onPin={onPin}
          />
          {resultat.total > 200 && (
            <p className="text-center text-xs text-muted">Affichage limite aux 200 premiers.</p>
          )}
        </>
      )}
    </div>
  );
}

function TableStats({ lignes }: { lignes: { cle: string; count: number }[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.count));
  return (
    <div className="space-y-1.5">
      {lignes.map((l) => (
        <div key={l.cle} className="flex items-center gap-3 text-sm">
          <span className="w-48 shrink-0 truncate font-mono">{l.cle}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
            <div className="h-full bg-brand" style={{ width: `${(l.count / max) * 100}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right text-muted">{l.count}</span>
        </div>
      ))}
    </div>
  );
}

function TableEvenements({
  evenements,
  onDetail,
  preuves,
  onPin,
}: {
  evenements: EvenementClient[];
  onDetail: (e: EvenementClient) => void;
  preuves: string[];
  onPin: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-muted">
          <tr>
            <th className="px-3 py-2">Heure</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">src_ip</th>
            <th className="px-3 py-2">user</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {evenements.map((e) => (
            <tr key={e.id} className="border-t border-border hover:bg-surface-2">
              <td className="whitespace-nowrap px-3 py-1.5 font-mono text-xs text-muted">
                {new Date(e.ts).toLocaleTimeString("fr-CA")}
              </td>
              <td className="px-3 py-1.5">{e.source}</td>
              <td className="px-3 py-1.5">
                <span className={e.action === "echec_auth" ? "text-warn" : "text-ok"}>
                  {e.action}
                </span>
              </td>
              <td className="px-3 py-1.5 font-mono text-xs">{String(e.champs.src_ip ?? "")}</td>
              <td className="px-3 py-1.5">{String(e.champs.user ?? "")}</td>
              <td className="px-3 py-1.5 text-right">
                <button
                  onClick={() => onPin(e.id)}
                  title="Epingler comme preuve"
                  className={preuves.includes(e.id) ? "text-brand" : "text-muted hover:text-text"}
                >
                  {preuves.includes(e.id) ? "★" : "☆"}
                </button>
                <button onClick={() => onDetail(e)} className="ml-2 text-muted hover:text-text">
                  ⋯
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Histogramme({ evenements }: { evenements: EvenementClient[] }) {
  const barres = useMemo(() => {
    if (evenements.length === 0) return [];
    const min = Math.min(...evenements.map((e) => e.ts));
    const max = Math.max(...evenements.map((e) => e.ts));
    const n = 24;
    const pas = Math.max(1, (max - min) / n);
    const buckets = new Array(n).fill(0);
    for (const e of evenements) {
      const i = Math.min(n - 1, Math.floor((e.ts - min) / pas));
      buckets[i]++;
    }
    return buckets;
  }, [evenements]);
  const max = Math.max(1, ...barres);
  if (barres.length === 0) return null;
  return (
    <div className="card">
      <p className="mb-2 text-xs text-muted">Repartition dans le temps</p>
      <div className="flex h-24 items-end gap-0.5">
        {barres.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-brand/70"
            style={{ height: `${(b / max) * 100}%` }}
            title={`${b}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Tableau de bord ---------------- */

function TableauBord({ evenements }: { evenements: EvenementClient[] }) {
  const stats = useMemo(() => {
    const total = evenements.length;
    const echecs = rechercher(evenements as never, "result=echec");
    const nbEchecs = echecs.type === "evenements" ? echecs.total : 0;
    const topIp = rechercher(evenements as never, "result=echec | top src_ip 6");
    const topUser = rechercher(evenements as never, "result=echec | top user 6");
    const succesExterne = evenements.filter(
      (e) => e.action === "succes_auth" && !String(e.champs.src_ip ?? "").startsWith("10."),
    ).length;
    return {
      total,
      nbEchecs,
      succesExterne,
      topIp: topIp.type === "stats" ? topIp.lignes : [],
      topUser: topUser.type === "stats" ? topUser.lignes : [],
    };
  }, [evenements]);

  return (
    <div className="space-y-4">
      <div className="stat-group" style={{ ["--stat-cols" as string]: 3 }}>
        <Carte libelle="Evenements" valeur={stats.total} />
        <Carte libelle="Echecs d'auth" valeur={stats.nbEchecs} />
        <Carte libelle="Succes depuis IP externe" valeur={stats.succesExterne} accent />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <p className="mb-2 font-semibold">Top IP (echecs)</p>
          <TableStats lignes={stats.topIp} />
        </div>
        <div className="card">
          <p className="mb-2 font-semibold">Top comptes (echecs)</p>
          <TableStats lignes={stats.topUser} />
        </div>
      </div>
    </div>
  );
}

function Carte({ libelle, valeur, accent }: { libelle: string; valeur: number; accent?: boolean }) {
  return (
    <div className="stat">
      <div className={`stat-k ${accent && valeur > 0 ? "text-danger" : ""}`}>{valeur}</div>
      <div className="stat-l">{libelle}</div>
    </div>
  );
}

/* ---------------- Regles de detection ---------------- */

function ReglesDetection({ evenements }: { evenements: EvenementClient[] }) {
  const [regle, setRegle] = useState("result=echec ET src_ip=203.0.113.66");
  const [res, setRes] = useState<{ tp: number; fp: number; fn: number; tn: number } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function tester() {
    setErreur(null);
    try {
      const r = rechercher(evenements as never, regle);
      if (r.type !== "evenements") {
        setErreur("Une regle doit renvoyer des evenements (pas de | stats/top).");
        setRes(null);
        return;
      }
      const matchs = new Set(r.evenements.map((e) => (e as unknown as EvenementClient).id));
      let tp = 0,
        fp = 0,
        fn = 0,
        tn = 0;
      for (const e of evenements) {
        const detecte = matchs.has(e.id);
        if (detecte && e.malveillant) tp++;
        else if (detecte && !e.malveillant) fp++;
        else if (!detecte && e.malveillant) fn++;
        else tn++;
      }
      setRes({ tp, fp, fn, tn });
    } catch (e) {
      setErreur(e instanceof ErreurRequete ? e.message : "Regle invalide.");
      setRes(null);
    }
  }

  const precision = res && res.tp + res.fp > 0 ? res.tp / (res.tp + res.fp) : null;
  const rappel = res && res.tp + res.fn > 0 ? res.tp / (res.tp + res.fn) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Ecris une regle (requete sans pipeline). On la compare a la verite terrain :
        vrais/faux positifs et negatifs.
      </p>
      <div className="flex gap-2">
        <input
          value={regle}
          onChange={(e) => setRegle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && tester()}
          className="input flex-1 font-mono text-sm"
        />
        <button onClick={tester} className="btn-brand">
          Tester
        </button>
      </div>
      {erreur && (
        <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erreur}
        </p>
      )}
      {res && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Carte libelle="Vrais positifs" valeur={res.tp} />
            <Carte libelle="Faux positifs" valeur={res.fp} />
            <Carte libelle="Faux negatifs" valeur={res.fn} />
            <Carte libelle="Vrais negatifs" valeur={res.tn} />
          </div>
          <div className="card flex gap-8 text-sm">
            <div>
              <span className="text-muted">Precision : </span>
              {precision === null ? "—" : `${Math.round(precision * 100)} %`}
            </div>
            <div>
              <span className="text-muted">Rappel : </span>
              {rappel === null ? "—" : `${Math.round(rappel * 100)} %`}
            </div>
          </div>
          <p className="text-xs text-muted">
            Objectif : maximiser le rappel (attraper tous les malveillants) tout en
            gardant peu de faux positifs.
          </p>
        </>
      )}
    </div>
  );
}

/* ---------------- Enquete ---------------- */

const VERDICTS = ["password_spraying", "force_brute", "compte_compromis", "faux_positif", "autre"];

function PanneauEnquete({
  enquete,
  evenements,
  preuves,
  setPreuves,
}: {
  enquete: EnqueteClient;
  evenements: EvenementClient[];
  preuves: string[];
  setPreuves: (p: string[]) => void;
}) {
  const router = useRouter();
  const [verdict, setVerdict] = useState(enquete.verdict ?? "");
  const [notes, setNotes] = useState(enquete.notes);
  const [statut, setStatut] = useState<string | null>(null);
  const [creation, setCreation] = useState(false);

  const parId = useMemo(() => new Map(evenements.map((e) => [e.id, e])), [evenements]);

  async function sauver() {
    setStatut("Enregistrement…");
    const res = await fetch(`/api/enquetes/${enquete.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdict: verdict || null, notes, preuves }),
    });
    setStatut(res.ok ? "✓ Enregistre" : "Erreur");
  }

  async function creerRapport() {
    setCreation(true);
    try {
      await sauver();
      const res = await fetch(`/api/enquetes/${enquete.id}/rapport`, { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/rapports/${data.id}`);
    } finally {
      setCreation(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div>
          <label className="label">Verdict</label>
          <div className="flex flex-wrap gap-2">
            {VERDICTS.map((v) => (
              <button
                key={v}
                onClick={() => setVerdict(v)}
                className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                  verdict === v
                    ? "border-brand bg-brand/15 text-text"
                    : "border-border bg-surface-2 text-muted hover:text-text"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Notes d'enquete</label>
          <textarea
            className="input min-h-28"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, hypotheses, chronologie…"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={sauver} className="btn-ghost">
            Enregistrer
          </button>
          <button onClick={creerRapport} disabled={creation} className="btn-brand">
            {creation ? "Creation…" : "Creer un brouillon de rapport"}
          </button>
          {statut && <span className="text-xs text-muted">{statut}</span>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Preuves epinglees ({preuves.length})</h3>
        {preuves.length === 0 ? (
          <p className="text-sm text-muted">
            Epingle des evenements (★) depuis l'onglet Recherche.
          </p>
        ) : (
          <div className="space-y-1.5">
            {preuves.map((id) => {
              const e = parId.get(id);
              if (!e) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <span className="truncate font-mono">{e.raw}</span>
                  <button
                    onClick={() => setPreuves(preuves.filter((x) => x !== id))}
                    className="ml-2 shrink-0 text-muted hover:text-danger"
                  >
                    retirer
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Detail JSON ---------------- */

function DetailJson({ evenement, onFermer }: { evenement: EvenementClient; onFermer: () => void }) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFermer}
    >
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Detail de l'evenement</h3>
          <button onClick={onFermer} className="text-muted hover:text-text">
            ✕
          </button>
        </div>
        <pre className="overflow-auto rounded-xl bg-surface-2 p-3 text-xs">
          {JSON.stringify(
            {
              ts: new Date(evenement.ts).toISOString(),
              source: evenement.source,
              action: evenement.action,
              ...evenement.champs,
              raw: evenement.raw,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}
