import { Alea } from "@secprep/loggen";
import type { Capture, OptionsCapture, Paquet } from "./types";

const BASE_DEFAUT = Date.UTC(2026, 1, 3, 9, 0, 0);
const HOTES_INTERNES = ["10.0.0.11", "10.0.0.12", "10.0.0.15", "10.0.0.21", "10.0.0.33"];
const WEB_EXTERNE = ["198.51.100.10", "198.51.100.20", "203.0.113.200"];

interface Brut extends Omit<Paquet, "no"> {}

function finaliser(bruts: Brut[]): Paquet[] {
  const tries = [...bruts].sort((a, b) => a.ts - b.ts);
  return tries.map((p, i) => ({ ...p, no: i + 1 }));
}

function eth(): Record<string, string> {
  return { type: "IPv4" };
}

/** Trafic de fond legitime (web + DNS). */
function bruit(alea: Alea, debut: number, n: number): Brut[] {
  const out: Brut[] = [];
  for (let i = 0; i < n; i++) {
    const ts = debut + alea.entier(0, 20 * 60_000);
    const interne = alea.choix(HOTES_INTERNES);
    if (alea.chance(0.5)) {
      const ext = alea.choix(WEB_EXTERNE);
      const sport = alea.entier(49152, 65535);
      out.push({
        ts,
        src: interne,
        dst: ext,
        sport,
        dport: 443,
        proto: "TLS",
        length: alea.entier(200, 1400),
        info: `Application Data`,
        couches: { Ethernet: eth(), IP: { src: interne, dst: ext, ttl: 64 }, TCP: { sport, dport: 443, flags: "PSH,ACK" }, TLS: { type: "Application Data" } },
        malveillant: false,
      });
    } else {
      const sport = alea.entier(49152, 65535);
      const dom = alea.choix(["example.org", "example.net", "maj.example.com"]);
      out.push({
        ts,
        src: interne,
        dst: "198.51.100.53",
        sport,
        dport: 53,
        proto: "DNS",
        length: alea.entier(70, 110),
        info: `Standard query A ${dom}`,
        couches: { Ethernet: eth(), IP: { src: interne, dst: "198.51.100.53", ttl: 64 }, UDP: { sport, dport: 53 }, DNS: { type: "query", nom: dom } },
        malveillant: false,
      });
    }
  }
  return out;
}

/** 1) Balayage de ports. */
export function genererPortScan(opts: OptionsCapture): Capture {
  const alea = new Alea(opts.graine + ":portscan");
  const debut = opts.debut ?? BASE_DEFAUT;
  const scanner = "203.0.113.50";
  const cible = "10.0.0.10";
  const ouverts = [22, 80, 443];
  const bruts: Brut[] = [...bruit(alea, debut, 80)];

  const ports = new Set<number>(ouverts);
  while (ports.size < 150) ports.add(alea.entier(1, 1024));
  const scanStart = debut + 5 * 60_000;
  let k = 0;
  for (const dport of ports) {
    const ts = scanStart + k * alea.entier(5, 40);
    k++;
    const sport = alea.entier(40000, 60000);
    bruts.push({
      ts,
      src: scanner,
      dst: cible,
      sport,
      dport,
      proto: "TCP",
      length: 58,
      info: `${sport} > ${dport} [SYN]`,
      couches: { Ethernet: eth(), IP: { src: scanner, dst: cible, ttl: 64 }, TCP: { sport, dport, flags: "SYN" } },
      malveillant: true,
      etiquette: "port_scan",
    });
    const ouvert = ouverts.includes(dport);
    bruts.push({
      ts: ts + alea.entier(1, 5),
      src: cible,
      dst: scanner,
      sport: dport,
      dport: sport,
      proto: "TCP",
      length: 58,
      info: ouvert ? `${dport} > ${sport} [SYN, ACK]` : `${dport} > ${sport} [RST, ACK]`,
      couches: { Ethernet: eth(), IP: { src: cible, dst: scanner, ttl: 64 }, TCP: { sport: dport, dport: sport, flags: ouvert ? "SYN,ACK" : "RST,ACK" } },
      malveillant: true,
      etiquette: "port_scan",
    });
  }

  return {
    slug: "balayage-ports",
    titre: "Balayage de ports (port scan)",
    graine: opts.graine,
    paquets: finaliser(bruts),
    verite: {
      attaque: "port_scan",
      description: `L'hote ${scanner} envoie des SYN vers de nombreux ports de ${cible} : c'est un balayage de ports.`,
      pistes: [
        "Une source unique contacte enormement de ports differents d'une meme cible",
        "Les ports fermes repondent RST,ACK ; les ouverts repondent SYN,ACK",
      ],
      exercices: [
        { id: "scanner", question: "Quelle adresse IP effectue le balayage de ports ?", indice: "Cherche une source unique vers beaucoup de ports.", reponse: scanner },
        { id: "cible", question: "Quelle est l'IP cible du balayage ?", indice: "La destination des SYN.", reponse: cible },
        { id: "ouverts", question: "Combien de ports ouverts (SYN,ACK) ont ete trouves ?", indice: "Compte les reponses SYN,ACK.", reponse: String(ouverts.length) },
      ],
    },
  };
}

