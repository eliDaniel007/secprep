/** Paquet reseau synthetique normalise. */
export interface Paquet {
  no: number;
  ts: number; // epoch ms
  src: string;
  dst: string;
  sport?: number;
  dport?: number;
  proto: string; // TCP | UDP | DNS | HTTP | ICMP | ARP | TLS
  length: number;
  info: string;
  /** Detail par couche (Ethernet, IP, TCP/UDP, DNS/HTTP...). */
  couches: Record<string, Record<string, string | number>>;
  malveillant: boolean;
  etiquette?: string;
}

export interface Exercice {
  id: string;
  question: string;
  indice: string;
  /** Verite terrain : reponse attendue (reste cote serveur). */
  reponse: string;
}

export interface VeritePaquets {
  attaque: string;
  description: string;
  pistes: string[];
  exercices: Exercice[];
}

export interface Capture {
  slug: string;
  titre: string;
  graine: string;
  paquets: Paquet[];
  verite: VeritePaquets;
}

export interface OptionsCapture {
  graine: string;
  debut?: number;
}
