import { describe, it, expect } from "vitest";
import { genererCapture, SCENARIOS } from "./scenarios";
import { statsProtocoles, conversations, suivreFlux } from "./stats";
import { verifierExercice } from "./verifier";

describe("reproductibilite", () => {
  it("meme graine => meme capture pour chaque scenario", () => {
    for (const slug of Object.keys(SCENARIOS)) {
      const a = genererCapture(slug, { graine: "demo" });
      const b = genererCapture(slug, { graine: "demo" });
      expect(a.paquets, slug).toEqual(b.paquets);
    }
  });
  it("graines differentes => captures differentes", () => {
    const a = genererCapture("balayage-ports", { graine: "g1" });
    const b = genererCapture("balayage-ports", { graine: "g2" });
    expect(a.paquets).not.toEqual(b.paquets);
  });
  it("les paquets sont numerotes et tries par temps", () => {
    const c = genererCapture("exfiltration-dns", { graine: "x" });
    c.paquets.forEach((p, i) => expect(p.no).toBe(i + 1));
    for (let i = 1; i < c.paquets.length; i++) {
      expect(c.paquets[i]!.ts).toBeGreaterThanOrEqual(c.paquets[i - 1]!.ts);
    }
  });
});

describe("port scan — verite terrain", () => {
  const c = genererCapture("balayage-ports", { graine: "scan" });
  it("les paquets malveillants viennent du scanner", () => {
    const scanner = c.verite.exercices.find((e) => e.id === "scanner")!.reponse;
    for (const p of c.paquets) {
      if (p.malveillant && p.etiquette === "port_scan") {
        expect([p.src, p.dst]).toContain(scanner);
      }
    }
  });
  it("3 ports ouverts (reponses SYN,ACK)", () => {
    const synack = c.paquets.filter((p) => String(p.couches.TCP?.flags) === "SYN,ACK");
    expect(synack.length).toBe(3);
    expect(c.verite.exercices.find((e) => e.id === "ouverts")!.reponse).toBe("3");
  });
});

describe("dns exfil — verite terrain", () => {
  const c = genererCapture("exfiltration-dns", { graine: "dns" });
  it("toutes les requetes malveillantes visent le domaine d'exfiltration", () => {
    const dom = c.verite.exercices.find((e) => e.id === "domaine")!.reponse;
    for (const p of c.paquets) {
      if (p.malveillant) expect(String(p.couches.DNS?.nom)).toContain(dom);
    }
  });
});

describe("http upload — verite terrain", () => {
  const c = genererCapture("televersement-http", { graine: "http" });
  it("exactement un POST avec le fichier", () => {
    const posts = c.paquets.filter((p) => String(p.couches.HTTP?.methode) === "POST");
    expect(posts).toHaveLength(1);
    const fichier = c.verite.exercices.find((e) => e.id === "fichier")!.reponse;
    expect(String(posts[0]!.couches.HTTP?.fichier)).toBe(fichier);
  });
});

describe("stats et flux", () => {
  const c = genererCapture("balayage-ports", { graine: "s" });
  it("statsProtocoles renvoie des comptes tries", () => {
    const s = statsProtocoles(c.paquets);
    expect(s.length).toBeGreaterThan(0);
    for (let i = 1; i < s.length; i++) expect(s[i - 1]!.count).toBeGreaterThanOrEqual(s[i]!.count);
  });
  it("conversations regroupe par paire d'IP", () => {
    const conv = conversations(c.paquets);
    expect(conv.length).toBeGreaterThan(0);
    expect(conv[0]!.paquets).toBeGreaterThan(0);
  });
  it("suivreFlux renvoie les paquets du meme 5-uplet", () => {
    const flux = suivreFlux(c.paquets, c.paquets[0]!.no);
    expect(flux.length).toBeGreaterThanOrEqual(1);
  });
});

describe("verifierExercice", () => {
  const c = genererCapture("balayage-ports", { graine: "v" });
  it("valide la bonne reponse (insensible casse/espaces)", () => {
    const scanner = c.verite.exercices.find((e) => e.id === "scanner")!.reponse;
    expect(verifierExercice(c.verite, "scanner", ` ${scanner.toUpperCase()} `).reussi).toBe(true);
  });
  it("rejette une mauvaise reponse et donne l'indice", () => {
    const r = verifierExercice(c.verite, "scanner", "10.0.0.1");
    expect(r.reussi).toBe(false);
    expect(r.indice).toBeTruthy();
  });
});
