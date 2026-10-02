# SecPrep

Plateforme d'entrainement **CompTIA Security+ (SY0-701)** et de pratique SOC,
en francais, pour reviser a deux. Livree **phase par phase**.

> **Etat actuel : Phase 8 — Analyse de paquets.**
> Visionneuse de paquets + 3 captures synthetiques reproductibles (balayage de
> ports, tunnel DNS, televersement HTTP) avec verite terrain et exercices.
> (Phases 1-7 : fondations, quiz, chrono/examen, revision & duel, rapports + IA,
> loggen & SIEM, terminal sandbox.)

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
cp .env.example .env     # puis renseignez SESSION_PASSWORD (>= 32 car.)
pnpm db:generate         # genere le client Prisma
pnpm db:push             # cree la base SQLite (dev.db)
pnpm seed                # charge la banque de questions
pnpm create-user         # cree votre compte
pnpm --filter @secprep/web dev   # lance l'app sur http://localhost:3000
```

Generer un `SESSION_PASSWORD` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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
| `pnpm --filter @secprep/web dev` | Lance l'application web (http://localhost:3000). |
| `pnpm --filter @secprep/web build` | Build de production de l'app web. |

## Application web (Phase 2)

- **Connexion** par cookie de session chiffre (iron-session + argon2).
- **Tableau de bord** : progression par domaine, points faibles.
- **Quiz libre** : choix domaine / difficulte / nombre de questions.
- **Ecran de question** : indice (−50 % sur la question), validation,
  explication + astuce, revelation de la bonne reponse.
- **Resultats** : score, detail, « refaire les erreurs ».
- Types geres : `qcm`, `vf`, `libre` (correction hors-ligne par mots-cles).

> La correction se fait **uniquement cote serveur** : les bonnes reponses ne
> sont jamais envoyees au navigateur avant la validation.

## Chrono & examen (Phase 3)

- **Les 10 types** de questions s'affichent et se corrigent : `qcm`,
  `qcm_multiple`, `vf`, `libre`, `scenario`, `urgence`, `plan_reprise`,
  `ordonnancement`, `appariement`, `cas_complexe`.
- **Minuterie par question** (option « Chronometre ») : temps ecoule = ratee,
  avec revelation de la bonne reponse.
- **Mode urgence** : questions `urgence` chronometrees (depuis le tableau de bord).
- **Simulateur d'examen** (`/examen`) :
  - questions **ponderees par domaine** (D1 12 % … D4 28 %) ;
  - **minuterie globale** de 90 min, navigation libre, **marquage** pour
    revision, **revue finale** avant soumission ;
  - **score 100–900** (seuil **750**) + revue par domaine.

> Le bareme 100–900 reel de CompTIA est secret : on utilise une approximation
> lineaire assumee (`score = 100 + ratio × 800`).
> La banque etant encore petite, l'examen utilise toutes les questions
> disponibles (les generateurs arrivent en Phase 10).

## Revision espacee & duel (Phase 4)

### Revision espacee (SM-2)
- Une question **entre dans la file quand elle est ratee** ; chaque passage met
  a jour sa planification avec l'algorithme **SM-2** (facteur de facilite,
  intervalle croissant).
- Mapping qualite : correct sans indice = 5, avec indice = 4, rate = 2.
- Une question ratee reste **due immediatement** (on peut la re-travailler le
  jour meme) ; une reussite s'espace dans le temps.
- Le tableau de bord affiche le nombre de questions a reviser et un mode
  **Reviser** (`/quiz/session?revision=1`). Les examens alimentent aussi la file.

### Duel / cooperation (en differe)
- `/duel` : creer un defi (**duel** = comparaison, **coop** = score combine),
  obtenir un **code** a partager, ou rejoindre un defi par code.
- Les deux joueurs recoivent **exactement le meme jeu de questions** (fige a la
  creation), jouent quand ils veulent, puis comparent/combinent leurs scores.
- Correction a la fin (pas de feedback pendant, pour l'equite), une seule
  participation par joueur et par defi.

## Rapports + IA (Phase 5)

- **Editeur Markdown** (`/rapports`) avec apercu en direct, **enregistrement
  automatique** et **historique des versions** (restauration).
- **Modeles** : rapport d'incident, post-mortem, note d'escalade, audit ; ou
  depuis un **scenario** avec **verite terrain** (IOC, chronologie, bonnes actions).
- **Deux modes d'IA** (`packages/report-grader`, API Claude) :
  - **Coach** : questions, elements manquants, pistes de methode, sans reecrire.
  - **Correcteur** : note /20 par critere (exactitude, structure, clarte, preuves,
    recommandations, ton) + note globale /100.
- L'IA compare le rapport a la verite terrain et signale les **affirmations non
  appuyees** par les faits.
- **Sortie JSON validee par Zod** ; affichage en cartes.
- **Securite** : cle API **cote serveur uniquement** (`ANTHROPIC_API_KEY`, jamais
  dans le depot), **plafond d'appels/jour** (`MAX_CORRECTIONS_JOUR`, defaut 20),
  et **garde-fou anti-injection** (le contenu du rapport/journaux est encapsule
  comme donnee non fiable, jamais comme instruction).
- Modele par defaut : `claude-opus-5-5` (configurable via `ANTHROPIC_MODEL`).

> Sans `ANTHROPIC_API_KEY`, l'editeur et les versions fonctionnent ; l'analyse IA
> affiche un message clair invitant a configurer la cle.

## Journaux & SIEM simule (Phase 6)

- **`packages/loggen`** : generateur de journaux **synthetiques** (auth SSH/RDP,
  Windows 4624/4625) avec **vérité terrain**, **graine reproductible** (meme
  graine = meme resultat), volume reglable, bruit normal mele a l'attaque.
  Donnees fictives uniquement (RFC 1918 / RFC 5737).
- **`packages/siem-query`** : langage de recherche (`champ=valeur`, `ET/OU/NON`,
  comparaisons, `| stats count by champ`, `| top champ`, plage de temps) +
  moteur d'execution.
- **SIEM simule** (`/siem`) :
  - **recherche** (table d'evenements, **histogramme temporel**, detail JSON) ;
  - **tableau de bord** (echecs d'auth, top IP, top comptes, succes externes) ;
  - **regles de detection** : teste une regle et affiche **vrais/faux
    positifs/negatifs** et precision/rappel compares a la verite terrain ;
  - **enquete** : epingler des preuves, verdict, notes, puis
    **« brouillon de rapport »** qui cree un rapport (Module 1).
- Un scenario complet (**password spraying**) est resoluble a la recherche et
  genere un brouillon de rapport. Evenements marques « simule » (vs « reel »,
  capteur en Phase 9).

## Terminal sandbox (Phase 7)

- **`packages/labs`** : 5 labos guidés (permissions `chmod`, `grep`, `find`,
  `awk`, pipeline top-IP), chacun avec consigne, indice et **validation
  automatique** (predicat pur sur la sortie d'une commande de verification).
- **`services/sandbox`** : orchestrateur de conteneur **Docker** ephemere, un par
  session. **Isolation stricte (non negociable)** :
  `--network none`, `--read-only` (sauf `/work` en tmpfs), `--memory`/`--cpus`/
  `--pids-limit`, `--user 1000:1000`, `--cap-drop ALL`, `no-new-privileges`,
  conteneur detruit a la fin. Aucune commande utilisateur n'est jamais executee
  hors du conteneur.
- **UI `/labs`** : liste + progression ; page de labo avec consigne, **terminal**
  (commande par commande, historique ↑/↓), indice et **Valider** (verification
  dans le bac a sable).

**Prerequis** : **Docker Desktop doit etre demarre** (image `alpine:3.19`, tiree
une fois). Sans Docker, l'editeur de labo s'affiche mais le terminal indique
clairement « Docker indisponible » — jamais d'execution non isolee.

## Analyse de paquets (Phase 8)

- **`packages/packgen`** : generateur de **captures synthetiques** reproductibles
  (graine) avec **verite terrain** + helpers purs (stats protocoles,
  conversations, suivi de flux). 3 captures : **balayage de ports**, **tunnel /
  exfiltration DNS**, **televersement de fichier en HTTP**. Donnees fictives
  (RFC 1918 / 5737, domaines example.*).
- **Visionneuse** (`/paquets`) : table de paquets, **filtre d'affichage**,
  **detail par couche** (Ethernet / IP / TCP|UDP / DNS|HTTP), **suivi de flux**,
  **statistiques** (protocoles, top conversations).
- **Exercices** par capture (« quel hote scanne ? », « identifie le tunnel DNS »,
  « retrouve le fichier televerse ») avec **validation cote serveur** (les
  reponses ne sont jamais envoyees au client).
- Import de vrais fichiers .pcap : prevu dans une iteration ulterieure (parseur
  en bac a sable pour fichiers non fiables).

### Bareme

- Points de base : facile **10**, moyen **20**, difficile **30**.
- Indice utilise : points **divises par deux** (bonne reponse).
- `libre` : score proportionnel aux groupes de mots-cles trouves, reussite au
  seuil (`seuil_reussite`).

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
│  ├─ web/            # UI Next.js + Tailwind (auth, quiz, dashboard)
│  └─ api/            # API + WebSocket            (Phase 4+)
├─ packages/
│  ├─ db/             # Prisma : schema, client, migrations
│  ├─ bank/           # Zod (source de verite), validate-bank, seed, create-user
│  ├─ quiz/           # Correcteurs (10 types) + bareme + examen + SM-2
│  ├─ report-grader/  # Grilles + schemas Zod + appel IA (Coach/Correcteur)
│  ├─ loggen/         # Journaux synthetiques reproductibles + verite terrain
│  ├─ siem-query/     # Langage de recherche + moteur (SIEM)
│  ├─ labs/           # Labos guidés + validation automatique
│  └─ packgen/        # Captures de paquets synthetiques + verite terrain
├─ services/
│  └─ sandbox/        # Orchestrateur de conteneur Docker isole (terminal)
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
