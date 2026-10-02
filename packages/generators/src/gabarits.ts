import { Alea } from "@secprep/loggen";
import { idGenere, qcm } from "./util";
import type { QuestionGeneree } from "./types";

function montant(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} $`;
}

const ARO_TEXTE: Record<number, string> = {
  0.1: "en moyenne une fois tous les dix ans",
  0.25: "en moyenne une fois tous les quatre ans",
  0.5: "en moyenne une fois tous les deux ans",
  1: "en moyenne une fois par an",
  2: "en moyenne deux fois par an",
  4: "en moyenne quatre fois par an",
  12: "en moyenne une fois par mois",
};

/** GAB-ALE : perte annuelle attendue (ALE = SLE x ARO, SLE = VA x FE/100). */
export function genererAle(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":ale");
  const va = alea.entier(4, 400) * 5000; // 20 000 .. 2 000 000
  const fe = alea.choix([5, 10, 20, 25, 40, 50, 75, 100]);
  const aro = alea.choix([0.1, 0.25, 0.5, 1, 2, 4, 12]);
  const sle = (va * fe) / 100;
  const ale = Math.round(sle * aro);

  const { options, reponse } = qcm(alea, montant(ale), [
    montant(sle), // a oublie l'ARO
    montant(va * aro), // a oublie le FE
    montant(ale * 2), // erreur de facteur
  ]);

  return {
    id: idGenere("ALE", graine),
    domaine: 5,
    cours_google: 2,
    type: "qcm",
    difficulte: "difficile",
    temps_sec: 90,
    enonce: `Un actif vaut ${montant(va)}. Un incident en detruit ${fe} % de sa valeur et survient ${ARO_TEXTE[aro]}. Quelle est l'ALE (perte annuelle attendue) ?`,
    options,
    reponse,
    explication: `SLE = ${montant(va)} x ${fe} % = ${montant(sle)}. ALE = SLE x ARO (${aro}) = ${montant(ale)}.`,
    indice: "Calcule d'abord la perte par incident (SLE), puis multiplie par l'ARO.",
    astuce: "SLE = AV x EF ; ALE = SLE x ARO.",
    tags: ["risque", "calcul", "ALE"],
    objectif_sy0701: "5.2",
    source: "genere",
    statut: "brouillon",
  };
}

/** GAB-CIDR : nombre d'hotes utilisables = 2^(32 - masque) - 2. */
export function genererCidr(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":cidr");
  const masque = alea.entier(20, 30);
  const reseau = `10.${alea.entier(0, 255)}.${alea.entier(0, 255)}.0`;
  const bits = 32 - masque;
  const hotes = Math.pow(2, bits) - 2;

  const { options, reponse } = qcm(alea, String(hotes), [
    String(Math.pow(2, bits)), // oublie le -2
    String(Math.pow(2, bits) - 1), // -1 au lieu de -2
    String(Math.pow(2, masque)), // confond
  ]);

  return {
    id: idGenere("CIDR", graine),
    domaine: 3,
    cours_google: 3,
    type: "qcm",
    difficulte: "moyen",
    temps_sec: 60,
    enonce: `Combien d'hotes utilisables contient le reseau ${reseau}/${masque} ?`,
    options,
    reponse,
    explication: `2^(32 - ${masque}) - 2 = 2^${bits} - 2 = ${hotes}. On retire l'adresse reseau et l'adresse de diffusion.`,
    indice: "Nombre de bits hotes = 32 - masque ; retire 2 adresses.",
    astuce: "Hotes utilisables = 2^(bits hotes) - 2.",
    tags: ["reseau", "CIDR", "calcul"],
    objectif_sy0701: "3.2",
    source: "genere",
    statut: "brouillon",
  };
}

