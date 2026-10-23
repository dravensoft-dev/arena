/* A child's output read from a file, because a pipe silently loses the end of it. A child that
 * writes its results and then calls process.exit() -- tsc, ngc, every JavaScript compiler this
 * tree spawns -- exits before the tail of stdout has drained, and spawnSync reports that short
 * read as a whole one: status 0, no error, the last lines missing. The tsc listing came back
 * short in 2 of 30 runs through a pipe and whole in 30 of 30 through a file: an inherited
 * descriptor is written synchronously and has no buffer to lose. childOutputAsync is the same
 * capture for a runner that keeps several children going at once: both streams share one file,
 * in the order the child wrote them, so a step prints as one block, and an abort ends the child
 * with SIGTERM and, when it ignores that for TERM_GRACE, SIGKILL on that one pid. Readers split on
 * '\n' and a Windows compiler emits CRLF, so the CR goes here. */

import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deadline, type Deadline } from './deadline.ts';

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

export function outputFile() {
  const dir = mkdtempSync(join(tmpdir(), 'arena-child-'));
  const path = join(dir, 'output');
  const fd = openSync(path, 'w');
  return {
    fd,
    read: () => withoutCr(readFileSync(path, 'utf8')),
    close: () => {
      closeSync(fd);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export type StepOutput = {
  code: number | null;
  signal: string | null;
  output: string;
  error?: Error | undefined;
  ignored?: string | undefined;
};

type Ended = Omit<StepOutput, 'output'>;

export const TERM_GRACE: Deadline = deadline('child-output:term-grace', 3_000,
  'a compiler or a browser winds down within a fraction of a second of SIGTERM, so three seconds leaves '
  + 'a loaded machine its time and ends only a child that ignores the signal');

export async function childOutputAsync(
  command: string,
  args: string[],
  options: { cwd?: string | undefined; signal?: AbortSignal | undefined; env?: NodeJS.ProcessEnv | undefined } = {},
): Promise<StepOutput> {
  const file = outputFile();
  const { fd } = file;
  try {
    const ended = await new Promise<Ended>((resolve) => {
      let child: ChildProcess;
      try {
        child = spawn(command, args, { cwd: options.cwd, env: options.env, stdio: ['ignore', fd, fd] });
      } catch (err) {
        resolve({ code: null, signal: null, error: err as Error });
        return;
      }
      let grace: ReturnType<typeof setTimeout> | undefined;
      let ignored: string | undefined;
      const stop = () => {
        if (grace !== undefined) return;
        child.kill('SIGTERM');
        grace = setTimeout(() => {
          ignored = 'SIGTERM';
          child.kill('SIGKILL');
        }, TERM_GRACE.ms);
      };
      const settle = (result: Ended) => {
        clearTimeout(grace);
        options.signal?.removeEventListener('abort', stop);
        resolve(ignored === undefined ? result : { ...result, ignored });
      };
      child.once('error', (error) => settle({ code: null, signal: null, error }));
      child.once('exit', (code, signal) => settle({ code, signal }));
      if (options.signal?.aborted) stop();
      else options.signal?.addEventListener('abort', stop, { once: true });
    });
    return { ...ended, output: file.read() };
  } finally {
    file.close();
  }
}
