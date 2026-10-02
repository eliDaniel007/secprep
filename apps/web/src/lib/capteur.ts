import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Jeton de capteur : 32 octets aleatoires (haute entropie). */
export function genererToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash du jeton pour stockage au repos (sha256 suffit vu la forte entropie). */
export function hacherToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Extrait le jeton d'un en-tete Authorization: Bearer <token>. */
export function tokenDepuisHeader(h: string | null): string | null {
  if (!h) return null;
  const m = h.match(/^Bearer\s+([a-f0-9]{64})$/i);
  return m ? m[1]! : null;
}

/** Champs de metadonnees autorises a l'ingestion (minimisation). */
export const CHAMPS_AUTORISES = [
  "src_ip",
  "dst_ip",
  "src_port",
  "dst_port",
  "user",
  "host",
  "result",
  "proto",
  "dns",
  "taille",
  "event_id",
];

/** Ne garde que les metadonnees autorisees (jamais de charge utile). */
export function minimiserChamps(champs: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const k of CHAMPS_AUTORISES) {
    const v = champs[k];
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}
