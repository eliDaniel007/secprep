import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@secprep/db";
import { trouverLabo } from "@secprep/labs";
import { dockerDisponible, demarrer, arreter } from "@secprep/sandbox";
import { utilisateurCourant } from "@/lib/auth";

const schema = z.object({ laboSlug: z.string() });

export async function POST(req: Request) {
  const u = await utilisateurCourant();
  if (!u) return NextResponse.json({ erreur: "Non connecte." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ erreur: "Entree invalide." }, { status: 400 });

  const labo = trouverLabo(parse.data.laboSlug);
  if (!labo) return NextResponse.json({ erreur: "Labo inconnu." }, { status: 404 });

  if (!(await dockerDisponible())) {
    return NextResponse.json(
      {
        erreur:
          "Docker n'est pas disponible. Demarre Docker Desktop pour activer le terminal du bac a sable.",
        code: "DOCKER_INDISPONIBLE",
      },
      { status: 503 },
    );
  }

  // Nettoie d'eventuelles sessions precedentes de cet utilisateur (evite les
  // conteneurs orphelins).
  const anciennes = await prisma.sessionSandbox.findMany({ where: { utilisateurId: u.id } });
  for (const s of anciennes) {
    await arreter(s.conteneur).catch(() => {});
  }
  await prisma.sessionSandbox.deleteMany({ where: { utilisateurId: u.id } });

  try {
    const conteneur = await demarrer(u.id, labo.setup);
    const session = await prisma.sessionSandbox.create({
      data: { utilisateurId: u.id, conteneur, laboSlug: labo.slug },
    });
    return NextResponse.json({ sessionId: session.id });
  } catch (e) {
    console.error("Erreur demarrage bac a sable:", e);
    return NextResponse.json({ erreur: "Impossible de demarrer le bac a sable." }, { status: 500 });
  }
}
