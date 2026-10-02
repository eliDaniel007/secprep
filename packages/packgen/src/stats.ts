import type { Paquet } from "./types";

/** Repartition par protocole. */
export function statsProtocoles(paquets: Paquet[]): { proto: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of paquets) m.set(p.proto, (m.get(p.proto) ?? 0) + 1);
  return [...m.entries()]
    .map(([proto, count]) => ({ proto, count }))
    .sort((a, b) => b.count - a.count || a.proto.localeCompare(b.proto));
}

export interface Conversation {
  a: string;
  b: string;
  paquets: number;
  octets: number;
}

/** Conversations (paires d'IP, non orientees), triees par volume. */
export function conversations(paquets: Paquet[]): Conversation[] {
  const m = new Map<string, Conversation>();
  for (const p of paquets) {
    const [a, b] = [p.src, p.dst].sort();
    const cle = `${a}|${b}`;
    const c = m.get(cle) ?? { a: a!, b: b!, paquets: 0, octets: 0 };
    c.paquets += 1;
    c.octets += p.length;
    m.set(cle, c);
  }
  return [...m.values()].sort((x, y) => y.paquets - x.paquets);
}

/** Suit le flux (meme 5-uplet, dans les deux sens) du paquet donne. */
export function suivreFlux(paquets: Paquet[], no: number): Paquet[] {
  const ref = paquets.find((p) => p.no === no);
  if (!ref) return [];
  const memeFlux = (p: Paquet) =>
    (p.src === ref.src &&
      p.dst === ref.dst &&
      p.sport === ref.sport &&
      p.dport === ref.dport) ||
    (p.src === ref.dst &&
      p.dst === ref.src &&
      p.sport === ref.dport &&
      p.dport === ref.sport);
  return paquets.filter(memeFlux);
}
