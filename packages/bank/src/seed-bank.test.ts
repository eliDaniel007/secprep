import { describe, it, expect } from "vitest";
import { chargerDossier, DOSSIER_SEED } from "./loader.js";
import { validerBanque } from "./validator.js";
import { versRow } from "./mapper.js";

/** Verifie que le lot de depart fourni se charge sans erreur et se mappe. */
describe("banque de depart (data/seed)", () => {
  const fichiers = chargerDossier(DOSSIER_SEED);

  it("contient au moins un fichier", () => {
    expect(fichiers.length).toBeGreaterThan(0);
  });

  it("passe la validation sans erreur", () => {
    const r = validerBanque(fichiers);
    if (!r.ok) {
      console.error(r.erreurs);
    }
    expect(r.ok).toBe(true);
    expect(r.questionsValides.length).toBeGreaterThanOrEqual(36);
  });

  it("se mappe vers des lignes Prisma avec un contenu JSON valide", () => {
    const r = validerBanque(fichiers);
    for (const q of r.questionsValides) {
      const row = versRow(q);
      expect(row.id).toBe(q.id);
      expect(() => JSON.parse(row.contenu)).not.toThrow();
      expect(() => JSON.parse(row.tags)).not.toThrow();
    }
  });
});
