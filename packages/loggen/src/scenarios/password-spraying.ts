import { Alea } from "../prng";
import {
  COMPTES_CIBLES,
  HOTES,
  IPS_ATTAQUANT,
  MOTS_DE_PASSE_SPRAY,
  UTILISATEURS_VALIDES,
  ipInterne,
} from "../pools";
import type { EvenementBrut, JeuGenere, OptionsGeneration } from "../types";

// Base temporelle fixe par defaut (pour la reproductibilite) : 2026-02-02 00:00 UTC.
const BASE_DEFAUT = Date.UTC(2026, 1, 2, 0, 0, 0);

function iso(ts: number): string {
  return new Date(ts).toISOString().replace(".000Z", "Z");
}

function rawAuth(e: {
  ts: number;
  source: string;
  result: string;
  user: string;
  ip: string;
  host: string;
  port?: number;
  eventId?: number;
}): string {
  if (e.source === "windows_security") {
    const libelle = e.result === "succes" ? "An account was successfully logged on" : "An account failed to log on";
    return `${iso(e.ts)} ${e.host} Security EventID=${e.eventId} ${libelle}. Account=${e.user} Source=${e.ip}`;
  }
  const verbe = e.result === "succes" ? "Accepted" : "Failed";
  return `${iso(e.ts)} ${e.host} sshd: ${verbe} password for ${e.user} from ${e.ip} port ${e.port} ssh2`;
}

function faireEvenement(opts: {
  ts: number;
  source: string;
  result: string;
  user: string;
  ip: string;
  host: string;
  port: number;
  malveillant: boolean;
  etiquette?: string;
}): EvenementBrut {
  const eventId = opts.source === "windows_security" ? (opts.result === "succes" ? 4624 : 4625) : undefined;
  const champs: Record<string, string | number> = {
    src_ip: opts.ip,
    user: opts.user,
    host: opts.host,
    result: opts.result,
    port: opts.port,
  };
  if (eventId) champs.event_id = eventId;
  return {
    ts: opts.ts,
    source: opts.source,
    action: opts.result === "succes" ? "succes_auth" : "echec_auth",
    champs,
    raw: rawAuth({ ...opts, eventId }),
    malveillant: opts.malveillant,
    etiquette: opts.etiquette,
  };
}

/**
 * Genere un jeu de journaux d'authentification contenant une attaque de type
 * password spraying noyee dans du bruit normal. Deterministe : meme graine =>
 * meme resultat.
 */
export function genererPasswordSpraying(opts: OptionsGeneration): JeuGenere {
  const alea = new Alea(opts.graine);
  const volume = opts.volume ?? 3000;
  const debut = opts.debut ?? BASE_DEFAUT;
  const dureeMs = (opts.dureeHeures ?? 24) * 3600_000;
  const fin = debut + dureeMs;

  const evenements: EvenementBrut[] = [];

  // --- Attaque : password spraying sur une courte fenetre ---
  // Debute entre 30% et 60% de la fenetre, dure ~15 min.
  const attaqueDebut = debut + Math.floor(dureeMs * (0.3 + alea.prochain() * 0.3));
  const attaqueDuree = 15 * 60_000;
  const nbTentatives = alea.entier(180, 260);
  const comptesVises = new Set<string>();
  let attaqueFinReelle = attaqueDebut;

  for (let i = 0; i < nbTentatives; i++) {
    const ts = attaqueDebut + alea.entier(0, attaqueDuree);
    attaqueFinReelle = Math.max(attaqueFinReelle, ts);
    const user = alea.choix(COMPTES_CIBLES);
    comptesVises.add(user);
    const ip = alea.choix(IPS_ATTAQUANT);
    const source = alea.chance(0.5) ? "auth_ssh" : "windows_security";
    evenements.push(
      faireEvenement({
        ts,
        source,
        result: "echec",
        user,
        ip,
        host: alea.choix(HOTES),
        port: source === "auth_ssh" ? 22 : 3389,
        malveillant: true,
        etiquette: "password_spraying",
      }),
    );
  }

  // Une compromission : un compte valide finit par ceder, pres de la fin.
  const compteCompromis = alea.choix(UTILISATEURS_VALIDES);
  const ipCompromission = alea.choix(IPS_ATTAQUANT);
  evenements.push(
    faireEvenement({
      ts: attaqueFinReelle + alea.entier(1000, 60_000),
      source: "auth_ssh",
      result: "succes",
      user: compteCompromis,
      ip: ipCompromission,
      host: alea.choix(HOTES),
      port: 22,
      malveillant: true,
      etiquette: "password_spraying_compromission",
    }),
  );

  const nbMalveillants = evenements.length;

  // --- Bruit normal : authentifications legitimes sur toute la fenetre ---
  const cible = Math.max(volume, nbMalveillants + 100);
  while (evenements.length < cible) {
    const ts = debut + alea.entier(0, dureeMs);
    const succes = alea.chance(0.9); // majorite de succes
    const source = alea.chance(0.5) ? "auth_ssh" : "windows_security";
    evenements.push(
      faireEvenement({
        ts,
        source,
        result: succes ? "succes" : "echec",
        user: alea.choix(UTILISATEURS_VALIDES),
        ip: ipInterne(alea.entier(0, 400)),
        host: alea.choix(HOTES),
        port: source === "auth_ssh" ? 22 : 3389,
        malveillant: false,
      }),
    );
  }

  // Tri stable par horodatage.
  evenements.sort((a, b) => a.ts - b.ts);

  return {
    graine: opts.graine,
    titre: "Password spraying sur l'authentification",
    slug: "password-spraying",
    evenements,
    verite: {
      attaque: "password_spraying",
      description:
        "Un petit nombre de mots de passe est essaye sur un grand nombre de comptes depuis des IP externes, aboutissant a la compromission d'un compte.",
      ipsAttaquant: [...IPS_ATTAQUANT],
      comptesVises: comptesVises.size,
      motsDePasseEssayes: [...MOTS_DE_PASSE_SPRAY],
      fenetre: { debut: attaqueDebut, fin: attaqueFinReelle },
      compromissions: [compteCompromis],
      nbEvenementsMalveillants: nbMalveillants,
      pistes: [
        "Beaucoup d'echecs d'authentification sur de nombreux comptes differents",
        "Peu de sources (IP externes RFC 5737) a l'origine des echecs",
        "Une connexion reussie depuis une IP externe apres la salve d'echecs = compromission",
        "Mitigations : MFA, verrouillage intelligent, detection des tentatives distribuees",
      ],
    },
  };
}
