// Donnees fictives uniquement : plages reservees (RFC 1918 interne, RFC 5737
// pour "externe"), domaines example.*.

export const UTILISATEURS_VALIDES = [
  "a.tremblay",
  "m.gagnon",
  "s.roy",
  "k.cote",
  "j.bouchard",
  "l.gauthier",
  "p.morin",
  "c.lavoie",
  "f.fortin",
  "n.belanger",
];

/** Beaucoup de comptes vises par le spraying (valides + inexistants). */
export const COMPTES_CIBLES = [
  ...UTILISATEURS_VALIDES,
  "admin",
  "administrateur",
  "root",
  "backup",
  "svc_sql",
  "svc_web",
  "test",
  "invite",
  "d.simard",
  "r.pelletier",
  "v.caron",
  "h.girard",
  "o.leclerc",
  "e.dufour",
];

export const HOTES = ["srv-app01", "srv-web01", "srv-dc01", "srv-file01", "vpn-gw01"];

/** IPs internes (RFC 1918). */
export function ipInterne(n: number): string {
  return `10.0.${Math.floor(n / 254) % 254}.${(n % 254) + 1}`;
}

/** IPs "externes" attaquantes (RFC 5737 - documentation, jamais routables). */
export const IPS_ATTAQUANT = ["203.0.113.66", "198.51.100.23", "203.0.113.90"];

/** Mots de passe faibles typiques d'un spraying. */
export const MOTS_DE_PASSE_SPRAY = ["Hiver2026!", "Printemps2026!", "Bienvenue1"];
