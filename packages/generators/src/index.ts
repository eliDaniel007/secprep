export * from "./types";
export * from "./gabarits";

import {
  genererAle,
  genererCidr,
  genererChmod,
  genererRpo,
  genererPorts,
} from "./gabarits";
import type { QuestionGeneree } from "./types";

export const GABARITS: Record<string, (graine: string) => QuestionGeneree> = {
  ALE: genererAle,
  CIDR: genererCidr,
  CHMOD: genererChmod,
  RPO: genererRpo,
  PORTS: genererPorts,
};

/** Genere N variantes uniques d'un gabarit (graines derivees, dedupliquees par id). */
export function genererLot(gabarit: string, graineBase: string, n: number): QuestionGeneree[] {
  const gen = GABARITS[gabarit];
  if (!gen) throw new Error(`Gabarit inconnu : ${gabarit}`);
  const vues = new Set<string>();
  const out: QuestionGeneree[] = [];
  let i = 0;
  let tentatives = 0;
  while (out.length < n && tentatives < n * 50) {
    tentatives++;
    const q = gen(`${graineBase}:${gabarit}:${i++}`);
    if (!vues.has(q.id)) {
      vues.add(q.id);
      out.push(q);
    }
  }
  return out;
}
