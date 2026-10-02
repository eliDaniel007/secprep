import { describe, it, expect } from "vitest";
import {
  planifierSM2,
  qualiteSM2,
  prochaineRevision,
  ETAT_SM2_INITIAL,
} from "./sm2";

describe("qualiteSM2", () => {
  it("correct sans indice = 5, avec indice = 4, rate = 2", () => {
    expect(qualiteSM2(true, false)).toBe(5);
    expect(qualiteSM2(true, true)).toBe(4);
    expect(qualiteSM2(false, false)).toBe(2);
  });
});

describe("planifierSM2", () => {
  it("premiere reussite : intervalle 1 jour", () => {
    const e = planifierSM2(ETAT_SM2_INITIAL, 5);
    expect(e.repetitions).toBe(1);
    expect(e.intervalleJours).toBe(1);
    expect(e.facilite).toBeGreaterThan(2.5);
  });

  it("deuxieme reussite : intervalle 6 jours", () => {
    let e = planifierSM2(ETAT_SM2_INITIAL, 5);
    e = planifierSM2(e, 5);
    expect(e.repetitions).toBe(2);
    expect(e.intervalleJours).toBe(6);
  });

  it("troisieme reussite : intervalle = 6 * facilite", () => {
    let e = planifierSM2(ETAT_SM2_INITIAL, 4);
    e = planifierSM2(e, 4);
    const avant = e.intervalleJours;
    e = planifierSM2(e, 4);
    expect(e.repetitions).toBe(3);
    expect(e.intervalleJours).toBe(Math.round(avant * e.facilite));
    expect(e.intervalleJours).toBeGreaterThan(6);
  });

  it("echec : reinitialise les repetitions et intervalle 1", () => {
    let e = planifierSM2(ETAT_SM2_INITIAL, 5);
    e = planifierSM2(e, 5);
    e = planifierSM2(e, 2); // rate
    expect(e.repetitions).toBe(0);
    expect(e.intervalleJours).toBe(1);
  });

  it("la facilite ne descend jamais sous 1.3", () => {
    let e = ETAT_SM2_INITIAL;
    for (let i = 0; i < 20; i++) e = planifierSM2(e, 0);
    expect(e.facilite).toBeGreaterThanOrEqual(1.3);
  });
});

describe("prochaineRevision", () => {
  it("ajoute l'intervalle en jours", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const d = prochaineRevision(6, base);
    expect(d.getUTCDate()).toBe(7);
  });
});
