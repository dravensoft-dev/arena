/* Runs a compiler a build step spawns so an interrupt of the step reaches it. run-build ends
 * a step with SIGTERM on the step's pid alone, never a group, so a step that waits on its
 * compiler with spawnSync dies and leaves the compiler running. Here the wait is a spawn: the
 * listeners go on BEFORE it, so no child exists while a signal would still end this process
 * alone, and one that lands first ends the child as it is spawned; SIGTERM and SIGINT go on to
 * the child's pid, the child is waited for, and the answer names the signal. endIfInterrupted
 * prints what the child wrote with writeSync, since a stream write into a pipe is still queued
 * when the process signals itself, and ends the step by that same signal. The listeners are
 * removed when the child ends. Output is inherited, or read from a file, never through a pipe. */

import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { writeSync } from 'node:fs';
import { constants } from 'node:os';
import { outputFile } from './child-output.ts';

export const FORWARDED: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

export type Forwarded = {
  status: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  interrupted?: NodeJS.Signals | undefined;
  error?: Error | undefined;
};

export async function spawnForwarding(
  command: string,
  args: string[],
  options: {
    cwd?: string | undefined;
    capture?: boolean | undefined;
    spawn?: ((command: string, args: string[], options: SpawnOptions) => ChildProcess) | undefined;
  } = {},
): Promise<Forwarded> {
  const file = options.capture ? outputFile() : undefined;
  try {
    let interrupted: NodeJS.Signals | undefined;
    const ended = await new Promise<Omit<Forwarded, 'output' | 'interrupted'>>((resolve) => {
      let listening: Array<[NodeJS.Signals, () => void]> = [];
      const settle = (result: Omit<Forwarded, 'output' | 'interrupted'>) => {
        for (const [name, listener] of listening) process.removeListener(name, listener);
        listening = [];
        resolve(result);
      };
      let child: ChildProcess | undefined;
      listening = FORWARDED.map((name): [NodeJS.Signals, () => void] => [name, () => {
        interrupted ??= name;
        child?.kill(name);
      }]);
      for (const [name, listener] of listening) process.on(name, listener);
      try {
        child = (options.spawn ?? nodeSpawn)(command, args, {
          cwd: options.cwd,
          stdio: file === undefined ? 'inherit' : ['ignore', file.fd, file.fd],
        });
      } catch (error) {
        settle({ status: null, signal: null, error: error as Error });
        return;
      }
      if (interrupted !== undefined) child.kill(interrupted);
      child.once('error', (error) => settle({ status: null, signal: null, error }));
      child.once('exit', (status, signal) => settle({ status, signal }));
    });
    return { ...ended, output: file?.read() ?? '', interrupted };
  } finally {
    file?.close();
  }
}

export function endIfInterrupted(label: string, forwarded: Forwarded) {
  const { interrupted } = forwarded;
  if (interrupted === undefined) return;
  writeSync(2, `${forwarded.output}${label}: interrupted by ${interrupted}; ${interrupted} went on to the child and it has ended\n`);
  process.kill(process.pid, interrupted);
  process.exit(128 + constants.signals[interrupted]);
}
