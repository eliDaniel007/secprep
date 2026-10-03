import { Alea } from "@secprep/loggen";
import { idGenere, qcm } from "./util";
import type { QuestionGeneree } from "./types";

/* ============================================================================
 * Gabarits supplementaires — 3 axes : calculs/reseau, concepts, scenarios SOC.
 * Tous produisent un QCM a reponse CALCULEE/connue (donc juste par construction).
 * ==========================================================================*/

/* ---------------------- Concepts : cryptographie ------------------------- */
const CRYPTO: { algo: string; cat: "symetrique" | "asymetrique" | "hachage" }[] = [
  { algo: "AES", cat: "symetrique" },
  { algo: "3DES", cat: "symetrique" },
  { algo: "ChaCha20", cat: "symetrique" },
  { algo: "RSA", cat: "asymetrique" },
  { algo: "ECC", cat: "asymetrique" },
  { algo: "Diffie-Hellman", cat: "asymetrique" },
  { algo: "SHA-256", cat: "hachage" },
  { algo: "SHA-3", cat: "hachage" },
  { algo: "MD5", cat: "hachage" },
  { algo: "bcrypt", cat: "hachage" },
];
const CAT_LIBELLE = {
  symetrique: "chiffrement symetrique",
  asymetrique: "chiffrement asymetrique (cle publique)",
  hachage: "fonction de hachage",
};

/** GAB-CRYPTO : classer un algorithme (symetrique / asymetrique / hachage). */
export function genererCrypto(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":crypto");
  const item = alea.choix(CRYPTO);
  const { options, reponse } = qcm(alea, CAT_LIBELLE[item.cat], [
    CAT_LIBELLE.symetrique,
    CAT_LIBELLE.asymetrique,
    CAT_LIBELLE.hachage,
  ].filter((c) => c !== CAT_LIBELLE[item.cat]));

  return {
    id: idGenere("CRYPTO", graine),
    domaine: 1,
    cours_google: 5,
    type: "qcm",
    difficulte: "facile",
    temps_sec: 40,
    enonce: `A quelle categorie appartient l'algorithme ${item.algo} ?`,
    options,
    reponse,
    explication: `${item.algo} est un(e) ${CAT_LIBELLE[item.cat]}.`,
    indice: "Pense a ce que fait l'algorithme : chiffrer avec une meme cle, deux cles, ou produire une empreinte.",
    astuce: "Symetrique = meme cle ; asymetrique = paire de cles ; hachage = empreinte a sens unique.",
    tags: ["cryptographie", "concepts"],
    objectif_sy0701: "1.4",
    source: "genere",
    statut: "brouillon",
  };
}

/* ---------------------- Concepts : type de controle ---------------------- */
const CONTROLES: { mesure: string; type: string }[] = [
  { mesure: "Pare-feu bloquant un port", type: "preventif" },
  { mesure: "Chiffrement des disques", type: "preventif" },
  { mesure: "Formation anti-hameconnage", type: "preventif" },
  { mesure: "Camera de surveillance (enregistrement)", type: "detectif" },
  { mesure: "Systeme de detection d'intrusion (IDS)", type: "detectif" },
  { mesure: "Revue des journaux", type: "detectif" },
  { mesure: "Restauration depuis une sauvegarde", type: "correctif" },
  { mesure: "Plan de reprise apres sinistre", type: "correctif" },
  { mesure: "Banniere d'avertissement legal", type: "dissuasif" },
  { mesure: "Panneau 'site sous video-surveillance'", type: "dissuasif" },
];
const TYPES_CONTROLE = ["preventif", "detectif", "correctif", "dissuasif"];

/** GAB-CONTROLE : classer une mesure (preventif/detectif/correctif/dissuasif). */
export function genererControle(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":controle");
  const item = alea.choix(CONTROLES);
  const { options, reponse } = qcm(
    alea,
    item.type,
    TYPES_CONTROLE.filter((t) => t !== item.type),
  );
  return {
    id: idGenere("CONTROLE", graine),
    domaine: 1,
    cours_google: 1,
    type: "qcm",
    difficulte: "moyen",
    temps_sec: 45,
    enonce: `De quel type de controle s'agit-il : « ${item.mesure} » ?`,
    options,
    reponse,
    explication: `« ${item.mesure} » est un controle ${item.type}.`,
    indice: "Preventif = empeche ; detectif = repere ; correctif = repare ; dissuasif = decourage.",
    astuce: "Demande-toi si la mesure agit AVANT, PENDANT ou APRES l'incident.",
    tags: ["controles", "concepts", "GRC"],
    objectif_sy0701: "1.1",
    source: "genere",
    statut: "brouillon",
  };
}

