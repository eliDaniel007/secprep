import { describe, it, expect } from "vitest";
import { parser } from "./parser";
import { rechercher, type EvenementSiem } from "./engine";

function ev(p: Partial<EvenementSiem> & { ts: number }): EvenementSiem {
  return {
    source: "auth_ssh",
    action: "echec_auth",
    champs: {},
    raw: "",
    ...p,
  };
}

const data: EvenementSiem[] = [
  ev({ ts: 10, action: "echec_auth", champs: { src_ip: "203.0.113.66", user: "admin", result: "echec" }, raw: "Failed admin 203.0.113.66" }),
  ev({ ts: 20, action: "echec_auth", champs: { src_ip: "203.0.113.66", user: "root", result: "echec" }, raw: "Failed root 203.0.113.66" }),
  ev({ ts: 30, action: "succes_auth", champs: { src_ip: "10.0.0.5", user: "a.tremblay", result: "succes" }, raw: "Accepted a.tremblay 10.0.0.5" }),
  ev({ ts: 40, action: "echec_auth", champs: { src_ip: "198.51.100.23", user: "admin", result: "echec" }, raw: "Failed admin 198.51.100.23" }),
];

describe("parser", () => {
  it("parse une comparaison simple", () => {
    const r = parser("result=echec");
    expect(r.filtre).toEqual({ type: "comparaison", champ: "result", op: "=", valeur: "echec" });
  });
  it("parse ET / OU / NON", () => {
    const r = parser("result=echec ET NON user=root");
    expect(r.filtre.type).toBe("et");
  });
  it("parse un pipeline stats", () => {
    const r = parser("result=echec | stats count by user");
    expect(r.pipe[0]).toEqual({ type: "stats_count_by", champ: "user" });
  });
});

describe("rechercher — filtres", () => {
  it("filtre par champ", () => {
    const r = rechercher(data, "result=echec");
    expect(r.type).toBe("evenements");
    if (r.type === "evenements") expect(r.total).toBe(3);
  });
  it("ET combine les conditions", () => {
    const r = rechercher(data, "result=echec ET user=admin");
    if (r.type === "evenements") expect(r.total).toBe(2);
  });
  it("NON exclut", () => {
    const r = rechercher(data, "result=echec NON user=admin");
    if (r.type === "evenements") expect(r.total).toBe(1);
  });
  it("OU unit", () => {
    const r = rechercher(data, "user=root OU user=admin");
    if (r.type === "evenements") expect(r.total).toBe(3);
  });
  it("recherche plein texte dans raw", () => {
    const r = rechercher(data, "Accepted");
    if (r.type === "evenements") expect(r.total).toBe(1);
  });
  it("comparaison numerique sur ts", () => {
    const r = rechercher(data, "ts>=30");
    if (r.type === "evenements") expect(r.total).toBe(2);
  });
  it("plage de temps via options", () => {
    const r = rechercher(data, "", { debut: 15, fin: 35 });
    if (r.type === "evenements") expect(r.total).toBe(2);
  });
});

describe("rechercher — pipeline", () => {
  it("stats count by user", () => {
    const r = rechercher(data, "result=echec | stats count by user");
    expect(r.type).toBe("stats");
    if (r.type === "stats") {
      const admin = r.lignes.find((l) => l.cle === "admin");
      expect(admin?.count).toBe(2);
    }
  });
  it("stats count total", () => {
    const r = rechercher(data, "result=echec | stats count");
    expect(r.type).toBe("count");
    if (r.type === "count") expect(r.total).toBe(3);
  });
  it("top src_ip", () => {
    const r = rechercher(data, "result=echec | top src_ip 1");
    if (r.type === "stats") {
      expect(r.lignes).toHaveLength(1);
      expect(r.lignes[0]!.cle).toBe("203.0.113.66");
    }
  });
});
