import { execFile } from "node:child_process";

/**
 * Orchestrateur de bac a sable base sur Docker.
 * ISOLATION STRICTE (non negociable) : pas de reseau, systeme de fichiers en
 * lecture seule sauf /work (tmpfs), limites CPU/memoire/PID, utilisateur non
 * privilegie, toutes les capacites retirees, pas d'elevation de privileges.
 * Aucune commande utilisateur n'est jamais executee en dehors du conteneur.
 */

export const IMAGE = process.env.SANDBOX_IMAGE ?? "alpine:3.19";
export const DUREE_VIE_SEC = 1800; // le conteneur s'eteint seul apres 30 min
export const TIMEOUT_CMD_SEC = 10; // temps max d'une commande

export interface SortieSandbox {
  stdout: string;
  stderr: string;
  code: number;
}

/** Arguments `docker run` pour un conteneur de bac a sable (fonction pure). */
export function construireArgsRun(nom: string): string[] {
  return [
    "run",
    "-d",
    "--rm",
    "--name",
    nom,
    "--network",
    "none",
    "--read-only",
    "--tmpfs",
    "/work:rw,size=16m,mode=1777",
    "--tmpfs",
    "/tmp:rw,size=8m,mode=1777",
    "--memory",
    "128m",
    "--cpus",
    "0.5",
    "--pids-limit",
    "128",
    "--user",
    "1000:1000",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--workdir",
    "/work",
    IMAGE,
    "sh",
    "-c",
    `sleep ${DUREE_VIE_SEC}`,
  ];
}

/** Nom de conteneur sur pour un utilisateur donne. */
export function nomConteneur(utilisateurId: string): string {
  const suffixe = Math.random().toString(36).slice(2, 10);
  const u = utilisateurId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `secprep-${u}-${suffixe}`;
}

function run(args: string[], timeoutMs: number): Promise<SortieSandbox> {
  return new Promise((resolve) => {
    execFile(
      "docker",
      args,
      { timeout: timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        const code =
          err && typeof (err as NodeJS.ErrnoException & { code?: number }).code === "number"
            ? ((err as unknown as { code: number }).code)
            : err
              ? 1
              : 0;
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "", code });
      },
    );
  });
}

/** Docker est-il disponible et le daemon demarre ? */
export async function dockerDisponible(): Promise<boolean> {
  const r = await run(["info", "--format", "{{.ServerVersion}}"], 8000);
  return r.code === 0 && r.stdout.trim().length > 0;
}

/** Demarre un conteneur et execute le script d'initialisation du labo. */
export async function demarrer(utilisateurId: string, setup: string): Promise<string> {
  const nom = nomConteneur(utilisateurId);
  const r = await run(construireArgsRun(nom), 60000);
  if (r.code !== 0) {
    throw new Error("Impossible de demarrer le bac a sable : " + r.stderr.trim());
  }
  if (setup) {
    await executer(nom, setup);
  }
  return nom;
}

/** Execute une commande DANS le conteneur (jamais sur l'hote). */
export async function executer(conteneur: string, commande: string): Promise<SortieSandbox> {
  return run(
    ["exec", conteneur, "timeout", String(TIMEOUT_CMD_SEC), "sh", "-c", commande],
    (TIMEOUT_CMD_SEC + 5) * 1000,
  );
}

/** Detruit le conteneur. */
export async function arreter(conteneur: string): Promise<void> {
  await run(["rm", "-f", conteneur], 15000);
}
