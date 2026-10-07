/* Holds everything on the consumer branch that is emitted rather than written equal to a fresh
 * emit: the index tree, frameworks/INDEX.md and one per layer, the generated regions of the npm
 * pages and the references, and every question row of an npm page held to a file and a heading
 * that exist and to a file the skill links. All of them are tracked
 * rather than built, because the plugin is served from the git tag where nothing runs a build, so
 * a stale copy is not a stale artefact: it is a wrong answer handed to every reader of that tag,
 * with every other gate green. Tracking is this gate's to assert because check:generated scans no
 * .md and the ignore pattern over frameworks/ reaches only a .generated. name, so nothing else
 * would notice one falling out of the index. */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { hostBinary } from '../../lib/arena/host-binary.ts';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { renderTarget, skillTargets, loadCategories } from '../../generate/arena/generate-skills.ts';
import {
  TARGETS as NPM_TARGETS, renderTarget as renderNpmPage,
} from '../../generate/arena/generate-npm-pages.ts';
import { NPM_QUESTIONS, githubSlug, type Section } from '../../lib/arena/npm-questions.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:skills',
  reads: [
    'contracts/api/components', 'frameworks/Components.json', 'frameworks/INDEX.md',
    ...NPM_TARGETS, 'skills/design/**', '.claude-plugin/plugin.json',
    'frameworks/react/**', 'frameworks/angular/**',
    '!frameworks/angular/build/**', '!frameworks/react/dist/**', '!frameworks/angular/dist/**',
  ],
  writes: [],
  feeds: [],
};

export function sharedRegionProblems(base = root) {
  const problems = [];
  for (const target of NPM_TARGETS) {
    const before = readFileSync(join(base, target), 'utf8');
    let after;
    try {
      after = renderNpmPage(before, target, base);
    } catch (error) {
      problems.push(`${target}: ${(error as Error).message}`);
      continue;
    }
    if (after !== before)
      problems.push(
        `${target}: a @shared region does not match a fresh emit. The half of an npm page that is `
        + 'a generated table or text, emitted by generate-npm-pages.ts from the question manifest and '
        + 'the one source of each region. Edit those and run bun run generate:npm-pages',
      );
  }
  return problems;
}

const slugsIn = (text: string) => {
  const seen = new Map<string, number>();
  const slugs = new Set<string>();
  for (const line of text.replace(/^```[\s\S]*?^```/gm, '').split('\n')) {
    if (!/^#{1,6}\s/.test(line)) continue;
    const slug = githubSlug(line);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    slugs.add(count ? `${slug}-${count}` : slug);
  }
  return slugs;
};

export function questionProblems(base = root, manifest: Record<string, Section[]> = NPM_QUESTIONS) {
  const problems: string[] = [];
  const read = (file: string) => {
    try {
      return readFileSync(join(base, file), 'utf8');
    } catch {
      return null;
    }
  };
  const skill = read('skills/design/SKILL.md') ?? '';
  for (const [page, sections] of Object.entries(manifest)) {
    const seen = new Map<string, string>();
    for (const { section, rows } of sections)
      for (const { question, file, heading } of rows) {
        const where = `${page} (${section}): "${question}"`;
        const anchor = `${file}#${githubSlug(heading)}`;
        const twin = seen.get(anchor);
        if (twin) problems.push(`${where} targets ${anchor}, which "${twin}" already targets, so the two are one question`);
        seen.set(anchor, question);
        const text = read(file);
        if (text === null) {
          problems.push(`${where} answers from ${file}, which does not exist`);
          continue;
        }
        if (!slugsIn(text).has(githubSlug(heading)))
          problems.push(`${where} links ${file}#${githubSlug(heading)}, and no heading of that file gives that anchor`);
        const inside = relPosix('skills/design', file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const prefix = inside.startsWith('\\.\\.') ? '' : '(?:\\./)?';
        if (file !== 'skills/design/SKILL.md' && !new RegExp(`\\(${prefix}${inside}(?:#[^)]*)?\\)`).test(skill))
          problems.push(`${page}: ${file} is not linked from skills/design/SKILL.md, so an agent reading the skill never reaches the answer`);
      }
  }
  return [...new Set(problems)];
}

export function trackingProblems(target: string, tracked: boolean) {
  return tracked
    ? []
    : [`${target}: not tracked by git, so it reaches no clone and no tag. `
      + 'A consumer agent routes through this file, and check:generated cannot catch its absence '
      + 'because it scans no .md.'];
}

function trackedFiles(base: string, targets = skillTargets(base)) {
  const git = hostBinary('git', 'to read what the tree tracks, which is a question only git can answer');
  const { stdout } = spawnSync(git, ['ls-files', ...targets], { cwd: base, encoding: 'utf8' });
  return new Set((stdout ?? '').split('\n').filter(Boolean));
}

export function firstDifference(expected: string, actual: string) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      return `line ${i + 1}: committed ${JSON.stringify(b[i] ?? '(end of file)')}, generated ${JSON.stringify(a[i] ?? '(end of file)')}`;
    }
  }
  return null;
}

export function zeroDeclarationProblems(componentCount: number) {
  return componentCount === 0
    ? ['frameworks/Components.json declared no component, so this gate compared an index of nothing against an index of nothing']
    : [];
}

export function skillProblems(base = root, tracked = trackedFiles(base)) {
  const targets = skillTargets(base);
  const declared = Object.values(loadCategories(base)).flat().length;
  const problems = [
    ...zeroDeclarationProblems(declared),
    ...sharedRegionProblems(base),
    ...questionProblems(base),
  ];

  for (const target of targets) {
    problems.push(...trackingProblems(target, tracked.has(target)));

    const expected = renderTarget(target, base);
    let actual;
    try {
      actual = readFileSync(join(base, target), 'utf8');
    } catch {
      problems.push(`${target}: missing, and the git tag hands this file to a reader directly`);
      continue;
    }
    if (expected !== actual) problems.push(`${target}: stale, ${firstDifference(expected, actual)}`);
  }

  return { problems, declared, emitted: targets.length };
}

function main() {
  const { problems, declared, emitted } = skillProblems();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-skills: ${problem}`);
    console.error('\nA stale index is fixed by bun run generate:skills; the others say their own fix.');
    process.exit(1);
  }
  console.log(
    `check-skills: ${emitted} index page(s) and ${NPM_TARGETS.length} generated page(s) match a fresh `
    + `emit over ${declared} declared component(s)`,
  );
}

if (isMainModule(import.meta.url)) main();
