/** Sortie d'une commande executee dans le bac a sable. */
export interface SortieVerif {
  stdout: string;
  stderr: string;
  code: number;
}

export interface Labo {
  slug: string;
  titre: string;
  objectifSy0701: string;
  coursGoogle: number;
  outils: string[];
  intro: string;
  consigne: string;
  indice: string;
  explication: string;
  /** Script shell d'initialisation du bac a sable (cree les fichiers du labo). */
  setup: string;
  /** Commande executee pour verifier la reussite (dans le bac a sable). */
  verifCommande: string;
  /** Predicat pur : la sortie de verifCommande indique-t-elle la reussite ? */
  attendu: (s: SortieVerif) => boolean;
}

const t = (s: string) => s.trim();

export const LABOS: Labo[] = [
  {
    slug: "permissions",
    titre: "Permissions Linux (chmod)",
    objectifSy0701: "4.1",
    coursGoogle: 4,
    outils: ["chmod", "stat", "ls"],
    intro:
      "Le fichier /work/rapport.txt est en 600 (lecture/ecriture pour le proprietaire seulement).",
    consigne:
      "Donne au GROUPE le droit de LECTURE, sans ajouter d'autres droits. Le resultat attendu est 640.",
    indice: "chmod 640 /work/rapport.txt",
    explication:
      "640 = rw- r-- --- : lecture/ecriture proprietaire, lecture groupe, rien pour les autres.",
    setup:
      "mkdir -p /work && echo 'donnees confidentielles' > /work/rapport.txt && chmod 600 /work/rapport.txt",
    verifCommande: "stat -c %a /work/rapport.txt",
    attendu: (s) => t(s.stdout) === "640",
  },
  {
    slug: "grep",
    titre: "Analyse de journaux (grep)",
    objectifSy0701: "4.9",
    coursGoogle: 8,
    outils: ["grep", "wc"],
    intro: "/work/auth.log contient des lignes d'authentification.",
    consigne:
      "Combien de lignes contiennent exactement 'Failed password' ? Ecris uniquement ce nombre dans /work/reponse.txt.",
    indice: "grep -c 'Failed password' /work/auth.log > /work/reponse.txt",
    explication: "grep -c compte les lignes correspondantes.",
    setup:
      "mkdir -p /work && printf 'Failed password for root from 203.0.113.5\\n" +
      "Accepted password for a.tremblay from 10.0.0.4\\n" +
      "Failed password for admin from 203.0.113.5\\n" +
      "Failed password for root from 198.51.100.2\\n" +
      "Accepted password for m.gagnon from 10.0.0.9\\n" +
      "Failed password for backup from 203.0.113.5\\n" +
      "Failed password for test from 198.51.100.2\\n' > /work/auth.log",
    verifCommande: "cat /work/reponse.txt",
    attendu: (s) => t(s.stdout) === "5",
  },
  {
    slug: "find",
    titre: "Recherche de fichiers (find)",
    objectifSy0701: "4.1",
    coursGoogle: 4,
    outils: ["find", "wc"],
    intro: "/work/data contient des fichiers de tailles variees.",
    consigne:
      "Combien de fichiers sous /work/data font STRICTEMENT plus de 1 Ko (1024 octets) ? Ecris ce nombre dans /work/n.txt.",
    indice: "find /work/data -type f -size +1k | wc -l > /work/n.txt",
    explication: "find -size +1k selectionne les fichiers de plus de 1 Ko.",
    setup:
      "mkdir -p /work/data && head -c 2000 /dev/zero > /work/data/gros1.bin && " +
      "head -c 500 /dev/zero > /work/data/petit.bin && " +
      "head -c 3000 /dev/zero > /work/data/gros2.bin",
    verifCommande: "cat /work/n.txt",
    attendu: (s) => t(s.stdout) === "2",
  },
  {
    slug: "awk",
    titre: "Extraction de colonnes (awk)",
    objectifSy0701: "4.9",
    coursGoogle: 8,
    outils: ["awk"],
    intro: "/work/access.log : chaque ligne commence par une adresse IP.",
    consigne:
      "Extrais la 1re colonne (l'IP) de chaque ligne, dans l'ordre du fichier, une par ligne, dans /work/ips.txt.",
    indice: "awk '{print $1}' /work/access.log > /work/ips.txt",
    explication: "awk '{print $1}' imprime le premier champ de chaque ligne.",
    setup:
      "mkdir -p /work && printf '10.0.0.1 - GET /a\\n10.0.0.2 - GET /b\\n10.0.0.1 - POST /c\\n' > /work/access.log",
    verifCommande: "cat /work/ips.txt",
    attendu: (s) => t(s.stdout) === "10.0.0.1\n10.0.0.2\n10.0.0.1",
  },
  {
    slug: "top-ip",
    titre: "IP la plus frequente (pipeline)",
    objectifSy0701: "4.9",
    coursGoogle: 8,
    outils: ["awk", "sort", "uniq", "head"],
    intro: "/work/fw.log : journal de pare-feu, l'IP source est la 1re colonne.",
    consigne:
      "Quelle IP source apparait le plus souvent ? Ecris uniquement cette IP dans /work/top.txt.",
    indice:
      "awk '{print $1}' /work/fw.log | sort | uniq -c | sort -rn | head -1 | awk '{print $2}' > /work/top.txt",
    explication:
      "On compte les occurrences (sort | uniq -c), on trie par frequence (sort -rn) et on prend la premiere.",
    setup:
      "mkdir -p /work && printf '203.0.113.5 deny\\n198.51.100.2 deny\\n203.0.113.5 deny\\n" +
      "203.0.113.5 allow\\n10.0.0.9 allow\\n198.51.100.2 deny\\n203.0.113.5 deny\\n' > /work/fw.log",
    verifCommande: "cat /work/top.txt",
    attendu: (s) => t(s.stdout) === "203.0.113.5",
  },
];

export function trouverLabo(slug: string): Labo | undefined {
  return LABOS.find((l) => l.slug === slug);
}
