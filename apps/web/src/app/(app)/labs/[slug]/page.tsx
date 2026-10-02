import { notFound } from "next/navigation";
import { trouverLabo } from "@secprep/labs";
import { exigerUtilisateur } from "@/lib/auth";
import { LabRunner } from "@/components/LabRunner";

export default async function LabPage({ params }: { params: { slug: string } }) {
  await exigerUtilisateur();
  const labo = trouverLabo(params.slug);
  if (!labo) notFound();

  // On n'envoie que les champs surs (jamais la commande de verif ni le predicat).
  return (
    <LabRunner
      labo={{
        slug: labo.slug,
        titre: labo.titre,
        intro: labo.intro,
        consigne: labo.consigne,
        indice: labo.indice,
        outils: labo.outils,
        objectifSy0701: labo.objectifSy0701,
      }}
    />
  );
}
