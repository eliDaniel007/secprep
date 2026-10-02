/** Evenement de journal normalise. */
export interface EvenementBrut {
  /** Horodatage epoch (ms). */
  ts: number;
  /** Source du journal (ex. "auth_ssh", "windows_security"). */
  source: string;
  /** Action/type (ex. "echec_auth", "succes_auth"). */
  action: string;
  /** Champs structures recherchables. */
  champs: Record<string, string | number>;
  /** Ligne brute lisible. */
  raw: string;
  /** Verite terrain : evenement malveillant ou non. */
  malveillant: boolean;
  /** Etiquette de verite terrain (ex. "password_spraying"). */
  etiquette?: string;
}

export interface VeriteTerrainJournaux {
  attaque: string;
  description: string;
  ipsAttaquant: string[];
  comptesVises: number;
  motsDePasseEssayes: string[];
  fenetre: { debut: number; fin: number };
  compromissions: string[];
  nbEvenementsMalveillants: number;
  /** Ce que l'analyste devrait trouver/conclure. */
  pistes: string[];
}

export interface JeuGenere {
  graine: string;
  titre: string;
  slug: string;
  evenements: EvenementBrut[];
  verite: VeriteTerrainJournaux;
}

export interface OptionsGeneration {
  graine: string;
  /** Volume total approximatif d'evenements (bruit + attaque). */
  volume?: number;
  /** Debut de la fenetre temporelle (epoch ms). Defaut : une base fixe. */
  debut?: number;
  /** Duree de la fenetre en heures. Defaut 24. */
  dureeHeures?: number;
}
