/* Every environment variable Arena's scripts read, declared here so a test run or a CI run
 * needs no exports. A real environment variable wins over a value below, so a one-off override
 * stays a shell prefix rather than an edit to a versioned file. CI is recognised and never
 * declared: claiming it would tell the scripts they run on a runner. ARENA_CHECK_STRICT buys
 * the same thing and claims nothing. CHROME_PATH is recognised too, and used to be declared:
 * a default laid under the environment made every machine look like one where a person had
 * named a browser, so the candidate list behind it was unreachable and the macOS entries in
 * it were dead from the day they were written. A default is not an override. `cannotRun` is
 * the one spelling of what a gate does when its dependency is missing, because the four that
 * can skip had drifted into three of them. */

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
