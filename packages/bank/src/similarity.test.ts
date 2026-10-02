import { describe, it, expect } from "vitest";
import {
  normaliser,
  similariteEnonces,
  trouverDoublons,
} from "./similarity.js";

describe("normaliser", () => {
  it("retire accents, casse et ponctuation", () => {
    expect(normaliser("Éléphant, GRIS !")).toBe("elephant gris");
  });
});

describe("similariteEnonces", () => {
  it("vaut 1 pour un texte identique", () => {
    expect(similariteEnonces("bonjour le monde", "bonjour le monde")).toBe(1);
  });

  it("est elevee pour des variantes mineures", () => {
    const s = similariteEnonces(
      "Quel pilier de la triade CIA est verifie par un hash ?",
      "Quel pilier de la triade CIA est verifie par un hash?",
    );
    expect(s).toBeGreaterThan(0.9);
  });

  it("est faible pour des textes differents", () => {
    const s = similariteEnonces(
      "Qu'est-ce qu'un controle dissuasif ?",
      "Combien d'hotes dans un reseau /24 ?",
    );
    expect(s).toBeLessThan(0.5);
  });
});

describe("trouverDoublons", () => {
  it("detecte une paire quasi identique au-dela du seuil", () => {
    const d = trouverDoublons(
      [
        { id: "A", enonce: "Un attaquant empoisonne le cache ARP du reseau local." },
        { id: "B", enonce: "Un attaquant empoisonne le cache ARP du reseau local !" },
        { id: "C", enonce: "Quelle est la valeur par defaut du port SSH ?" },
      ],
      0.9,
    );
    expect(d).toHaveLength(1);
    expect(d[0]!.idA).toBe("A");
    expect(d[0]!.idB).toBe("B");
  });
});
