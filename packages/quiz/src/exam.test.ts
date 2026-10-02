import { describe, it, expect } from "vitest";
import {
  repartitionExamen,
  scoreExamen,
  examenReussi,
  PONDERATION_DOMAINE,
} from "./exam";

describe("repartitionExamen", () => {
  it("la somme fait exactement le nombre demande", () => {
    for (const n of [5, 10, 20, 50, 90]) {
      const r = repartitionExamen(n);
      const total = Object.values(r).reduce((s, x) => s + x, 0);
      expect(total, `n=${n}`).toBe(n);
    }
  });

  it("respecte approximativement la ponderation pour 90 questions", () => {
    const r = repartitionExamen(90);
    // 90 * 28% = 25.2 -> D4 doit etre le plus represente
    const max = Math.max(...Object.values(r));
    expect(r[4]).toBe(max);
    // ordre de grandeur attendu
    expect(r[1]).toBeGreaterThanOrEqual(10); // 12% de 90 ~ 10.8
  });

  it("chaque domaine a au moins 1 question pour 10", () => {
    const r = repartitionExamen(10);
    for (const d of [1, 2, 3, 4, 5]) expect(r[d]).toBeGreaterThanOrEqual(1);
  });
});

describe("scoreExamen", () => {
  it("0 -> 100, tout -> 900", () => {
    expect(scoreExamen(0, 100)).toBe(100);
    expect(scoreExamen(100, 100)).toBe(900);
  });
  it("sans questions, score plancher", () => {
    expect(scoreExamen(0, 0)).toBe(100);
  });
  it("le seuil 750 correspond a ~81%", () => {
    expect(examenReussi(scoreExamen(81, 100))).toBe(false); // 100+0.81*800=748
    expect(examenReussi(scoreExamen(82, 100))).toBe(true); // 756
  });
});

describe("PONDERATION_DOMAINE", () => {
  it("somme a 100%", () => {
    const total = Object.values(PONDERATION_DOMAINE).reduce((s, x) => s + x, 0);
    expect(total).toBe(100);
  });
});
