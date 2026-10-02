import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { utilisateurCourant } from "@/lib/auth";
import { melanger } from "@/lib/melange";

const schema = z.object({
  mode: z.enum(["duel", "coop"]).default("duel"),
  nombre: z.number().int().min(3).max(30).default(10),
  domaine: z.number().int().min(1).max(5).optional(),
});

function genererCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans caracteres ambigus
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body ?? {});
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  const { mode, nombre, domaine } = parse.data;

  const lignes = await prisma.question.findMany({
    where: { statut: "valide", ...(domaine ? { domaine } : {}) },
    select: { id: true },
  });
  if (lignes.length === 0) {
    return NextResponse.json({ erreur: "Aucune question disponible." }, { status: 400 });
  }
  const ids = melanger(lignes.map((l) => l.id)).slice(0, nombre);

  // Code unique (quelques essais).
  let code = genererCode();
  for (let i = 0; i < 5; i++) {
    const existe = await prisma.duel.findUnique({ where: { code } });
    if (!existe) break;
    code = genererCode();
  }

  await prisma.duel.create({
    data: {
      code,
      createurId: u.id,
      mode,
      nombre: ids.length,
      questionIds: JSON.stringify(ids),
    },
  });

  return NextResponse.json({ code });
}
