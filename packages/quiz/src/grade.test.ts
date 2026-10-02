import { describe, it, expect } from "vitest";
import { chargerDossier, DOSSIER_SEED, validerBanque } from "@secprep/bank";
import { corrigerQcm, corrigerVf, corrigerLibre } from "./grade";
import type { GrilleLibre } from "./types";

describe("corrigerQcm", () => {
  it("donne les points de base si correct", () => {
    expect(corrigerQcm(1, 1, "moyen")).toEqual({
      correct: true,
      pointsGagnes: 20,
      pointsMax: 20,
    });
  });
  it("donne 0 si incorrect", () => {
    expect(corrigerQcm(1, 0, "facile").pointsGagnes).toBe(0);
  });
  it("applique -50% avec indice", () => {
    expect(corrigerQcm(0, 0, "difficile", true).pointsGagnes).toBe(15);
  });
});

describe("corrigerVf", () => {
  it("corrige vrai/faux", () => {
    expect(corrigerVf(true, true, "facile").correct).toBe(true);
    expect(corrigerVf(true, false, "facile").correct).toBe(false);
  });
});

describe("corrigerLibre", () => {
  const grille: GrilleLibre = {
    modele: "modele",
    mots_cles: [["identification", "detection"], ["confinement", "isoler"], ["eradication"]],
    points: 9,
    seuil_reussite: 6,
  };

  it("note une reponse complete comme reussie", () => {
    const r = corrigerLibre(
      grille,
      "D'abord l'identification, puis le confinement en isolant, enfin l'eradication.",
    );
    expect(r.detail?.groupesTrouves).toBe(3);
    expect(r.pointsGagnes).toBe(9);
    expect(r.correct).toBe(true);
  });

  it("gere les accents et la casse", () => {
    const r = corrigerLibre(grille, "IDENTIFICATION et CONFINEMENT");
    expect(r.detail?.groupesTrouves).toBe(2);
  });

  it("echoue sur une reponse vide", () => {
    const r = corrigerLibre(grille, "");
    expect(r.pointsGagnes).toBe(0);
    expect(r.correct).toBe(false);
    expect(r.detail?.groupesManques).toHaveLength(3);
  });

  it("applique -50% avec indice", () => {
    const r = corrigerLibre(grille, "identification confinement eradication", true);
    expect(r.pointsGagnes).toBe(5); // round(9 * 0.5)
  });
});

describe("corrigerLibre sur les vraies questions de la banque", () => {
  const fichiers = chargerDossier(DOSSIER_SEED);
  const { questionsValides } = validerBanque(fichiers);
  const libres = questionsValides.filter((q) => q.type === "libre");

  it("il existe des questions libres", () => {
    expect(libres.length).toBeGreaterThan(0);
  });

  it("la reponse modele atteint le seuil de reussite", () => {
    for (const q of libres) {
      if (q.type !== "libre") continue;
      const r = corrigerLibre(q.reponse as GrilleLibre, q.reponse.modele);
      expect(r.correct, `question ${q.id}`).toBe(true);
    }
  });

  it("une reponse vide echoue toujours", () => {
    for (const q of libres) {
      if (q.type !== "libre") continue;
      const r = corrigerLibre(q.reponse as GrilleLibre, "");
      expect(r.correct, `question ${q.id}`).toBe(false);
    }
  });
});