/** 2) Exfiltration / tunnel DNS. */
export function genererDnsExfil(opts: OptionsCapture): Capture {
  const alea = new Alea(opts.graine + ":dnsexfil");
  const debut = opts.debut ?? BASE_DEFAUT;
  const hote = "10.0.0.23";
  const domaine = "exfil.example.com";
  const resolver = "198.51.100.53";
  const bruts: Brut[] = [...bruit(alea, debut, 90)];

  const alpha = "abcdefghijklmnopqrstuvwxyz234567";
  const nb = alea.entier(60, 90);
  for (let i = 0; i < nb; i++) {
    const ts = debut + 4 * 60_000 + i * alea.entier(200, 1500);
    const sport = alea.entier(49152, 65535);
    let label = "";
    for (let j = 0; j < 28; j++) label += alea.choix(alpha.split(""));
    const qname = `${label}.${domaine}`;
    bruts.push({
      ts,
      src: hote,
      dst: resolver,
      sport,
      dport: 53,
      proto: "DNS",
      length: alea.entier(120, 180),
      info: `Standard query TXT ${qname}`,
      couches: { Ethernet: eth(), IP: { src: hote, dst: resolver, ttl: 64 }, UDP: { sport, dport: 53 }, DNS: { type: "query", enregistrement: "TXT", nom: qname } },
      malveillant: true,
      etiquette: "dns_exfil",
    });
  }

  return {
    slug: "exfiltration-dns",
    titre: "Exfiltration par tunnel DNS",
    graine: opts.graine,
    paquets: finaliser(bruts),
    verite: {
      attaque: "dns_exfil",
      description: `L'hote ${hote} envoie de nombreuses requetes DNS avec de longs sous-domaines encodes vers ${domaine} : exfiltration par tunnel DNS.`,
      pistes: [
        "Beaucoup de requetes DNS vers le meme domaine parent",
        "Sous-domaines longs et aleatoires (donnees encodees), souvent en TXT",
      ],
      exercices: [
        { id: "domaine", question: "Quel domaine parent sert au tunnel DNS ?", indice: "Le domaine commun a toutes les requetes suspectes.", reponse: domaine },
        { id: "hote", question: "Quelle IP interne exfiltre les donnees ?", indice: "La source des requetes suspectes.", reponse: hote },
      ],
    },
  };
}

/** 3) Televersement de fichier en HTTP. */
export function genererHttpUpload(opts: OptionsCapture): Capture {
  const alea = new Alea(opts.graine + ":httpupload");
  const debut = opts.debut ?? BASE_DEFAUT;
  const client = "10.0.0.15";
  const serveur = "10.0.0.80";
  const fichier = "donnees_clients.csv";
  const bruts: Brut[] = [...bruit(alea, debut, 70)];

  // Navigation normale (GET) sur le serveur interne.
  for (let i = 0; i < 20; i++) {
    const ts = debut + i * alea.entier(500, 3000);
    const sport = alea.entier(49152, 65535);
    const uri = alea.choix(["/", "/produits", "/contact", "/static/app.js"]);
    bruts.push({
      ts,
      src: client,
      dst: serveur,
      sport,
      dport: 80,
      proto: "HTTP",
      length: alea.entier(300, 900),
      info: `GET ${uri} HTTP/1.1`,
      couches: { Ethernet: eth(), IP: { src: client, dst: serveur, ttl: 64 }, TCP: { sport, dport: 80, flags: "PSH,ACK" }, HTTP: { methode: "GET", uri, hote: "intranet.example.com" } },
      malveillant: false,
    });
  }

  // Le televersement.
  const tsUp = debut + 8 * 60_000;
  const sportUp = alea.entier(49152, 65535);
  bruts.push({
    ts: tsUp,
    src: client,
    dst: serveur,
    sport: sportUp,
    dport: 80,
    proto: "HTTP",
    length: 2480,
    info: `POST /upload HTTP/1.1 (multipart, fichier ${fichier})`,
    couches: {
      Ethernet: eth(),
      IP: { src: client, dst: serveur, ttl: 64 },
      TCP: { sport: sportUp, dport: 80, flags: "PSH,ACK" },
      HTTP: { methode: "POST", uri: "/upload", hote: "intranet.example.com", contenu: "multipart/form-data", fichier },
    },
    malveillant: true,
    etiquette: "televersement",
  });

  return {
    slug: "televersement-http",
    titre: "Televersement de fichier en HTTP",
    graine: opts.graine,
    paquets: finaliser(bruts),
    verite: {
      attaque: "exfiltration_http",
      description: `Le client ${client} televerse le fichier ${fichier} vers ${serveur} via une requete HTTP POST /upload.`,
      pistes: [
        "Cherche une requete POST (le reste est en GET)",
        "Le nom du fichier apparait dans la requete multipart",
      ],
      exercices: [
        { id: "fichier", question: "Quel fichier a ete televerse en HTTP ?", indice: "Regarde la requete POST /upload.", reponse: fichier },
        { id: "serveur", question: "Vers quelle IP serveur le fichier part-il ?", indice: "La destination de la requete POST.", reponse: serveur },
      ],
    },
  };
}

export const SCENARIOS: Record<string, (o: OptionsCapture) => Capture> = {
  "balayage-ports": genererPortScan,
  "exfiltration-dns": genererDnsExfil,
  "televersement-http": genererHttpUpload,
};

export function genererCapture(slug: string, opts: OptionsCapture): Capture {
  const gen = SCENARIOS[slug];
  if (!gen) throw new Error(`Capture inconnue : ${slug}`);
  return gen(opts);
}
