/* A design extension is a scope class that re-values ROLE tokens and nothing else: a scale is
 * shared by every use that wants that length, so moving one is not an extension but a different
 * Arena. FS_STEP is the one family outside roles.json it may move, because those steps are
 * already named roles. RESERVED_NAME is the one name it may not have, because a consumer writes
 * "extension": "none" to ask for none; `default` is reserved by nothing and fails as an unknown
 * name until an extension is actually called that. The join held here is the file against the
 * generator block that emits it, since a file nobody emits paints nothing and a block naming no
 * file emits nothing, and each half looks complete alone.
 * contracts/design/Extensions.md is the normative statement of all of it. */


import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { FILES } from '../../generate/arena/generate-tokens.ts';

export const node = {
  name: 'check:extensions',
  reads: ['contracts/design', 'scripts/generate/arena/generate-tokens.ts'],
  writes: [],
  feeds: [],
};

const DESIGN_DIR = join(repoRoot, 'contracts/design');
export const PREFIX = 'extension.';
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const FS_STEP = /^fs-[a-z0-9]+$/;

export const RESERVED_NAME = 'none';

type Token = { $type?: string; $value?: unknown; $description?: string };

export function extensionName(file: string) {
  return basename(file).slice(PREFIX.length, -'.json'.length);
}

export function extensionFiles(dir = DESIGN_DIR) {
  return readdirSync(dir).filter((f) => f.startsWith(PREFIX) && f.endsWith('.json')).sort();
}

export function extensionProblems(
  name: string, tokens: Record<string, Token>, roles: Record<string, Token>,
) {
  const problems = [];
  const at = `extension.${name}.json`;
  if (name === RESERVED_NAME)
    problems.push(
      `${at}: "${RESERVED_NAME}" is how a consumer says it wants no extension, so an extension `
      + `answering to that name could never be selected`,
    );
  if (!KEBAB.test(name))
    problems.push(`${at}: "${name}" is not kebab-case, and the name becomes the class .arena-${name}`);
  const moved = Object.keys(tokens);
  if (!moved.length)
    problems.push(`${at}: moves no role, and an extension that changes nothing is a class nobody can tell from its absence`);
  for (const key of moved) {
    if (FS_STEP.test(key)) {
      if (tokens[key]?.$type !== 'dimension')
        problems.push(`${at}: --${key} is a ${tokens[key]?.$type}, and an fs step is a dimension`);
      if (!tokens[key]?.$description)
        problems.push(`${at}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
      continue;
    }
    const role = roles[key];
    if (!role) {
      problems.push(
        `${at}: --${key} is neither a role in contracts/design/roles.json nor an fs step. An extension re-values those only: `
        + `a scale, a colour, a density step or a spacing step is shared by every use that wants that value, `
        + `so moving one is not an extension but a different Arena.`,
      );
      continue;
    }
    if (tokens[key]?.$type !== role.$type)
      problems.push(`${at}: --${key} is a ${tokens[key]?.$type} here and a ${role.$type} in roles.json, and the two cannot disagree`);
    if (!tokens[key]?.$description)
      problems.push(`${at}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
  }
  return problems;
}

export function declarationProblems(names: string[], blocks = FILES.flatMap((f) => f.blocks)) {
  const problems = [];
  const emitted = new Map(
    blocks.filter((b) => b.source.startsWith(PREFIX)).map((b) => [b.source, b.selector]),
  );
  for (const name of names) {
    const source = `${PREFIX}${name}.json`;
    const selector = emitted.get(source);
    if (!selector)
      problems.push(
        `${source} is emitted by no block in FILES in scripts/generate/arena/generate-tokens.ts, so it paints nothing: `
        + `add { selector: '.arena-${name}', source: '${source}' } after the :root blocks, since an extension and a role `
        + `have equal specificity and source order is what decides between them`,
      );
    else if (selector !== `.arena-${name}`)
      problems.push(`${source} is emitted under ${selector}, and an extension named ${name} is the class .arena-${name}`);
  }
  for (const source of emitted.keys())
    if (!names.includes(extensionName(source)))
      problems.push(`FILES emits ${source}, and no such file is in contracts/design/`);
  return problems;
}

export function zeroExtensionProblem(files: string[]) {
  return files.length === 0
    ? 'found 0 extensions -- an empty result set is a failure, not a clean pass; check the discovery path'
    : null;
}

export function collect(dir = DESIGN_DIR) {
  const files = extensionFiles(dir);
  const roles = readJson(join(dir, 'roles.json'));
  const problems = [];
  for (const f of files) problems.push(...extensionProblems(extensionName(f), readJson(join(dir, f)), roles));
  problems.push(...declarationProblems(files.map(extensionName)));
  return problems;
}

function main() {
  const files = extensionFiles();
  const zero = zeroExtensionProblem(files);
  if (zero) {
    console.error(`check-extensions: ${zero}`);
    process.exit(1);
  }
  const problems = collect();
  if (problems.length) {
    console.error(`check-extensions: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-extensions: ${files.length} extension(s), each moving roles only and each emitted under its own class`);
}

if (isMainModule(import.meta.url)) main();
