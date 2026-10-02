import { describe, it, expect } from "vitest";
import { questionSchema } from "@secprep/bank";
import {
  genererAle,
  genererCidr,
  genererChmod,
  genererRpo,
  genererPorts,
  GABARITS,
  genererLot,
} from "./index";

describe("determinisme", () => {
  it("meme graine => meme question pour chaque gabarit", () => {
    for (const [nom, gen] of Object.entries(GABARITS)) {
      expect(gen("g1"), nom).toEqual(gen("g1"));
    }
  });
  it("graines differentes => ids differents (en general)", () => {
    expect(genererAle("a").id).not.toBe(genererAle("b").id);
  });
});

describe("validite au schema de la banque", () => {
  it("chaque gabarit produit une question valide", () => {
    for (const [nom, gen] of Object.entries(GABARITS)) {
      const q = gen("schema-" + nom);
      const r = questionSchema.safeParse(q);
      if (!r.success) console.error(nom, r.error.issues);
      expect(r.success, nom).toBe(true);
    }
  });
});

describe("coherence reponse / explication", () => {
  it("ALE : la bonne option figure dans l'explication", () => {
    const q = genererAle("ale");
    expect(q.explication).toContain(q.options![q.reponse as number]!);
  });
  it("CIDR : la bonne option figure dans l'explication", () => {
    const q = genererCidr("cidr");
    expect(q.explication).toContain(q.options![q.reponse as number]!);
  });
  it("CHMOD : l'octal de la bonne option est dans l'explication", () => {
    const q = genererChmod("chmod");
    const oct = q.options![q.reponse as number]!.replace("chmod ", "").replace(" fichier.txt", "");
    expect(q.explication).toContain(oct);
  });
  it("RPO : la perte en heures est coherente", () => {
    const q = genererRpo("rpo");
    const perte = q.options![q.reponse as number]!.match(/^(\d+) heures/)![1];
    expect(q.explication).toContain(`${perte} h`);
  });
});

describe("options et appariement", () => {
  it("les QCM/plan_reprise ont 4 options et une reponse valide", () => {
    for (const nom of ["ALE", "CIDR", "CHMOD", "RPO"]) {
      const q = GABARITS[nom]!("opt-" + nom);
      expect(q.options, nom).toHaveLength(4);
      expect(q.reponse as number, nom).toBeGreaterThanOrEqual(0);
      expect(q.reponse as number, nom).toBeLessThan(4);
    }
  });
  it("PORTS produit 4 paires", () => {
    const q = genererPorts("ports");
    expect(q.paires).toHaveLength(4);
    expect(q.reponse).toBe("paires_dans_l_ordre");
  });
});

describe("genererLot", () => {
  it("produit des variantes aux ids uniques", () => {
    const lot = genererLot("ALE", "base", 10);
    const ids = new Set(lot.map((q) => q.id));
    expect(ids.size).toBe(lot.length);
    expect(lot.length).toBeGreaterThan(0);
  });
});
