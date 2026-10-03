export * from "./types";
export * from "./gabarits";
export * from "./gabarits2";

import {
  genererAle,
  genererCidr,
  genererChmod,
  genererRpo,
  genererPorts,
} from "./gabarits";
import {
  genererCrypto,
  genererControle,
  genererAttaque,
  genererSoc,
  genererRaid,
  genererEntropie,
} from "./gabarits2";
import type { QuestionGeneree } from "./types";

export const GABARITS: Record<string, (graine: string) => QuestionGeneree> = {
  // Calculs / reseau
  ALE: genererAle,
  CIDR: genererCidr,
  CHMOD: genererChmod,
  RPO: genererRpo,
  PORTS: genererPorts,
  RAID: genererRaid,
  ENTROPIE: genererEntropie,
  // Concepts / definitions
  CRYPTO: genererCrypto,
  CONTROLE: genererControle,
  ATTAQUE: genererAttaque,
  // Scenarios SOC
  SOC: genererSoc,
};

/** Gabarits dont la reponse est un index d'option (QCM-like) : corrigeables
 *  de maniere apatride dans le mode entrainement. Exclut l'appariement (PORTS). */
export const GABARITS_QCM: string[] = [
  "ALE", "CIDR", "CHMOD", "RPO", "RAID", "ENTROPIE",
  "CRYPTO", "CONTROLE", "ATTAQUE", "SOC",
];

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
