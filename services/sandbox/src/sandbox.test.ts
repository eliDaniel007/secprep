import { describe, it, expect } from "vitest";
import { construireArgsRun, nomConteneur, IMAGE } from "./sandbox";

describe("construireArgsRun — isolation stricte", () => {
  const args = construireArgsRun("secprep-test-abcd1234");
  const joint = args.join(" ");

  it("desactive le reseau", () => {
    expect(joint).toContain("--network none");
  });
  it("monte un systeme de fichiers en lecture seule", () => {
    expect(args).toContain("--read-only");
  });
  it("utilise un dossier de travail tmpfs", () => {
    expect(joint).toContain("/work:rw");
  });
  it("limite memoire, CPU et PID", () => {
    expect(args).toContain("--memory");
    expect(args).toContain("--cpus");
    expect(args).toContain("--pids-limit");
  });
  it("tourne en utilisateur non privilegie", () => {
    expect(joint).toContain("--user 1000:1000");
  });
  it("retire les capacites et interdit l'elevation de privileges", () => {
    expect(joint).toContain("--cap-drop ALL");
    expect(joint).toContain("no-new-privileges");
  });
  it("utilise l'image configuree", () => {
    expect(args).toContain(IMAGE);
  });
});

describe("nomConteneur", () => {
  it("prefixe secprep- et nettoie l'id utilisateur", () => {
    const n = nomConteneur("user!!123");
    expect(n.startsWith("secprep-user123-")).toBe(true);
  });
  it("genere des noms uniques", () => {
    expect(nomConteneur("u")).not.toBe(nomConteneur("u"));
  });
});
