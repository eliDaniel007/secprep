import { prisma } from "@secprep/db";
import { exigerAdmin } from "@/lib/auth";
import { statsParQuestion } from "@/lib/stats";
import { RelecturePanel, type BrouillonVue } from "@/components/RelecturePanel";

export const dynamic = "force-dynamic";

function parseContenu(json: string): { options?: string[]; reponse?: number | string; paires?: { gauche: string; droite: string }[] } {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export default async function RelecturePage() {
  await exigerAdmin();

  const lignes = await prisma.question.findMany({
    where: { source: "genere", statut: "brouillon" },
    orderBy: { creeLe: "asc" },
  });

  const brouillons: BrouillonVue[] = lignes.map((q) => {
    const c = parseContenu(q.contenu);
    return {
      id: q.id,
      domaine: q.domaine,
      type: q.type,
      difficulte: q.difficulte,
      enonce: q.enonce,
      explication: q.explication,
      options: c.options ?? null,
      reponse: c.reponse ?? null,
      paires: c.paires ?? null,
    };
  });

  const stats = (await statsParQuestion()).filter((s) => s.tentatives > 0).slice(0, 20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Relecture &amp; statistiques</h1>
        <p className="mt-1 text-muted">
          Valide les questions generees avant qu'elles n'apparaissent dans les quiz
          et examens. Les brouillons restent invisibles pour les etudiants.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          File de relecture
          <span className="ml-2 chip">{brouillons.length}</span>
        </h2>
        <RelecturePanel brouillons={brouillons} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Statistiques par question</h2>
        {stats.length === 0 ? (
          <p className="text-muted">Aucune tentative enregistree pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3">Question</th>
                  <th className="px-3">Dom.</th>
                  <th className="px-3">Type</th>
                  <th className="px-3 text-right">Tent.</th>
                  <th className="px-3 text-right">Reussite</th>
                  <th className="px-3 text-right">Temps moy.</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="max-w-md truncate py-2 pr-3" title={s.enonce}>
                      {s.enonce}
                    </td>
                    <td className="px-3">D{s.domaine}</td>
                    <td className="px-3 text-muted">{s.type}</td>
                    <td className="px-3 text-right">{s.tentatives}</td>
                    <td
                      className={`px-3 text-right font-medium ${
                        s.tauxReussite < 0.4 ? "text-danger" : s.tauxReussite > 0.85 ? "text-warn" : "text-ok"
                      }`}
                    >
                      {Math.round(s.tauxReussite * 100)} %
                    </td>
                    <td className="px-3 text-right text-muted">{s.tempsMoyen} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Rouge = tres difficile (&lt; 40 %), jaune = peut-etre trop facile (&gt; 85 %).
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
