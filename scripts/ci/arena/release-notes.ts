/* Turns the commit log between two tags into the body of a GitHub Release. GitHub's own
 * --generate-notes lists pull requests, and every release here arrives as one merge of develop
 * into main, so it would produce a page saying "Merge pull request #19" and nothing else. What
 * carries the release is the commit subjects, which this repository writes as a sentence naming
 * the defect, so they are grouped by the area each one names and printed as they were written.
 * An em dash is rewritten because prose here punctuates without one and a release page is read
 * by more people than any document in the tree. */

import { spawnSync } from 'node:child_process';
import { isMainModule } from '../../utils/main-module.ts';
import { hostBinary } from '../../lib/arena/host-binary.ts';

export const REPOSITORY = 'https://github.com/dravensoft-dev/arena';

export const MERGE = /^Merge (branch|pull request|remote-tracking)/;

export const AREA = /^([a-z0-9][a-z0-9 ._/-]*?):\s+(.*)$/;

export const UNGROUPED = 'Everything else';

export type Git = (...args: string[]) => string;

export function realGit(): Git {
  const git = hostBinary('git', 'to read the commit log a release page is written from');
  return (...args: string[]) => {
    const asked = spawnSync(git, args, { encoding: 'utf8' });
    if (asked.status !== 0) {
      throw new Error(`git ${args.join(' ')} failed: ${(asked.stderr ?? '').trim()}`);
    }
    return (asked.stdout ?? '').trim();
  };
}

export function unwrapDashes(text: string) {
  return text.replace(/\s+—\s+/g, ', ').replace(/—/g, ', ');
}

export function previousTag(tag: string, git: Git) {
  const tags = git('tag', '--sort=-v:refname').split('\n').filter(Boolean);
  const at = tags.indexOf(tag);
  if (at === -1) throw new Error(`${tag} is not a tag in this repository, so there is nothing to describe`);
  return tags[at + 1];
}

export function subjects(tag: string, previous: string | undefined, git: Git) {
  const range = previous ? `${previous}..${tag}` : tag;
  return git('log', '--no-merges', '--format=%s', range)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !MERGE.test(line));
}

export function grouped(lines: string[]) {
  const areas = new Map<string, string[]>();
  for (const line of lines) {
    const found = AREA.exec(line);
    const area = found?.[1] ?? UNGROUPED;
    const text = found?.[2] ?? line;
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area)?.push(unwrapDashes(text));
  }
  return areas;
}

export function body(tag: string, previous: string | undefined, lines: string[]) {
  const areas = grouped(lines);
  if (areas.size === 0) {
    return `No commit stands between ${previous ?? 'the first commit'} and ${tag}.\n`;
  }
  const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const named = [...areas].sort(([a], [b]) =>
    (a === UNGROUPED ? 1 : b === UNGROUPED ? -1 : byCodeUnit(a, b)));
  const sections = named.map(([area, items]) =>
    `### ${area}\n\n${items.map((item) => `- ${item}`).join('\n')}`);
  const compare = previous
    ? `\n\n**Every commit**: ${REPOSITORY}/compare/${previous}...${tag}`
    : `\n\n**Every commit**: ${REPOSITORY}/commits/${tag}`;
  return `${sections.join('\n\n')}${compare}\n`;
}

export function notes(tag: string, git: Git) {
  const previous = previousTag(tag, git);
  return body(tag, previous, subjects(tag, previous, git));
}

function main() {
  const tag = process.argv[2];
  if (!tag) {
    console.error('release-notes: name the tag to describe, as in bun scripts/ci/arena/release-notes.ts v9.0.3');
    process.exit(1);
  }
  process.stdout.write(notes(tag, realGit()));
}

if (isMainModule(import.meta.url)) main();
