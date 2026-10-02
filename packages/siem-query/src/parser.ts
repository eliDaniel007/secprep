/**
 * Analyseur d'un langage de recherche simple inspire de Splunk :
 *   champ=valeur  champ!=valeur  champ>valeur  (>=, <, <=)
 *   "valeur entre guillemets"   mot_libre (recherche plein texte dans raw)
 *   operateurs : ET / OU / NON (alias AND / OR / NOT)
 *   pipeline : ... | stats count by champ | top champ | stats count
 * Precedence : NON > ET > OU. ET implicite entre atomes adjacents.
 */

export type Operateur = "=" | "!=" | ">" | "<" | ">=" | "<=";

export type Filtre =
  | { type: "comparaison"; champ: string; op: Operateur; valeur: string }
  | { type: "texte"; valeur: string }
  | { type: "non"; sous: Filtre }
  | { type: "et"; gauche: Filtre; droite: Filtre }
  | { type: "ou"; gauche: Filtre; droite: Filtre }
  | { type: "vrai" };

export type Commande =
  | { type: "stats_count_by"; champ: string }
  | { type: "stats_count" }
  | { type: "top"; champ: string; limite: number };

export interface Requete {
  filtre: Filtre;
  pipe: Commande[];
}

export class ErreurRequete extends Error {}

/** Decoupe en respectant les guillemets doubles. */
function tokeniser(s: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    let token = "";
    while (i < s.length && !" \t\n".includes(s[i]!)) {
      if (s[i] === '"') {
        token += '"';
        i++;
        while (i < s.length && s[i] !== '"') {
          token += s[i];
          i++;
        }
        if (i < s.length) {
          token += '"';
          i++;
        }
      } else {
        token += s[i];
        i++;
      }
    }
    tokens.push(token);
  }
  return tokens;
}

const OPS: Operateur[] = [">=", "<=", "!=", "=", ">", "<"];

function deguillemeter(v: string): string {
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) return v.slice(1, -1);
  return v;
}

function atomeDepuisToken(token: string): Filtre {
  for (const op of OPS) {
    const idx = token.indexOf(op);
    // Un operateur valide a un nom de champ non vide avant lui.
    if (idx > 0) {
      const champ = token.slice(0, idx);
      const valeur = token.slice(idx + op.length);
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(champ)) {
        return { type: "comparaison", champ, op, valeur: deguillemeter(valeur) };
      }
    }
  }
  return { type: "texte", valeur: deguillemeter(token) };
}

const MOTS = new Set(["ET", "OU", "NON", "AND", "OR", "NOT"]);
function normMot(t: string): string | null {
  const u = t.toUpperCase();
  if (u === "AND") return "ET";
  if (u === "OR") return "OU";
  if (u === "NOT") return "NON";
  return MOTS.has(u) ? u : null;
}

/** Construit l'arbre de filtre (OU de ET de (NON? atome)). */
function parserFiltre(tokens: string[]): Filtre {
  if (tokens.length === 0) return { type: "vrai" };

  let pos = 0;
  const regarder = () => tokens[pos];
  const estMot = (m: string) => {
    const t = regarder();
    return t !== undefined && normMot(t) === m;
  };

  function parserOu(): Filtre {
    let g = parserEt();
    while (estMot("OU")) {
      pos++;
      const d = parserEt();
      g = { type: "ou", gauche: g, droite: d };
    }
    return g;
  }
  function parserEt(): Filtre {
    let g = parserNon();
    while (pos < tokens.length && !estMot("OU")) {
      if (estMot("ET")) pos++; // ET explicite optionnel
      if (pos >= tokens.length || estMot("OU")) break;
      const d = parserNon();
      g = { type: "et", gauche: g, droite: d };
    }
    return g;
  }
  function parserNon(): Filtre {
    if (estMot("NON")) {
      pos++;
      return { type: "non", sous: parserNon() };
    }
    const t = regarder();
    if (t === undefined || normMot(t) !== null) {
      throw new ErreurRequete("Expression invalide pres de : " + (t ?? "fin"));
    }
    pos++;
    return atomeDepuisToken(t);
  }

  const f = parserOu();
  if (pos < tokens.length) throw new ErreurRequete("Jetons en trop : " + tokens.slice(pos).join(" "));
  return f;
}

function parserCommande(segment: string): Commande {
  const tokens = tokeniser(segment);
  const mot = (tokens[0] ?? "").toLowerCase();
  if (mot === "stats") {
    // stats count [by champ]
    if ((tokens[1] ?? "").toLowerCase() !== "count") {
      throw new ErreurRequete("Seul 'stats count' est supporte.");
    }
    if (tokens.length === 2) return { type: "stats_count" };
    if ((tokens[2] ?? "").toLowerCase() === "by" && tokens[3]) {
      return { type: "stats_count_by", champ: tokens[3] };
    }
    throw new ErreurRequete("Syntaxe : stats count [by champ]");
  }
  if (mot === "top") {
    if (!tokens[1]) throw new ErreurRequete("Syntaxe : top champ [limite]");
    const limite = tokens[2] ? parseInt(tokens[2], 10) : 10;
    return { type: "top", champ: tokens[1], limite: Number.isFinite(limite) ? limite : 10 };
  }
  throw new ErreurRequete("Commande inconnue : " + mot);
}

export function parser(requete: string): Requete {
  const segments = requete.split("|");
  const filtre = parserFiltre(tokeniser(segments[0] ?? ""));
  const pipe = segments.slice(1).map((s) => s.trim()).filter(Boolean).map(parserCommande);
  return { filtre, pipe };
}
