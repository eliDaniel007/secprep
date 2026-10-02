import { NextResponse } from "next/server";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { prisma } from "@secprep/db";
import { getSession } from "@/lib/session";

const schema = z.object({
  courriel: z.string().email(),
  motDePasse: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });
  }

  const { courriel, motDePasse } = parse.data;
  const u = await prisma.utilisateur.findUnique({ where: { courriel } });

  // Message generique (ne pas reveler si le compte existe).
  const echec = NextResponse.json(
    { erreur: "Courriel ou mot de passe incorrect." },
    { status: 401 },
  );
  if (!u) return echec;

  const ok = await verify(u.motDePasseHash, motDePasse).catch(() => false);
  if (!ok) return echec;

  const session = await getSession();
  session.userId = u.id;
  await session.save();

  return NextResponse.json({ ok: true });
}
