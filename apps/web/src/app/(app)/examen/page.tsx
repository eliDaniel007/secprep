import Link from "next/link";

export default function ExamenIntroPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulateur d'examen</h1>
        <p className="mt-1 text-muted">Conditions proches de l'examen SY0-701.</p>
      </div>

      <div className="card space-y-3 text-sm">
        <Regle titre="Questions ponderees par domaine">
          D1 12 % · D2 22 % · D3 18 % · D4 28 % · D5 20 % (comme l'examen reel).
        </Regle>
        <Regle titre="Minuterie globale">
          90 minutes pour l'ensemble. Le temps restant est toujours visible.
        </Regle>
        <Regle titre="Navigation libre">
          Avance, recule, marque une question pour y revenir, puis fais une revue
          finale avant de soumettre.
        </Regle>
        <Regle titre="Score 100–900 (seuil 750)">
          Approximation lineaire assumee (le bareme reel de CompTIA est secret).
        </Regle>
        <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-muted">
          La banque est encore petite : l'examen utilise toutes les questions
          disponibles. Elle s'etoffera avec les generateurs (Phase 10).
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/examen/session" className="btn-brand">
          Demarrer l'examen
        </Link>
        <Link href="/" className="btn-ghost">
          Annuler
        </Link>
      </div>
    </div>
  );
}

function Regle({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-brand">●</span>
      <p>
        <span className="font-semibold">{titre} — </span>
        <span className="text-muted">{children}</span>
      </p>
    </div>
  );
}
