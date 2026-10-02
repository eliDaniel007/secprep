"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DuelLobby() {
  const router = useRouter();
  const [mode, setMode] = useState<"duel" | "coop">("duel");
  const [nombre, setNombre] = useState("10");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function creer() {
    setErreur(null);
    setChargement(true);
    try {
      const res = await fetch("/api/duel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, nombre: Number(nombre) }),
      });
      const data = await res.json();
      if (!res.ok) return setErreur(data.erreur ?? "Creation impossible.");
      router.push(`/duel/${data.code}`);
    } finally {
      setChargement(false);
    }
  }

  function rejoindre() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setErreur("Code invalide.");
    router.push(`/duel/${c}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card space-y-4">
        <h2 className="font-semibold">Creer un defi</h2>
        <div>
          <label className="label">Mode</label>
          <div className="flex gap-2">
            <Choix actif={mode === "duel"} onClick={() => setMode("duel")}>
              Duel (comparaison)
            </Choix>
            <Choix actif={mode === "coop"} onClick={() => setMode("coop")}>
              Coop (combine)
            </Choix>
          </div>
        </div>
        <div>
          <label className="label">Nombre de questions</label>
          <div className="flex gap-2">
            {["5", "10", "20"].map((n) => (
              <Choix key={n} actif={nombre === n} onClick={() => setNombre(n)}>
                {n}
              </Choix>
            ))}
          </div>
        </div>
        <button onClick={creer} disabled={chargement} className="btn-brand w-full">
          {chargement ? "Creation…" : "Creer et obtenir un code"}
        </button>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Rejoindre un defi</h2>
        <p className="text-sm text-muted">
          Entre le code partage par ton binome pour jouer le meme jeu de questions.
        </p>
        <input
          className="input uppercase tracking-widest"
          placeholder="Ex. K7P2QX"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button onClick={rejoindre} className="btn-ghost w-full">
          Rejoindre
        </button>
      </div>

      {erreur && (
        <p className="sm:col-span-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}

function Choix({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
        actif ? "border-brand bg-brand/15 text-text" : "border-border bg-surface-2 text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
