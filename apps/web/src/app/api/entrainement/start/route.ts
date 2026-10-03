import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { GABARITS, GABARITS_QCM } from "@secprep/generators";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({
  nombre: z.number().int().min(3).max(20).default(10),
  gabarits: z.array(z.string()).optional(), // sous-ensemble optionnel (par axe)
});

/**
 * Entrainement illimite : genere N questions a la volee depuis les gabarits.
 * APATRIDE — rien n'est stocke. La bonne reponse N'EST PAS envoyee au client ;
 * elle est recalculee a la correction (route finish) a partir de {gabarit, graine}.
 */
export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parse = schema.safeParse(body ?? {});
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const dispo = (parse.data.gabarits?.filter((g) => GABARITS_QCM.includes(g)) ?? GABARITS_QCM);
  const pool = dispo.length > 0 ? dispo : GABARITS_QCM;

  const questions = [];
  for (let i = 0; i < parse.data.nombre; i++) {
    const gabarit = pool[Math.floor(Math.random() * pool.length)]!;
    const graine = randomUUID();
    const q = GABARITS[gabarit]!(graine);
    questions.push({
      ref: { gabarit, graine },
      domaine: q.domaine,
      type: q.type,
      difficulte: q.difficulte,
      enonce: q.enonce,
      options: q.options ?? [],
      // reponse / explication volontairement omises (recalculees a la correction)
    });
  }

  return NextResponse.json({ questions });
}