/* ---------------------- Concepts : identifier l'attaque ------------------ */
const ATTAQUES: { desc: string; nom: string }[] = [
  { desc: "Un attaquant intercepte et relaie le trafic entre deux parties sans qu'elles le sachent", nom: "Homme du milieu (MitM)" },
  { desc: "De nombreuses machines inondent un serveur pour le rendre indisponible", nom: "Deni de service distribue (DDoS)" },
  { desc: "Un courriel usurpe l'identite d'un dirigeant pour obtenir un virement", nom: "Fraude au president (BEC)" },
  { desc: "Injection de code SQL via un champ de formulaire pour lire la base", nom: "Injection SQL" },
  { desc: "Essai du meme mot de passe courant sur de nombreux comptes", nom: "Password spraying" },
  { desc: "Un logiciel chiffre les fichiers et exige une rancon", nom: "Rancongiciel (ransomware)" },
  { desc: "Un site piege execute du script dans le navigateur de la victime", nom: "Cross-site scripting (XSS)" },
  { desc: "L'attaquant epuise la liste des mots de passe possibles", nom: "Force brute" },
];

/** GAB-ATTAQUE : relier une description a l'attaque correspondante. */
export function genererAttaque(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":attaque");
  const pool = [...ATTAQUES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = alea.entier(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const bonne = pool[0]!;
  const distracteurs = pool.slice(1, 4).map((a) => a.nom);
  const { options, reponse } = qcm(alea, bonne.nom, distracteurs);
  return {
    id: idGenere("ATTAQUE", graine),
    domaine: 2,
    cours_google: 2,
    type: "qcm",
    difficulte: "moyen",
    temps_sec: 45,
    enonce: `Quelle attaque correspond a cette description : « ${bonne.desc} » ?`,
    options,
    reponse,
    explication: `Cette description correspond a : ${bonne.nom}.`,
    indice: "Concentre-toi sur le mecanisme decrit (interception, inondation, usurpation, injection...).",
    astuce: "Associe chaque famille d'attaque a son mecanisme caracteristique.",
    tags: ["menaces", "attaques", "concepts"],
    objectif_sy0701: "2.4",
    source: "genere",
    statut: "brouillon",
  };
}

/* ---------------------- Scenarios SOC : premiere action ------------------ */
const SOC: { contexte: string; bonne: string; mauvaises: string[] }[] = [
  {
    contexte: "Un poste declenche une alerte EDR de rancongiciel en cours de chiffrement",
    bonne: "Isoler le poste du reseau (confinement)",
    mauvaises: ["Formater le poste immediatement", "Payer la rancon", "Ignorer, l'EDR va gerer"],
  },
  {
    contexte: "Un utilisateur signale avoir clique sur un lien d'hameconnage et saisi son mot de passe",
    bonne: "Reinitialiser son mot de passe et verifier les connexions recentes",
    mauvaises: ["Supprimer le courriel et classer l'incident", "Attendre de voir s'il se passe quelque chose", "Desactiver definitivement son compte"],
  },
  {
    contexte: "Le SIEM montre 200 echecs d'authentification puis un succes depuis une IP etrangere",
    bonne: "Bloquer l'IP et verrouiller le compte concerne",
    mauvaises: ["Augmenter le seuil d'alerte pour reduire le bruit", "Supprimer les journaux", "Rien, c'est un faux positif"],
  },
  {
    contexte: "Un serveur web expose publiquement renvoie des erreurs apres une requete contenant ' OR '1'='1",
    bonne: "Preserver les journaux et evaluer une possible injection SQL",
    mauvaises: ["Redemarrer le serveur pour nettoyer", "Effacer les journaux d'acces", "Donner plus de droits a l'application"],
  },
  {
    contexte: "Une cle API de production apparait en clair dans un depot public",
    bonne: "Revoquer et regenerer la cle immediatement",
    mauvaises: ["Rendre le depot prive et garder la cle", "Noter pour la prochaine revue trimestrielle", "Changer juste le nom de la cle"],
  },
  {
    contexte: "Un employe sur le depart copie 3 Go vers une cle USB a 23h",
    bonne: "Preserver les preuves et impliquer RH/juridique",
    mauvaises: ["Confronter l'employe seul sur-le-champ", "Effacer la cle USB", "Attendre son depart pour investiguer"],
  },
];

/** GAB-SOC : premiere action face a un mini-scenario d'incident. */
export function genererSoc(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":soc");
  const cas = alea.choix(SOC);
  const { options, reponse } = qcm(alea, cas.bonne, cas.mauvaises);
  return {
    id: idGenere("SOC", graine),
    domaine: 4,
    cours_google: 6,
    type: "scenario",
    difficulte: "moyen",
    temps_sec: 60,
    enonce: `${cas.contexte}. Quelle est la PREMIERE action la plus appropriee ?`,
    options,
    reponse,
    explication: `Bonne premiere action : ${cas.bonne}. On confine/preserve avant d'eradiquer ou de reparer.`,
    indice: "Pense a l'ordre : confinement et preservation des preuves avant correction.",
    astuce: "Confinement -> preservation -> eradication -> recuperation.",
    tags: ["SOC", "reponse a incident", "scenario"],
    objectif_sy0701: "4.8",
    source: "genere",
    statut: "brouillon",
  };
}

