/* What dist/contracts carries is exactly the contract set this tree holds, byte for byte, and its
 * manifest advertises exactly that set. The derivation runs whether or not the package has been
 * assembled, because deriving nothing is the failure this gate exists to make loud; the comparison
 * runs when the artefact is there, and the summary says which of the two it made. The manifest half
 * is stated as absences, since a package whose consumer is Gradle or SwiftPM must lean on no npm
 * semantics at all: a `bin` it cannot run, an `engines` floor it cannot meet or a dependency it
 * cannot install are each a way the tarball stops being a plain bag of JSON. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { collectFiles } from '../../lib/arena/package-assembly.ts';
import {
  CATALOGUE, DIST, NAME, NOT_CARRIED, carriedFiles, catalogue, manifest, unmatchedExclusions,
  unusedNotShared,
} from '../../build/arena/build-contracts-package.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const node = {
  name: 'check:contracts-package',
  reads: [
    'contracts/design/*.json', 'contracts/api/components/*.json', 'contracts/api/types/*.json',
    'contracts/behaviour/*.json', 'contracts/NPM.md', `${DIST}/**`, '.claude-plugin/plugin.json',
  ],
  writes: [],
  feeds: [],
};

export const NON_CONTRACT = ['package.json', 'README.md', 'LICENSE', CATALOGUE];

export const FORBIDDEN_FIELDS = new Map([
  ['bin', 'the consumer is a build with no Node runtime, so a declared command is one nobody can run'],
  ['engines', 'and no Node floor it could meet either'],
  ['types', 'there is no TypeScript in the package, so a type entry points at nothing'],
  ['dependencies', 'a bag of JSON installs nothing'],
  ['devDependencies', 'the same'],
  ['peerDependencies', 'the same, and a peer would make a platform target declare a JS package'],
]);

export function expectedCarried(repo = root) {
  const design = carriedFiles(repo).map((f) => relPosix(repo, f));
  const behaviour = collectFiles(join(repo, 'contracts/behaviour'), (p) => p.endsWith('.json'))
    .map((f) => relPosix(repo, f));
  return [...design, ...behaviour].sort();
}

export function zeroDerivedProblems(count: number) {
  if (count > 0) return [];
  return ['derived 0 contract files from the tree, so every comparison below would have compared '
    + 'nothing against nothing; a walk that finds no contract is a failure rather than a clean pass'];
}

export function payloadProblems(dir: string, expected: string[], repo = root) {
  const problems: string[] = [];
  const present = collectFiles(dir).map((f) => relPosix(dir, f)).sort();
  const contracts = present.filter((p) => !NON_CONTRACT.includes(p));

  for (const rel of expected) {
    if (!contracts.includes(rel)) { problems.push(`${rel} is in the tree and not in the package`); continue; }
    const from = readFileSync(join(repo, rel));
    const to = readFileSync(join(dir, rel));
    if (!from.equals(to)) problems.push(`${rel} in the package differs from the one in the tree`);
  }
  for (const rel of contracts) {
    if (!expected.includes(rel)) problems.push(`${rel} is in the package and not in the tree's contract set`);
  }
  for (const rel of NON_CONTRACT) {
    if (!present.includes(rel)) problems.push(`the package carries no ${rel}`);
  }
  return problems;
}

export function catalogueProblems(dir: string, expected: string[], repo = root) {
  const at = join(dir, CATALOGUE);
  if (!existsSync(at)) return [`the package carries no ${CATALOGUE}, which is the one file that says what it holds`];
  const held = readJson(at);
  const problems: string[] = [];
  const want = catalogue(expected, repo);
  if (held.name !== want.name) problems.push(`${CATALOGUE} names ${held.name} and the package is ${want.name}`);
  if (held.version !== want.version) {
    problems.push(`${CATALOGUE} says version ${held.version} and .claude-plugin/plugin.json says ${want.version}`);
  }
  const listed: string[] = held.contracts ?? [];
  for (const rel of want.contracts) if (!listed.includes(rel)) problems.push(`${CATALOGUE} does not list ${rel}`);
  for (const rel of listed) {
    if (!want.contracts.includes(rel)) problems.push(`${CATALOGUE} lists ${rel}, which the package does not carry`);
    else if (!existsSync(join(dir, rel))) problems.push(`${CATALOGUE} lists ${rel} and no such file was emitted`);
  }
  return problems;
}

export function manifestProblems(dir: string, repo = root) {
  const at = join(dir, 'package.json');
  if (!existsSync(at)) return ['the package carries no package.json'];
  const held = readJson(at);
  const problems: string[] = [];
  if (held.name !== NAME) problems.push(`package.json names ${held.name} and this assembler builds ${NAME}`);
  for (const [field, why] of FORBIDDEN_FIELDS) {
    if (field in held) problems.push(`package.json declares ${field}, and it may not: ${why}`);
  }
  const want = manifest(repo).exports as Record<string, string>;
  const held_exports: Record<string, string> = held.exports ?? {};
  for (const [key, target] of Object.entries(want)) {
    if (held_exports[key] !== target) problems.push(`package.json exports ${key} as ${held_exports[key]} and the assembler builds ${target}`);
  }
  for (const [key, target] of Object.entries(held_exports)) {
    if (typeof target !== 'string') { problems.push(`package.json exports ${key} as a condition object, and a consumer with no npm resolver reads a bare string or nothing`); continue; }
    if (!(key in want)) problems.push(`package.json exports ${key}, which the assembler does not build`);
    const literal = target.replace('./', '');
    if (!literal.includes('*') && !existsSync(join(dir, literal))) {
      problems.push(`package.json exports ${key} at ${target}, which was never emitted`);
    }
  }
  return problems;
}

export function collect(repo = root) {
  const dir = join(repo, DIST);
  const expected = expectedCarried(repo);
  const problems = [
    ...zeroDerivedProblems(expected.length),
    ...unmatchedExclusions(repo),
    ...unusedNotShared(),
  ];
  const assembled = existsSync(dir);
  if (assembled) {
    problems.push(
      ...payloadProblems(dir, expected, repo),
      ...catalogueProblems(dir, expected, repo),
      ...manifestProblems(dir, repo),
    );
  }
  return { problems, expected, assembled };
}

function main() {
  const { problems, expected, assembled } = collect();
  if (problems.length) {
    console.error(`check-contracts-package: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    console.error('\nRun bun run build:contracts-package to reassemble, or fix what the tree holds.');
    process.exit(1);
  }
  const compared = assembled
    ? `and dist/contracts carries every one of them byte for byte, with ${NOT_CARRIED.size} exclusion(s) on the record`
    : 'and no package is assembled; run bun run build:packages to compare the payload too';
  console.log(`check-contracts-package: ${expected.length} contract file(s) derived from the tree, ${compared}`);
}

if (isMainModule(import.meta.url)) main();
