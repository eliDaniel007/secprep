import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { tableauBord } from "@/lib/stats";
import { nombreDues } from "@/lib/revision";
import { DOMAINES } from "@/lib/domaines";

function pct(x: number): string {
  return `${Math.round(x * 100)} %`;
}

export default async function DashboardPage() {
  const u = await exigerUtilisateur();
  const tb = await tableauBord(u.id);
  const dues = await nombreDues(u.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bonjour {u.nom} 👋</h1>
          <p className="mt-1 text-muted">
            Voici ta progression sur les 5 domaines du SY0-701.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/quiz" className="btn-brand">
            Demarrer un quiz
          </Link>
          <Link href="/examen" className="btn-ghost">
            Examen blanc
          </Link>
          <Link href="/duel" className="btn-ghost">
            Duel
          </Link>
          <Link
            href="/quiz/session?types=urgence&chrono=1&nombre=5"
            className="btn-ghost"
          >
            Mode urgence
          </Link>
        </div>
      </div>

      {/* Revision espacee */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Revision espacee (SM-2)</h2>
          <p className="mt-1 text-sm text-muted">
            {dues > 0
              ? `${dues} question(s) a reviser aujourd'hui.`
              : "Rien a reviser pour le moment. Les questions ratees reviennent ici."}
          </p>
        </div>
        {dues > 0 && (
          <Link href="/quiz/session?revision=1" className="btn-brand">
            Reviser ({dues})
          </Link>
        )}
      </div>

      {/* Cartes de synthese */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat libelle="Questions dispo." valeur={String(tb.totalQuestions)} />
        <Stat libelle="Tentatives" valeur={String(tb.totalTentatives)} />
        <Stat libelle="Reussies" valeur={String(tb.totalReussies)} />
        <Stat
          libelle="Taux global"
          valeur={tb.totalTentatives === 0 ? "—" : pct(tb.tauxGlobal)}
        />
      </div>

      {/* Progression par domaine */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Progression par domaine</h2>
        <div className="space-y-3">
          {tb.parDomaine.map((d) => {
            const meta = DOMAINES[d.domaine]!;
            return (
              <div key={d.domaine} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="chip">D{d.domaine}</span>
                      <span className="font-medium">{meta.court}</span>
                      <span className="text-xs text-muted">({meta.part} %)</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {d.tentatives === 0
                        ? `${d.questionsDisponibles} questions a decouvrir`
                        : `${d.reussies}/${d.tentatives} reussies · ${d.questionsDisponibles} dispo.`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">
                      {d.tentatives === 0 ? "—" : pct(d.tauxReussite)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.round(d.tauxReussite * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Points faibles */}
      {tb.pointsFaibles.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Points faibles</h2>
          <div className="flex flex-wrap gap-2">
            {tb.pointsFaibles.map((d) => (
              <Link
                key={d.domaine}
                href={`/quiz?domaine=${d.domaine}`}
                className="btn-ghost"
              >
                D{d.domaine} · {DOMAINES[d.domaine]!.court} ({pct(d.tauxReussite)})
              </Link>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            Clique sur un domaine pour t'entrainer dessus.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold">{valeur}</div>
      <div className="mt-1 text-xs text-muted">{libelle}</div>
    </div>
  );
}