/** GAB-CHMOD : droits -> notation octale. */
export function genererChmod(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":chmod");
  const proprio = alea.choix([
    { t: "lecture/ecriture", v: 6 },
    { t: "tous les droits", v: 7 },
    { t: "lecture seule", v: 4 },
  ]);
  const groupe = alea.choix([
    { t: "la lecture seule", v: 4 },
    { t: "la lecture et l'execution", v: 5 },
    { t: "aucun droit", v: 0 },
  ]);
  const autres = alea.choix([
    { t: "aucun droit", v: 0 },
    { t: "la lecture seule", v: 4 },
  ]);
  const oct = `${proprio.v}${groupe.v}${autres.v}`;

  const { options, reponse } = qcm(alea, `chmod ${oct} fichier.txt`, [
    `chmod ${groupe.v}${proprio.v}${autres.v} fichier.txt`,
    `chmod ${proprio.v}${autres.v}${groupe.v} fichier.txt`,
    `chmod ${autres.v}${groupe.v}${proprio.v} fichier.txt`,
  ]);

  return {
    id: idGenere("CHMOD", graine),
    domaine: 4,
    cours_google: 4,
    type: "qcm",
    difficulte: "moyen",
    temps_sec: 60,
    enonce: `Quelle commande donne au proprietaire ${proprio.t}, au groupe ${groupe.t} et aux autres ${autres.t} sur fichier.txt ?`,
    options,
    reponse,
    explication: `r=4, w=2, x=1. Proprietaire=${proprio.v}, groupe=${groupe.v}, autres=${autres.v} -> ${oct}.`,
    indice: "Additionne r=4, w=2, x=1 pour chaque categorie.",
    astuce: "Ordre : proprietaire, groupe, autres.",
    tags: ["Linux", "permissions", "chmod"],
    objectif_sy0701: "4.1",
    source: "genere",
    statut: "brouillon",
  };
}

/** GAB-RPO : perte de donnees entre la derniere sauvegarde et la panne. */
export function genererRpo(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":rpo");
  const hSauv = alea.entier(0, 3); // sauvegarde nocturne 00..03
  const hPanne = alea.entier(10, 20);
  const perte = hPanne - hSauv;
  const fmt = (h: number) => `${String(h).padStart(2, "0")} h 00`;

  const { options, reponse } = qcm(alea, `${perte} heures, a comparer au RPO vise`, [
    `${perte} heures, c'est le RTO`,
    `${hSauv} heures, c'est le MTTR`,
    `24 heures, c'est le MTBF`,
  ]);

  return {
    id: idGenere("RPO", graine),
    domaine: 4,
    cours_google: 6,
    type: "plan_reprise",
    difficulte: "moyen",
    temps_sec: 75,
    enonce: `Les sauvegardes completes sont faites chaque nuit a ${fmt(hSauv)}. Une panne totale survient a ${fmt(hPanne)} et seules les sauvegardes sont recuperables. Quelle perte de donnees maximale subit-on et a quelle notion la compare-t-on ?`,
    options,
    reponse,
    explication: `De ${fmt(hSauv)} a ${fmt(hPanne)} = ${perte} h de donnees perdues. Le RPO est la perte maximale toleree ; le RTO est le temps de remise en service.`,
    indice: "RPO = point de recuperation, donc des donnees.",
    astuce: "RPO = perte de donnees ; RTO = temps d'arret.",
    tags: ["RPO", "RTO", "sauvegarde"],
    objectif_sy0701: "3.4",
    source: "genere",
    statut: "brouillon",
  };
}

const PAIRES_PORTS: [string, string][] = [
  ["SSH", "22/TCP"],
  ["HTTPS", "443/TCP"],
  ["DNS", "53/UDP et TCP"],
  ["RDP", "3389/TCP"],
  ["SMTP", "25/TCP"],
  ["LDAPS", "636/TCP"],
  ["IMAPS", "993/TCP"],
  ["HTTP", "80/TCP"],
];

/** GAB-PORTS : associer protocole et port (appariement). */
export function genererPorts(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":ports");
  const pool = [...PAIRES_PORTS];
  // Melange deterministe puis prend 4 paires.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = alea.entier(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const choisies = pool.slice(0, 4);

  return {
    id: idGenere("PORTS", graine),
    domaine: 3,
    cours_google: 3,
    type: "appariement",
    difficulte: "facile",
    temps_sec: 90,
    enonce: "Associe chaque protocole a son port par defaut.",
    paires: choisies.map(([gauche, droite]) => ({ gauche, droite })),
    reponse: "paires_dans_l_ordre",
    explication: "Ports par defaut a connaitre pour l'examen.",
    indice: "Pense aux services courants et a leur port standard.",
    astuce: "SSH 22, HTTP 80, HTTPS 443, DNS 53, RDP 3389.",
    tags: ["reseau", "ports"],
    objectif_sy0701: "3.1",
    source: "genere",
    statut: "brouillon",
  };
}
