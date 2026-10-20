/* Every environment variable Arena's scripts read, declared here so a test run or a CI run
 * needs no exports. A real environment variable wins over a value below, so a one-off override
 * stays a shell prefix rather than an edit to a versioned file. CI is recognised and never
 * declared: claiming it would tell the scripts they run on a runner. ARENA_CHECK_STRICT buys
 * the same thing and claims nothing. CHROME_PATH is recognised too, and never declared, and so
 * is ARENA_PIXEL_DUMP: a default laid under the environment would make every machine look like
 * one where a person had named a browser, or turn a diagnostic into something every failing run
 * writes. `cannotRun` is the one spelling of a gate whose dependency is missing, and
 * `unassembledReason` the one spelling of why when that dependency is an assembled package. */

export const DECLARED = {
  ARENA_CHECK_STRICT: '1',
  PORT: '8000',
};

export function arenaEnv(env: Record<string, string | undefined> = process.env) {
  return { ...DECLARED, ...env } as Record<string, string | undefined>;
}

export function skipExitCode(env = arenaEnv()) {
  return env.ARENA_CHECK_STRICT === '1' || env.CI === 'true' ? 1 : 2;
}

export function cannotRun(gate: string, reason: string, env = arenaEnv()): never {
  const code = skipExitCode(env);
  console.error(`${gate}: ${code === 1 ? 'FAILED (strict)' : 'SKIPPED'} — ${reason}`);
  if (code === 2) {
    console.error('  check-all reports the run INCOMPLETE; the repository declares '
      + 'ARENA_CHECK_STRICT=1, so this environment overrides it.');
  }
  process.exit(code);
}

export function refuseWhen(gate: string, reason: string | null, env = arenaEnv()) {
  if (reason) cannotRun(gate, reason, env);
}

export function unassembledReason(missing: string[]) {
  return `${missing.join(' and ')} is not assembled, so there is no package to read; run bun run `
    + 'build:packages first. A gate that built what it judges would rewrite dist/ under every gate '
    + 'running beside it';
}