/* ---------------------- Calculs : RAID ----------------------------------- */
/** GAB-RAID : capacite utile d'une grappe RAID-5 (N-1 disques utiles). */
export function genererRaid(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":raid");
  const n = alea.entier(3, 8);
  const taille = alea.choix([1, 2, 4, 6, 8]); // To par disque
  const utile = (n - 1) * taille;
  const { options, reponse } = qcm(alea, `${utile} To`, [
    `${n * taille} To`, // oublie la parite
    `${(n - 2) * taille} To`, // confond avec RAID-6
    `${taille} To`, // confond avec miroir
  ]);
  return {
    id: idGenere("RAID", graine),
    domaine: 3,
    cours_google: 6,
    type: "qcm",
    difficulte: "moyen",
    temps_sec: 60,
    enonce: `Une grappe RAID-5 compte ${n} disques de ${taille} To. Quelle est la capacite utile (hors parite) ?`,
    options,
    reponse,
    explication: `En RAID-5, l'equivalent d'un disque sert a la parite : (${n} - 1) x ${taille} = ${utile} To.`,
    indice: "RAID-5 : la parite occupe l'equivalent d'UN disque.",
    astuce: "RAID-5 utile = (N - 1) x taille ; RAID-6 = (N - 2) x taille.",
    tags: ["RAID", "disponibilite", "calcul"],
    objectif_sy0701: "3.4",
    source: "genere",
    statut: "brouillon",
  };
}

/* ---------------------- Calculs : entropie de mot de passe --------------- */
const JEUX: { nom: string; taille: number }[] = [
  { nom: "chiffres (0-9)", taille: 10 },
  { nom: "minuscules (a-z)", taille: 26 },
  { nom: "minuscules + majuscules", taille: 52 },
  { nom: "alphanumerique", taille: 62 },
  { nom: "alphanumerique + symboles", taille: 95 },
];

/** GAB-ENTROPIE : bits d'entropie approx = round(L x log2(C)). */
export function genererEntropie(graine: string): QuestionGeneree {
  const alea = new Alea(graine + ":entropie");
  const jeu = alea.choix(JEUX);
  const L = alea.entier(6, 16);
  const bits = Math.round(L * Math.log2(jeu.taille));
  const { options, reponse } = qcm(alea, `${bits} bits`, [
    `${Math.round(L * Math.log10(jeu.taille))} bits`, // log10 au lieu de log2
    `${L * jeu.taille} bits`, // produit brut
    `${Math.round(bits * 1.5)} bits`, // surestimation
  ]);
  return {
    id: idGenere("ENTROPIE", graine),
    domaine: 1,
    cours_google: 5,
    type: "qcm",
    difficulte: "difficile",
    temps_sec: 75,
    enonce: `Un mot de passe de ${L} caracteres pris dans un jeu de ${jeu.nom} (${jeu.taille} symboles). Quelle est son entropie approximative ?`,
    options,
    reponse,
    explication: `Entropie = longueur x log2(taille du jeu) = ${L} x log2(${jeu.taille}) ≈ ${bits} bits.`,
    indice: "Entropie (bits) = L x log2(C), ou C est la taille du jeu de caracteres.",
    astuce: "Chaque caractere ajoute log2(C) bits. Plus le jeu est grand, plus chaque caractere compte.",
    tags: ["mot de passe", "entropie", "calcul"],
    objectif_sy0701: "1.2",
    source: "genere",
    statut: "brouillon",
  };
}
