import { exigerUtilisateur } from "@/lib/auth";
import { EntrainementRunner } from "@/components/EntrainementRunner";

export const dynamic = "force-dynamic";

export default async function EntrainementPage() {
  await exigerUtilisateur();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Entraînement illimité</h1>
        <p className="mt-1 text-muted">
          Des questions générées à la volée, toujours nouvelles, à réponse calculée.
          Choisis un axe et enchaîne les séries autant que tu veux.
        </p>
      </div>
      <EntrainementRunner />
    </div>
  );
}
