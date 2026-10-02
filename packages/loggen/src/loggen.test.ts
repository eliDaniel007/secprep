import { describe, it, expect } from "vitest";
import { genererPasswordSpraying } from "./scenarios/password-spraying";
import { IPS_ATTAQUANT } from "./pools";

describe("genererPasswordSpraying — reproductibilite", () => {
  it("meme graine => meme resultat", () => {
    const a = genererPasswordSpraying({ graine: "demo", volume: 1500 });
    const b = genererPasswordSpraying({ graine: "demo", volume: 1500 });
    expect(a.evenements).toEqual(b.evenements);
    expect(a.verite).toEqual(b.verite);
  });

  it("graines differentes => resultats differents", () => {
    const a = genererPasswordSpraying({ graine: "g1", volume: 1500 });
    const b = genererPasswordSpraying({ graine: "g2", volume: 1500 });
    expect(a.evenements).not.toEqual(b.evenements);
  });

  it("respecte le volume demande", () => {
    const a = genererPasswordSpraying({ graine: "v", volume: 2000 });
    expect(a.evenements.length).toBeGreaterThanOrEqual(2000);
  });
});

describe("genererPasswordSpraying — verite terrain exacte", () => {
  const jeu = genererPasswordSpraying({ graine: "verite", volume: 1500 });

  it("le nombre d'evenements malveillants correspond au compte reel", () => {
    const reels = jeu.evenements.filter((e) => e.malveillant).length;
    expect(reels).toBe(jeu.verite.nbEvenementsMalveillants);
  });

  it("tous les evenements malveillants proviennent des IP attaquantes", () => {
    for (const e of jeu.evenements) {
      if (e.malveillant) {
        expect(IPS_ATTAQUANT).toContain(String(e.champs.src_ip));
      }
    }
  });

  it("aucun evenement de bruit n'est etiquete malveillant", () => {
    for (const e of jeu.evenements) {
      if (!e.malveillant) {
        expect(IPS_ATTAQUANT).not.toContain(String(e.champs.src_ip));
      }
    }
  });

  it("la fenetre d'attaque englobe tous les evenements malveillants d'echec", () => {
    const echecs = jeu.evenements.filter(
      (e) => e.malveillant && e.etiquette === "password_spraying",
    );
    for (const e of echecs) {
      expect(e.ts).toBeGreaterThanOrEqual(jeu.verite.fenetre.debut);
      expect(e.ts).toBeLessThanOrEqual(jeu.verite.fenetre.fin);
    }
  });

  it("il existe exactement une compromission (succes malveillant)", () => {
    const comp = jeu.evenements.filter(
      (e) => e.malveillant && e.action === "succes_auth",
    );
    expect(comp).toHaveLength(1);
    expect(jeu.verite.compromissions).toHaveLength(1);
    expect(comp[0]!.champs.user).toBe(jeu.verite.compromissions[0]);
  });

  it("les evenements sont tries par horodatage", () => {
    for (let i = 1; i < jeu.evenements.length; i++) {
      expect(jeu.evenements[i]!.ts).toBeGreaterThanOrEqual(jeu.evenements[i - 1]!.ts);
    }
  });
});
