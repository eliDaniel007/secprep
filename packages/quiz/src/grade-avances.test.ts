import { describe, it, expect } from "vitest";
import {
  corrigerQcmMultiple,
  corrigerOrdonnancement,
  corrigerAppariement,
  corrigerCasComplexe,
} from "./grade";

describe("corrigerQcmMultiple", () => {
  it("correct si l'ensemble correspond (ordre indifferent)", () => {
    const r = corrigerQcmMultiple([0, 2], [2, 0], "moyen");
    expect(r.correct).toBe(true);
    expect(r.pointsGagnes).toBe(20);
  });
  it("incorrect si une reponse manque", () => {
    const r = corrigerQcmMultiple([0, 2], [0], "moyen");
    expect(r.correct).toBe(false);
    expect(r.bonsElements).toBe(1);
  });
  it("incorrect si une mauvaise est ajoutee", () => {
    expect(corrigerQcmMultiple([0, 2], [0, 2, 1], "facile").correct).toBe(false);
  });
});

describe("corrigerOrdonnancement", () => {
  it("correct si l'ordre exact", () => {
    expect(corrigerOrdonnancement([2, 0, 1], [2, 0, 1], "difficile").correct).toBe(true);
  });
  it("incorrect sinon, compte les positions justes", () => {
    const r = corrigerOrdonnancement([2, 0, 1], [2, 1, 0], "difficile");
    expect(r.correct).toBe(false);
    expect(r.bonsElements).toBe(1); // seule la position 0 est juste
  });
});

describe("corrigerAppariement", () => {
  const bonnes = ["22/TCP", "443/TCP", "53/UDP et TCP"];
  it("correct si toutes les paires correspondent (normalise)", () => {
    const r = corrigerAppariement(bonnes, ["22/tcp", "443/TCP", "53/udp et tcp"], "facile");
    expect(r.correct).toBe(true);
  });
  it("incorrect si une paire est fausse", () => {
    const r = corrigerAppariement(bonnes, ["443/TCP", "22/TCP", "53/UDP et TCP"], "facile");
    expect(r.correct).toBe(false);
    expect(r.bonsElements).toBe(1);
  });
});

describe("corrigerCasComplexe", () => {
  it("credit partiel et justesse par etape", () => {
    const r = corrigerCasComplexe([1, 1, 1], [1, 0, 1], "difficile");
    expect(r.etapesCorrectes).toEqual([true, false, true]);
    expect(r.bonsElements).toBe(2);
    expect(r.pointsGagnes).toBe(20); // round(30 * 2/3)
    expect(r.correct).toBe(false);
  });
  it("reussite si toutes les etapes sont correctes", () => {
    const r = corrigerCasComplexe([1, 0], [1, 0], "moyen");
    expect(r.correct).toBe(true);
    expect(r.pointsGagnes).toBe(20);
  });
});
