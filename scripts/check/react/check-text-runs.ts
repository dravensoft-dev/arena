/* Angular composes a run of text into ONE DOM text node whatever the template spells: an
 * interpolation, several of them, or one beside literal text all compile to a single
 * textInterpolate call. React makes a node per child, so `Type "{word}" to confirm` reaches the
 * browser as three runs where its twin reaches it as one, the shaper is handed three shorter
 * strings, and the same sentence rasterises differently. Measured on the complete kitchen sink,
 * where it moved 157 pixels across two components with every other gate green. Literal text
 * beside an expression is the half a parser can decide; adjacent expressions are not, because
 * whether a call returns a string or an element is not a fact about source text. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { isMainModule } from '../../utils/main-module.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

export const COMPONENT_ROOT = 'frameworks/react/components';

export const node = {
  name: 'check:text-runs',
  reads: [
    `${COMPONENT_ROOT}/**/*.tsx`,
    `!${COMPONENT_ROOT}/**/*.test.tsx`,
    `!${COMPONENT_ROOT}/**/*.generated.tsx`,
  ],
  writes: [],
  feeds: [],
};

export const SPLIT_RUN = new Map<string, string>([]);

export function sourceFiles(root: string) {
  return walkFiles(root, { skip: (name) => name === 'dist' || name === 'node_modules' })
    .filter((path) => path.endsWith('.tsx'))
    .filter((path) => !path.includes('.test.') && !path.includes('.generated.'));
}

export function splitRuns(file: string, source: string) {
  const found: { line: number; text: string }[] = [];
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node)) {
      const children = node.children.filter(
        (child) => !(ts.isJsxText(child) && child.containsOnlyTriviaWhiteSpaces),
      );
      const literal = children.some((child) => ts.isJsxText(child) && child.getText().trim().length > 0);
      const expression = children.some((child) => ts.isJsxExpression(child) && child.expression !== undefined);
      if (literal && expression) {
        found.push({
          line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          text: children.map((child) => child.getText().replace(/\s+/g, ' ').trim()).join(' + '),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

export function textRunProblems(
  files: string[], read: (path: string) => string, exempt = SPLIT_RUN,
) {
  const problems = [];
  const claimed = new Set<string>();
  let scanned = 0;

  for (const file of files) {
    scanned += 1;
    for (const { line, text } of splitRuns(file, read(file))) {
      const key = `${file}:${line}`;
      if (exempt.has(key)) { claimed.add(key); continue; }
      problems.push(
        `${key}: this element hands the browser a run of text built out of pieces -- ${text}. `
        + 'React makes a DOM text node per child and Angular compiles the whole run into one, so '
        + 'the two layers give the shaper different strings for the same sentence and it draws '
        + 'them differently at some sizes and not at others. Compose it into a single expression, '
        + 'as a template literal, or name it in SPLIT_RUN with why the pieces must stay apart',
      );
    }
  }

  for (const key of exempt.keys()) {
    if (claimed.has(key)) continue;
    problems.push(
      `SPLIT_RUN names ${key}, and no element there builds a run out of pieces. A stale exemption `
      + 'is worse than none, because it reads as a decision somebody made about code that is there',
    );
  }

  if (scanned === 0) {
    problems.push(
      `found 0 render(s) under ${COMPONENT_ROOT}. An empty result set is a failure, not a clean `
      + 'pass: a gate iterating nothing reports nothing wrong with everything',
    );
  }
  return { problems, scanned };
}

function main() {
  const files = sourceFiles(join(repoRoot, COMPONENT_ROOT)).map((path) => relPosix(repoRoot, path));
  const { problems, scanned } = textRunProblems(files, (rel) => readFileSync(join(repoRoot, rel), 'utf8'));
  if (problems.length) {
    console.error(`check-text-runs: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}\n`);
    process.exit(1);
  }
  console.log(
    `check-text-runs: ${scanned} render(s) compose every run of text in one expression, `
    + `bar ${SPLIT_RUN.size} on the record`,
  );
}

if (isMainModule(import.meta.url)) main();
