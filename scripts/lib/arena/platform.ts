/* The one module that reads `process.platform`. Every other file takes the answer as a
 * parameter, which is what makes a branch written for Windows testable from Linux: the
 * machine a contributor happens to own stops deciding which half of the tooling is
 * covered. `check:portability` holds the rule and names this file as its one owner,
 * because a second reader is a second place a platform assumption can hide, and hiding
 * is exactly how this repository became Linux-only without anyone writing that down.
 *
 * It carries the identity and nothing that uses it. A candidate path list belongs to the
 * thing that launches a browser and a link mode belongs to the thing that links, so each
 * of those takes `platform` and stays where its subject is. */

export type Platform = typeof process.platform;

export const platform: Platform = process.platform;

export const arch: string = process.arch;
