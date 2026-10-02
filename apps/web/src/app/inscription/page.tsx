"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InscriptionPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [courriel, setCourriel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setChargement(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, courriel, motDePasse }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErreur(data.erreur ?? "Inscription impossible.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErreur("Erreur reseau.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg text-xl font-black">
            S+
          </div>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted">
            Rejoins l'entraînement CompTIA Security+ (SY0-701).
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="nom">
              Nom
            </label>
            <input
              id="nom"
              type="text"
              autoComplete="name"
              required
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="courriel">
              Courriel
            </label>
            <input
              id="courriel"
              type="email"
              autoComplete="username"
              required
              className="input"
              value={courriel}
              onChange={(e) => setCourriel(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="mdp">
              Mot de passe
            </label>
            <input
              id="mdp"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="input"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">Au moins 8 caractères.</p>
          </div>

          {erreur && (
            <p
              role="alert"
              className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {erreur}
            </p>
          )}

          <button type="submit" className="btn-brand w-full" disabled={chargement}>
            {chargement ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
