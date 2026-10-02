export * from "./types";
export * from "./prng";
export * from "./pools";
export * from "./scenarios/password-spraying";

import { genererPasswordSpraying } from "./scenarios/password-spraying";
import type { JeuGenere, OptionsGeneration } from "./types";

/** Scenarios disponibles par slug. */
export const SCENARIOS: Record<string, (o: OptionsGeneration) => JeuGenere> = {
  "password-spraying": genererPasswordSpraying,
};

export function genererScenario(slug: string, opts: OptionsGeneration): JeuGenere {
  const gen = SCENARIOS[slug];
  if (!gen) throw new Error(`Scenario de journaux inconnu : ${slug}`);
  return gen(opts);
}
