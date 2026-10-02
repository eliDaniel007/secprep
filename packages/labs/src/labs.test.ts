import { describe, it, expect } from "vitest";
import { LABOS, trouverLabo } from "./labs";

function s(stdout: string) {
  return { stdout, stderr: "", code: 0 };
}

describe("LABOS", () => {
  it("contient 5 labos aux slugs uniques", () => {
    expect(LABOS).toHaveLength(5);
    const slugs = new Set(LABOS.map((l) => l.slug));
    expect(slugs.size).toBe(5);
  });

  it("chaque labo a un setup, une consigne, un indice et une commande de verif", () => {
    for (const l of LABOS) {
      expect(l.setup.length).toBeGreaterThan(0);
      expect(l.consigne.length).toBeGreaterThan(0);
      expect(l.indice.length).toBeGreaterThan(0);
      expect(l.verifCommande.length).toBeGreaterThan(0);
    }
  });
});

describe("predicats de validation (attendu)", () => {
  it("permissions : 640 reussit, 600 echoue", () => {
    const l = trouverLabo("permissions")!;
    expect(l.attendu(s("640\n"))).toBe(true);
    expect(l.attendu(s("600"))).toBe(false);
  });

  it("grep : 5 reussit, 4 echoue", () => {
    const l = trouverLabo("grep")!;
    expect(l.attendu(s("5\n"))).toBe(true);
    expect(l.attendu(s("4"))).toBe(false);
  });

  it("find : 2 reussit, autre echoue", () => {
    const l = trouverLabo("find")!;
    expect(l.attendu(s("2"))).toBe(true);
    expect(l.attendu(s("3"))).toBe(false);
  });

  it("awk : les 3 IP dans l'ordre reussissent", () => {
    const l = trouverLabo("awk")!;
    expect(l.attendu(s("10.0.0.1\n10.0.0.2\n10.0.0.1\n"))).toBe(true);
    expect(l.attendu(s("10.0.0.1\n10.0.0.1\n10.0.0.2"))).toBe(false);
  });

  it("top-ip : l'IP la plus frequente reussit", () => {
    const l = trouverLabo("top-ip")!;
    expect(l.attendu(s("203.0.113.5\n"))).toBe(true);
    expect(l.attendu(s("198.51.100.2"))).toBe(false);
  });
});
