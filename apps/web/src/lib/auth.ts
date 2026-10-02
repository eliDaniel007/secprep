import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@secprep/db";
import { getSession } from "./session";

export interface UtilisateurCourant {
  id: string;
  nom: string;
  courriel: string;
  role: string;
}

/** Renvoie l'utilisateur connecte, ou null. */
export async function utilisateurCourant(): Promise<UtilisateurCourant | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const u = await prisma.utilisateur.findUnique({
    where: { id: session.userId },
    select: { id: true, nom: true, courriel: true, role: true },
  });
  return u;
}

/** A utiliser dans les pages protegees : redirige vers /login si non connecte. */
export async function exigerUtilisateur(): Promise<UtilisateurCourant> {
  const u = await utilisateurCourant();
  if (!u) redirect("/login");
  return u;
}
