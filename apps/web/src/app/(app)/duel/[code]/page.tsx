import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";

function pct(g: number, m: number): number {
  return m === 0 ? 0 : Math.round((g / m) * 100);
}

export default async function DuelDetailPage({
  params,
}: {
  params: { code: string };
}) {
  const u = await exigerUtilisateur();
  const duel = await prisma.duel.findUnique({
    where: { code: params.code },
    include: {
      createur: { select: { nom: true } },
      participations: { include: { utilisateur: { select: { id: true, nom: true } } } },
    },
  });
  if (!duel) notFound();

  const maPart = duel.participations.find((p) => p.utilisateurId === u.id);
  const coop = duel.mode === "coop";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{coop ? "Coopération" : "Duel"}</h1>
          <span className="chip font-mono tracking-widest">{duel.code}</span>
        </div>
        <p className="mt-1 text-muted">
          {duel.nombre} questions · créé par {duel.createur.nom}
        </p>
      </div>

      {!maPart && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <p>Tu n'as pas encore joué ce défi.</p>
          <Link href={`/duel/${duel.code}/play`} className="btn-brand">
            Jouer maintenant
          </Link>
        </div>
      )}

      {maPart && (
        <div className="card space-y-1">
          <p className="font-semibold text-ok">✓ Tu as joué ce défi.</p>
          <div className="text-3xl font-black">
            {pct(maPart.pointsGagnes, maPart.pointsMax)} %
          </div>
          <p className="text-sm text-muted">
            {maPart.corrects}/{maPart.total} correctes · {maPart.pointsGagnes}/
            {maPart.pointsMax} points
          </p>
          {!coop && duel.participations.length < 2 && (
            <p className="mt-1 text-sm text-warn">
              Partage le code <span className="font-mono">{duel.code}</span> à ton
              binôme : la comparaison s'affichera quand il aura joué.
            </p>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {coop ? "Score combiné" : "Comparaison"}
        </h2>

        <div className="mb-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Partage le code <span className="font-mono text-text">{duel.code}</span>{" "}
          avec ton binôme pour qu'il joue le même jeu de questions.
        </div>

        {duel.participations.length === 0 ? (
          <p className="text-muted">
            Personne n'a encore terminé. Clique « Jouer maintenant » ci-dessus, puis
            partage le code à ton binôme.
          </p>
        ) : coop ? (
          <Coop participations={duel.participations} />
        ) : (
          <Duel participations={duel.participations} />
        )}
      </section>

      <Link href="/duel" className="btn-ghost">
        ← Tous les défis
      </Link>
    </div>
  );
}

type Part = {
  utilisateurId: string;
  pointsGagnes: number;
  pointsMax: number;
  corrects: number;
  total: number;
  utilisateur: { nom: string };
};

function Duel({ participations }: { participations: Part[] }) {
  const tri = [...participations].sort((a, b) => b.pointsGagnes - a.pointsGagnes);
  const meneur = tri.length >= 2 && tri[0]!.pointsGagnes !== tri[1]!.pointsGagnes ? tri[0] : null;
  return (
    <div className="space-y-2">
      {tri.map((p) => (
        <div
          key={p.utilisateurId}
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            meneur?.utilisateurId === p.utilisateurId
              ? "border-ok/50 bg-ok/10"
              : "border-border bg-surface"
          }`}
        >
          <span className="font-medium">
            {p.utilisateur.nom}
            {meneur?.utilisateurId === p.utilisateurId && " 🏆"}
          </span>
          <span className="text-sm text-muted">
            {p.corrects}/{p.total} · {pct(p.pointsGagnes, p.pointsMax)} %
          </span>
        </div>
      ))}
      {participations.length < 2 && (
        <p className="text-sm text-muted">En attente du second joueur…</p>
      )}
      {participations.length >= 2 && !meneur && (
        <p className="text-center text-sm font-medium">Égalité parfaite !</p>
      )}
    </div>
  );
}

function Coop({ participations }: { participations: Part[] }) {
  const corrects = participations.reduce((s, p) => s + p.corrects, 0);
  const total = participations.reduce((s, p) => s + p.total, 0);
  return (
    <div className="space-y-3">
      <div className="card text-center">
        <p className="text-sm text-muted">Score d'équipe</p>
        <div className="my-1 text-3xl font-black">
          {corrects} / {total}
        </div>
      </div>
      {participations.map((p) => (
        <div
          key={p.utilisateurId}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm"
        >
          <span>{p.utilisateur.nom}</span>
          <span className="text-muted">{p.corrects}/{p.total}</span>
        </div>
      ))}
    </div>
  );
}
