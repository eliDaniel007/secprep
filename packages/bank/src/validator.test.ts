import { describe, it, expect } from "vitest";
import { validerBanque, type FichierBanque } from "./validator.js";

/** Petit constructeur de question qcm valide. */
function qcm(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    domaine: 1,
    cours_google: 1,
    type: "qcm",
    difficulte: "facile",
    temps_sec: 30,
    enonce: `Enonce unique pour ${id} parlant de sujets varies et distincts`,
    options: ["A", "B", "C"],
    reponse: 0,
    explication: "Parce que.",
    objectif_sy0701: "1.2",
    ...extra,
  };
}

function fichier(questions: unknown[]): FichierBanque {
  return { nom: "test.json", contenu: { questions } };
}

describe("validerBanque", () => {
  it("accepte une banque valide", () => {
    const r = validerBanque([fichier([qcm("Q1"), qcm("Q2")])]);
    expect(r.ok).toBe(true);
    expect(r.questionsValides).toHaveLength(2);
    expect(r.erreurs).toHaveLength(0);
  });

  it("refuse un id duplique", () => {
    const r = validerBanque([fichier([qcm("DUP"), qcm("DUP")])]);
    expect(r.ok).toBe(false);
    expect(r.erreurs.some((e) => e.message.includes("duplique"))).toBe(true);
  });

  it("refuse un index de reponse hors limites", () => {
    const r = validerBanque([fichier([qcm("Q1", { reponse: 9 })])]);
    expect(r.ok).toBe(false);
    expect(r.erreurs.some((e) => e.message.includes("hors limites"))).toBe(true);
  });

  it("refuse un type inconnu", () => {
    const r = validerBanque([fichier([qcm("Q1", { type: "charade" })])]);
    expect(r.ok).toBe(false);
  });

  it("refuse un champ obligatoire manquant", () => {
    const q = qcm("Q1");
    delete (q as Record<string, unknown>).enonce;
    const r = validerBanque([fichier([q])]);
    expect(r.ok).toBe(false);
  });

  it("refuse deux enonces quasi identiques", () => {
    const a = qcm("A", { enonce: "Le cache ARP est empoisonne sur le reseau local interne" });
    const b = qcm("B", { enonce: "Le cache ARP est empoisonne sur le reseau local interne." });
    const r = validerBanque([fichier([a, b])]);
    expect(r.ok).toBe(false);
    expect(r.doublons.length).toBeGreaterThan(0);
  });

  it("emet un avertissement (non bloquant) pour un objectif mal forme", () => {
    const r = validerBanque([fichier([qcm("Q1", { objectif_sy0701: "domaine-1" })])]);
    expect(r.ok).toBe(true);
    expect(r.avertissements).toHaveLength(1);
    expect(r.avertissements[0]!.champ).toBe("objectif_sy0701");
  });

  it("detecte un id duplique entre deux fichiers", () => {
    const r = validerBanque([
      { nom: "a.json", contenu: { questions: [qcm("X")] } },
      { nom: "b.json", contenu: { questions: [qcm("X")] } },
    ]);
    expect(r.ok).toBe(false);
  });
});

describe("validerBanque — tous les types", () => {
  it("accepte un exemplaire de chaque type", () => {
    const questions: unknown[] = [
      qcm("T-qcm"),
      {
        id: "T-mult",
        domaine: 2,
        type: "qcm_multiple",
        difficulte: "moyen",
        temps_sec: 40,
        enonce: "Choisis les bonnes reponses multiples ici distinctes",
        options: ["a", "b", "c"],
        reponse: [0, 2],
        explication: "x",
      },
      {
        id: "T-vf",
        domaine: 1,
        type: "vf",
        difficulte: "facile",
        temps_sec: 20,
        enonce: "Affirmation vraie ou fausse a evaluer soigneusement ici",
        reponse: true,
        explication: "x",
      },
      {
        id: "T-libre",
        domaine: 4,
        type: "libre",
        difficulte: "difficile",
        temps_sec: 300,
        enonce: "Redige une reponse libre complete et structuree stp",
        reponse: {
          modele: "modele de reponse",
          mots_cles: [["alpha", "a"], ["beta"]],
          points: 10,
          seuil_reussite: 6,
        },
        explication: "x",
      },
      {
        id: "T-scenario",
        domaine: 2,
        type: "scenario",
        difficulte: "moyen",
        temps_sec: 90,
        enonce: "Mise en situation realiste avec un choix a faire ici",
        options: ["a", "b"],
        reponse: 1,
        explication: "x",
      },
      {
        id: "T-urgence",
        domaine: 4,
        type: "urgence",
        difficulte: "difficile",
        temps_sec: 60,
        enonce: "Alerte chronometree exigeant une decision rapide maintenant",
        options: ["a", "b"],
        reponse: 0,
        explication: "x",
      },
      {
        id: "T-plan",
        domaine: 3,
        type: "plan_reprise",
        difficulte: "moyen",
        temps_sec: 75,
        enonce: "Calcule la strategie de continuite adaptee a ce besoin",
        options: ["a", "b"],
        reponse: 0,
        explication: "x",
      },
      {
        id: "T-ordo",
        domaine: 3,
        type: "ordonnancement",
        difficulte: "difficile",
        temps_sec: 90,
        enonce: "Remets les elements suivants dans le bon ordre logique",
        elements: ["un", "deux", "trois"],
        reponse: [2, 0, 1],
        explication: "x",
      },
      {
        id: "T-appar",
        domaine: 2,
        type: "appariement",
        difficulte: "facile",
        temps_sec: 90,
        enonce: "Associe chaque terme a sa definition correspondante ici",
        paires: [
          { gauche: "g1", droite: "d1" },
          { gauche: "g2", droite: "d2" },
        ],
        reponse: "paires_dans_l_ordre",
        explication: "x",
      },
      {
        id: "T-cas",
        domaine: 4,
        type: "cas_complexe",
        difficulte: "difficile",
        temps_sec: 420,
        enonce: "Cas en plusieurs etapes a traiter successivement avec soin",
        etapes: [
          {
            titre: "Detection",
            enonce: "Comment qualifier cet incident initial observe ici ?",
            options: ["a", "b"],
            reponse: 1,
            explication: "x",
          },
        ],
        explication: "x",
      },
    ];
    const r = validerBanque([fichier(questions)]);
    expect(r.ok).toBe(true);
    expect(r.questionsValides).toHaveLength(10);
  });
});
