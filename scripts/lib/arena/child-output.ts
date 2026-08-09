/* A child's output read from a file, because a pipe silently loses the end of it. A child that
 * writes its results and then calls process.exit() -- tsc, ngc, every JavaScript compiler this
 * tree spawns -- exits before the tail of stdout has drained, and spawnSync reports that short
 * read as a whole one: status 0, no error, the output simply missing its last lines. Nothing
 * downstream can tell the difference. The loss is a race: the tsc listing is 485 lines and came
 * back at 445 and at 316 in 2 of 30 runs through a pipe, and whole in 30 of 30 through a file,
 * so it survives local runs and lands in CI, where it had check:script-types name 16 files as
 * unreached by globs that reach them. An inherited descriptor is written synchronously and has
 * no buffer to lose, at the cost of a temp directory per call, so this is for spawns whose
 * output is READ. Readers split on '\n' and a Windows compiler emits CRLF, so the CR goes here. */

import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type ChildOutput = {
  status: number;
  stdout: string;
  stderr: string;
  output: string;
  error?: Error | undefined;
};

export const withoutCr = (text: string) => text.replace(/\r\n?/g, '\n');

export function childOutput(command: string, args: string[]): ChildOutput {
  const dir = mkdtempSync(join(tmpdir(), 'arena-child-'));
  try {
    const outPath = join(dir, 'stdout');
    const errPath = join(dir, 'stderr');
    const out = openSync(outPath, 'w');
    const err = openSync(errPath, 'w');
    let r;
    try {
      r = spawnSync(command, args, { stdio: ['ignore', out, err] });
    } finally {
      closeSync(out);
      closeSync(err);
    }
    const stdout = withoutCr(readFileSync(outPath, 'utf8'));
    const stderr = withoutCr(readFileSync(errPath, 'utf8'));
    return { status: r.status ?? 1, stdout, stderr, output: `${stdout}${stderr}`, error: r.error };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
