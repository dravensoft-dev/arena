/* Where a command speaks and where it stands. A command takes an Io instead of reaching for
 * console and the process directory, so a test hands it an absolute root and a pair of arrays. */
import { isAbsolute, join } from 'node:path';
import type { HostEnvironment } from './host.ts';

export type Io = {
  out: (line: string) => void;
  err: (line: string) => void;
  cwd: string;
  environment: HostEnvironment;
  node: string;
};

export function processIo(): Io {
  return {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
    cwd: '.',
    environment: {},
    node: process.version,
  };
}

export function voice(io: Io, command: string) {
  const prefix = `arena ${command}: `;
  return {
    out: (line: string) => io.out(`${prefix}${line}`),
    err: (line: string) => io.err(`${prefix}${line}`),
  };
}

export function under(cwd: string, path: string) {
  return isAbsolute(path) ? path : join(cwd, path);
}
