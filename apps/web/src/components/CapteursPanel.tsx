"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface CapteurVue {
  id: string;
  nom: string;
  actif: boolean;
  creeLe: string;
  jeuSlug: string;
  nbEvenements: number;
  dernierAudit: string | null;
}

export function CapteursPanel({ capteurs }: { capteurs: CapteurVue[] }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [consent, setConsent] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function creer() {
    setErreur(null);
    if (!consent) {
      setErreur("Tu dois confirmer l'autorisation avant de creer un capteur.");
      return;
    }
    setEnvoi(true);
    try {
      const res = await fetch("/api/capteurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, consentement: consent }),
      });
      const data = await res.json();
      if (!res.ok) return setErreur(data.erreur ?? "Creation impossible.");
      setToken(data.token);
      setNom("");
      setConsent(false);
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  async function revoquer(id: string) {
    await fetch(`/api/capteurs/${id}/revoke`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
        <p className="font-semibold text-warn">A lire avant d'installer un capteur</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-muted">
          <li>Uniquement sur des reseaux et machines qui t'appartiennent ou pour lesquels tu as une autorisation ecrite.</li>
          <li>Jamais sur un reseau d'ecole, d'employeur ou public sans autorisation.</li>
          <li>Passif uniquement : aucune interception active, aucun balayage, aucune attaque.</li>
          <li>Par defaut, seules des metadonnees sont envoyees ; les charges utiles sont masquees.</li>
        </ul>
      </div>

      <div className="card space-y-3">
        <h2 className="font-semibold">Enregistrer un capteur</h2>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom du capteur (ex. labo-raspberry)"
          className="input"
        />
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Je confirme que ce capteur sera installe uniquement sur un reseau/une
            machine m'appartenant ou pour lesquels j'ai une autorisation ecrite, et
            qu'il fonctionnera en mode passif.
          </span>
        </label>
        <button onClick={creer} disabled={envoi || !nom || !consent} className="btn-brand">
          {envoi ? "Creation…" : "Creer le capteur"}
        </button>
        {erreur && <p className="text-sm text-danger">{erreur}</p>}
      </div>

      {token && (
        <div className="card space-y-2 border-ok/50">
          <p className="font-semibold text-ok">Jeton du capteur (affiche une seule fois)</p>
          <code className="block overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-xs">{token}</code>
          <p className="text-xs text-muted">
            Copie-le maintenant. Sur ta machine de labo :{" "}
            <code className="rounded bg-surface-2 px-1">secprep-sensor register --token &lt;jeton&gt; --url &lt;url&gt;</code>
          </p>
          <button onClick={() => setToken(null)} className="btn-ghost text-xs">
            J'ai copie le jeton
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mes capteurs</h2>
        {capteurs.length === 0 ? (
          <p className="text-muted">Aucun capteur.</p>
        ) : (
          <div className="space-y-2">
            {capteurs.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-medium">{c.nom}</span>
                    <span className={`ml-2 chip ${c.actif ? "text-ok" : "text-danger"}`}>
                      {c.actif ? "actif" : "revoque"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <span>{c.nbEvenements} evenement(s)</span>
                    <Link href={`/siem/${c.jeuSlug}`} className="text-brand hover:underline">
                      Voir dans le SIEM
                    </Link>
                    {c.actif && (
                      <button onClick={() => revoquer(c.id)} className="btn-ghost px-2 py-1 text-xs">
                        Revoquer
                      </button>
                    )}
                  </div>
                </div>
                {c.dernierAudit && (
                  <p className="mt-1 text-xs text-muted">Derniere activite : {c.dernierAudit}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
