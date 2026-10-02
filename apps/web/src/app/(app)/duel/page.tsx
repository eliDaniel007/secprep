import Link from "next/link";
import { prisma } from "@secprep/db";
import { exigerUtilisateur } from "@/lib/auth";
import { DuelLobby } from "@/components/DuelLobby";

export default async function DuelPage() {
  const u = await exigerUtilisateur();

  const duels = await prisma.duel.findMany({
    where: {
      OR: [
        { createurId: u.id },
        { participations: { some: { utilisateurId: u.id } } },
      ],
    },
    include: {
      createur: { select: { nom: true } },
      participations: { include: { utilisateur: { select: { nom: true } } } },
    },
    orderBy: { creeLe: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Duel & coopération</h1>
        <p className="mt-1 text-muted">
          Même jeu de questions pour les deux, en différé. Compare ou combine vos scores.
        </p>
      </div>

      <DuelLobby />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tes défis</h2>
        {duels.length === 0 ? (
          <p className="text-muted">Aucun défi pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {duels.map((d) => {
              const aJoue = d.participations.some((p) => p.utilisateurId === u.id);
              return (
                <Link
                  key={d.id}
                  href={`/duel/${d.code}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:border-muted"
                >
                  <span className="flex items-center gap-3">
                    <span className="chip font-mono tracking-widest">{d.code}</span>
                    <span className="text-muted">
                      {d.mode === "coop" ? "Coop" : "Duel"} · {d.nombre} questions
                    </span>
                  </span>
                  <span className="flex items-center gap-3 text-muted">
                    <span>{d.participations.length}/2 joués</span>
                    <span className={aJoue ? "text-ok" : "text-warn"}>
                      {aJoue ? "✓ joué" : "à jouer"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
