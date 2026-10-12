/* Runs a compiler a build step spawns so an interrupt of the step reaches it. run-build ends
 * a step with SIGTERM on the step's pid alone, never a group, so a step that waits on its
 * compiler with spawnSync dies and leaves the compiler running, writing into the tree after the
 * run has exited. Here the wait is a spawn: while the child runs, SIGTERM and SIGINT sent to this
 * process go on to the child's pid, the child is waited for, and the answer names the signal.
 * endIfInterrupted then prints what the child wrote and ends the step by that same signal, so
 * the runner reports it killed by it. The listeners are removed when the child ends. Output is
 * inherited, or read from a file when the caller needs it, never through a pipe. */

import { spawn } from 'node:child_process';
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
  options: { cwd?: string | undefined; capture?: boolean | undefined } = {},
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
      let child;
      try {
        child = spawn(command, args, {
          cwd: options.cwd,
          stdio: file === undefined ? 'inherit' : ['ignore', file.fd, file.fd],
        });
      } catch (error) {
        resolve({ status: null, signal: null, error: error as Error });
        return;
      }
      listening = FORWARDED.map((name): [NodeJS.Signals, () => void] => [name, () => {
        interrupted ??= name;
        child.kill(name);
      }]);
      for (const [name, listener] of listening) process.on(name, listener);
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
  if (forwarded.output) process.stderr.write(forwarded.output);
  console.error(`${label}: interrupted by ${interrupted}; ${interrupted} went on to the child and it has ended`);
  process.kill(process.pid, interrupted);
  process.exit(128 + constants.signals[interrupted]);
}
