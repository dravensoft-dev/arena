#!/usr/bin/env node
/* The one command an Arena consumer runs. This file is the dispatch: the first word picks the
 * subcommand, which owns its own flags (args.ts) and speaks through an Io (io.ts). It ships inside
 * both npm packages as bin/arena.ts and depends on nothing but node and its own siblings. */

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMMAND_NAMES, SPECS, usageOf } from './args.ts';
import type { Command } from './args.ts';
import { hostManifest, hostPackage } from './host.ts';
import { processIo } from './io.ts';
import type { Io } from './io.ts';
import { run as audit } from './command-audit.ts';
import { run as build } from './command-build.ts';
import { run as check } from './command-check.ts';
import { run as clean } from './command-clean.ts';
import { run as doctor } from './command-doctor.ts';
import { run as init } from './command-init.ts';
import { run as usage } from './command-usage.ts';

export const COMMANDS: Record<Command, (argv: string[], io: Io) => number | Promise<number>> = {
  build, check, audit, usage, init, doctor, clean,
};

const width = Math.max(...COMMAND_NAMES.map((name) => name.length));

export const USAGE = [
  'usage: arena <command> [flags]',
  '',
  ...COMMAND_NAMES.map((name) => `  ${name.padEnd(width)}  ${SPECS[name].summary}`),
  '',
  'arena help <command> shows a command\'s flags; arena --version names the package',
].join('\n');

const isCommand = (word: string): word is Command => (COMMAND_NAMES as readonly string[]).includes(word);

function refuse(io: Io, line: string) {
  io.err(line);
  io.err('');
  io.err(USAGE);
  return 2;
}

export function main(argv: string[], io: Io = processIo()): number | Promise<number> {
  const [first, ...rest] = argv;
  if (first === undefined) { io.err(USAGE); return 2; }
  if (first === '--help' || first === '-h') { io.out(USAGE); return 0; }
  if (first === 'help') {
    const [word] = rest;
    if (word === undefined) { io.out(USAGE); return 0; }
    if (!isCommand(word)) return refuse(io, `arena: no command named ${word}`);
    io.out(usageOf(word));
    return 0;
  }
  if (first === '--version') {
    const manifest = hostManifest('arena' in io.environment ? (io.environment.arena ?? null) : hostPackage());
    if (!manifest) {
      io.err('arena: not running from inside an Arena package, so there is no version to name');
      return 2;
    }
    io.out(`${manifest.name} ${manifest.version}`);
    return 0;
  }
  if (first.startsWith('-')) return refuse(io, 'arena: a command comes first');
  if (!isCommand(first)) return refuse(io, `arena: no command named ${first}`);
  return COMMANDS[first](rest, io);
}

export function isProgram(entry: string | undefined, self: string) {
  if (entry === undefined) return false;
  if (entry === self) return true;
  try {
    return realpathSync(entry) === realpathSync(self);
  } catch {
    return false;
  }
}

if (isProgram(process.argv[1], fileURLToPath(import.meta.url))) {
  Promise.resolve(main(process.argv.slice(2))).then((code) => process.exit(code));
}
