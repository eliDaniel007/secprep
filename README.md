# SecPrep

Plateforme d'entrainement **CompTIA Security+ (SY0-701)** et de pratique SOC,
en francais, pour reviser a deux. Livree **phase par phase**.

> **Etat actuel : Phase 1 — Fondations.**
> Architecture monorepo, modele de donnees, chargement de la banque de
> questions (`seed`), validation des lots (`validate-bank`), creation de comptes.

## Prerequis

- **Node.js >= 18.18** (teste avec Node 20)
- **pnpm >= 9**

Si pnpm n'est pas installe :

```bash
npm install -g pnpm
```

(ou via Corepack : `corepack enable` puis `corepack prepare pnpm@9.12.0 --activate`)

## Installation

```bash
pnpm install
cp .env.example .env     # puis ajustez si besoin
pnpm db:generate         # genere le client Prisma
pnpm db:push             # cree la base SQLite (dev.db)
```

## Commandes

| Commande | Role |
|---|---|
| `pnpm validate-bank` | Valide `data/seed/` + `data/lots/`. Sort en erreur si un lot est refuse. |
| `pnpm seed` | Valide **puis** charge la banque en base (idempotent, upsert par `id`). |
| `pnpm create-user` | Cree un compte (mot de passe hache avec argon2). Interactif, ou via `.env`. |
| `pnpm test` | Lance les tests Vitest. |
| `pnpm db:generate` | Genere le client Prisma. |
| `pnpm db:push` | Applique le schema a la base SQLite. |

### Creer vos comptes

Interactif :

```bash
pnpm create-user
```

Non interactif (variables dans `.env` ou l'environnement) :

```
SEED_USER_EMAIL, SEED_USER_NAME, SEED_USER_PASSWORD, SEED_USER_ROLE (etudiant|admin)
```

Aucun mot de passe n'est jamais stocke en clair ni ecrit dans le code.

## Structure

```
secprep/
├─ apps/
│  ├─ web/            # UI Next.js + Tailwind      (Phase 2+)
│  └─ api/            # API + WebSocket            (Phase 2+)
├─ packages/
│  ├─ db/             # Prisma : schema, client, migrations
│  └─ bank/           # Zod (source de verite), validate-bank, seed, create-user
├─ data/
│  ├─ seed/           # banque_cas_securityplus.json (lot de depart)
│  └─ lots/           # lots JSON additionnels (fusionnes au seed)
└─ ...
```

## Modele de donnees (Phase 1)

- **`utilisateur`** : comptes (argon2), role `etudiant`/`admin`.
- **`question`** : table centrale. Les champs communs sont des colonnes ;
  le payload specifique a chaque type (`options`/`reponse`, `etapes`, `paires`,
  `elements`, grille de reponse libre...) est stocke en JSON dans `contenu`,
  valide par Zod a l'ecriture **et** a la lecture.
- **`tentative`** et **`progression_domaine`** : structures pretes, remplies a
  partir de la Phase 2.

Les tables des phases suivantes (duel, rapport, capteur, enquete...) seront
ajoutees a leur phase respective via des migrations incrementales.

## Validation de la banque (`validate-bank`)

Un lot est **refuse** (sortie en erreur, message par question) si :

1. `id` duplique (dans un fichier ou entre fichiers) ;
2. champ obligatoire manquant (selon le `type`) ;
3. index de reponse hors limites (`qcm`, `qcm_multiple`, `ordonnancement`, etapes) ;
4. `domaine`, `difficulte` ou `type` invalide ;
5. enonces quasi identiques (similarite **> 0,9**, Jaccard sur trigrammes).

Avertissement **non bloquant** : `objectif_sy0701` au format inattendu
(attendu ex. `4.9`).

## Types de questions geres

`qcm`, `qcm_multiple`, `vf`, `libre`, `scenario`, `urgence`, `plan_reprise`,
`ordonnancement`, `appariement`, `cas_complexe`.

## Tests

```bash
pnpm test
```

Couvre : normalisation et similarite, toutes les regles de `validate-bank`,
chaque type de question, et le chargement du lot de depart reel.
