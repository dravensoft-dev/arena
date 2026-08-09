/* The one module that reads `process.platform`. Every other file takes the answer as a
 * parameter, which is what makes a branch written for Windows testable from Linux: the
 * machine a contributor happens to own stops deciding which half of the tooling is
 * covered. `check:portability` holds the rule and names this file as its one owner,
 * because a second reader is a second place a platform assumption can hide, and hiding
 * is exactly how this repository became Linux-only without anyone writing that down.
 *
 * It carries the identity, and the one operation whose ARGUMENT is the platform rather than
 * its subject: a directory link is a symlink on POSIX and a junction on Windows, a fact about
 * the two systems and about nothing that links. A browser path list is the other case. */

import { symlinkSync } from 'node:fs';

export type Platform = typeof process.platform;

export const platform: Platform = process.platform;

export const arch: string = process.arch;

export function linkDir(target: string, at: string, on: Platform = platform) {
  symlinkSync(target, at, on === 'win32' ? 'junction' : 'dir');
}
