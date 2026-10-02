import { parser, type Filtre, type Requete } from "./parser";

/** Evenement minimal attendu par le moteur (compatible @secprep/loggen). */
export interface EvenementSiem {
  ts: number;
  source: string;
  action: string;
  champs: Record<string, string | number>;
  raw: string;
  [k: string]: unknown;
}

export interface OptionsRecherche {
  debut?: number;
  fin?: number;
}

export type ResultatRecherche =
  | { type: "evenements"; evenements: EvenementSiem[]; total: number }
  | { type: "stats"; champ: string | null; lignes: { cle: string; count: number }[] }
  | { type: "count"; total: number };

function valeurChamp(e: EvenementSiem, champ: string): string | number | undefined {
  if (champ === "source") return e.source;
  if (champ === "action") return e.action;
  if (champ === "ts") return e.ts;
  if (champ === "raw") return e.raw;
  return e.champs[champ];
}

function egal(v: string | number | undefined, valeur: string): boolean {
  if (v === undefined) return false;
  const nv = Number(v);
  const nValeur = Number(valeur);
  if (!Number.isNaN(nv) && !Number.isNaN(nValeur) && valeur.trim() !== "") {
    return nv === nValeur;
  }
  return String(v).toLowerCase() === valeur.toLowerCase();
}

function comparerNum(v: string | number | undefined, valeur: string, op: ">" | "<" | ">=" | "<="): boolean {
  const nv = Number(v);
  const nValeur = Number(valeur);
  if (Number.isNaN(nv) || Number.isNaN(nValeur)) return false;
  if (op === ">") return nv > nValeur;
  if (op === "<") return nv < nValeur;
  if (op === ">=") return nv >= nValeur;
  return nv <= nValeur;
}

export function evaluer(f: Filtre, e: EvenementSiem): boolean {
  switch (f.type) {
    case "vrai":
      return true;
    case "texte":
      return e.raw.toLowerCase().includes(f.valeur.toLowerCase());
    case "non":
      return !evaluer(f.sous, e);
    case "et":
      return evaluer(f.gauche, e) && evaluer(f.droite, e);
    case "ou":
      return evaluer(f.gauche, e) || evaluer(f.droite, e);
    case "comparaison": {
      const v = valeurChamp(e, f.champ);
      switch (f.op) {
        case "=":
          return egal(v, f.valeur);
        case "!=":
          return !egal(v, f.valeur);
        default:
          return comparerNum(v, f.valeur, f.op);
      }
    }
  }
}

function appliquerPipe(evenements: EvenementSiem[], req: Requete): ResultatRecherche {
  if (req.pipe.length === 0) {
    return { type: "evenements", evenements, total: evenements.length };
  }
  // On applique la premiere commande de pipe (suffisant pour le langage actuel).
  const cmd = req.pipe[0]!;
  if (cmd.type === "stats_count") {
    return { type: "count", total: evenements.length };
  }
  const champ = cmd.type === "stats_count_by" ? cmd.champ : cmd.champ;
  const compte = new Map<string, number>();
  for (const e of evenements) {
    const v = valeurChamp(e, champ);
    const cle = v === undefined ? "(absent)" : String(v);
    compte.set(cle, (compte.get(cle) ?? 0) + 1);
  }
  let lignes = [...compte.entries()].map(([cle, count]) => ({ cle, count }));
  lignes.sort((a, b) => b.count - a.count || a.cle.localeCompare(b.cle));
  if (cmd.type === "top") lignes = lignes.slice(0, cmd.limite);
  return { type: "stats", champ, lignes };
}

/** Execute une requete sur un jeu d'evenements. */
export function rechercher(
  evenements: EvenementSiem[],
  requete: string,
  opts: OptionsRecherche = {},
): ResultatRecherche {
  const req = parser(requete);
  const filtres = evenements.filter((e) => {
    if (opts.debut !== undefined && e.ts < opts.debut) return false;
    if (opts.fin !== undefined && e.ts > opts.fin) return false;
    return evaluer(req.filtre, e);
  });
  return appliquerPipe(filtres, req);
}
