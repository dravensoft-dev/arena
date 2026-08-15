/* Holds the documentation norms nothing else checks: every .md under
 * MAX_DOCUMENT_CHARS unless SIZE_ALLOWANCE raises it, no banned punctuation in
 * a document's prose, the comment rule, which lets scripts and tests carry one
 * header of at most HEADER_MAX_LINES and every other hand-written source none,
 * the branch boundary, which keeps a contributor path out of a consumer's last
 * stop and, through RULE_OWNERS, a rule off the branch that does not own it,
 * FOREIGN_CODE, which keeps another design system out of the examples a reader
 * copies, and the two claims a consumer page makes about what SHIPS: how many
 * components, and which voices. SIZE_ALLOWANCE is empty, and that emptiness is
 * the claim: a document falling back inside the shared limit fails. */

import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { findComments } from '../../lib/arena/comments.ts';
import { proseSegments, fencedLines } from '../../lib/arena/markdown-prose.ts';
import { repoRoot as ROOT } from '../../lib/arena/repo-root.ts';
import { emittedTree } from '../../lib/arena/layers.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { captured } from '../../utils/captures.ts';
import { arenaScopeClasses, SCOPE_CLASS } from '../../lib/core/arena-tokens.ts';
import { extensionFiles, extensionName } from '../core/check-extensions.ts';

export const MAX_DOCUMENT_CHARS = 60_000;
export const HEADER_MAX_LINES = 10;
export const QUOTED_RUN_CHARS = 90;

export const EXPLANATORY_BY_CHARTER = 'DOUBTS.md';
export const DATED_PROCESS_DOCUMENTS = 'docs/';
export const SIZE_EXEMPT = [
  EXPLANATORY_BY_CHARTER,
  DATED_PROCESS_DOCUMENTS,
];

export const PROSE_EXEMPT = {
  [DATED_PROCESS_DOCUMENTS]:
    'a spec or a plan is deleted once executed, so its prose never becomes documentation',
};

export const SIZE_ALLOWANCE = new Map<string, { limit: number; reason: string }>([]);

export function limitFor(rel: string) {
  return SIZE_ALLOWANCE.get(rel)?.limit ?? MAX_DOCUMENT_CHARS;
}

export const BANNED_PUNCTUATION = [['—', 'an em dash']];

export const SOURCE_EXTENSIONS = ['.mjs', '.jsx', '.tsx', '.ts', '.js'];

export const COMMENT_RULE_SKIPS = new Map([
  ['.css',
   'a stylesheet, where a comment is the only place a declaration\'s reason can sit: a rule '
   + 'carries no name to say it through, and the alternative is a token whose why lives in a '
   + 'document the reader of the rule never opens. Animations.css is the case that decides it, '
   + 'since its header is the normative list of what rides each keyframe'],
  ['.html',
   'a page or a specimen, whose comment is markup a browser reads: the @dsCard marker is one, '
   + 'and stripping it would take the specimen out of the pages that render it'],
]);
export const SCANNED_TREES = ['scripts', 'frameworks', '.github'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'dist']);

export const READ_DESPITE_THE_DOT = new Set(['.gitkeep', '.github']);

export { emittedTree };

function walk(dir: string, keep: (path: string) => boolean, emitted: string): string[] {
  return walkFiles(dir, {
    skip: (name, path) => (name.startsWith('.') && !READ_DESPITE_THE_DOT.has(name))
      || SKIPPED_DIRECTORIES.has(name) || path === emitted,
  }).filter(keep);
}

export const SHEBANG = /^#![^\n]*\n/;

function startsFile(source: string, comment: { text: string }) {
  return source.slice(0, source.indexOf(comment.text)).replace(SHEBANG, '').trim() === '';
}

export function isGenerated(path: string) {
  return /\.generated\./.test(path);
}

export function allowsHeader(repoRelativePath: string) {
  const parts = repoRelativePath.split('/');
  return parts[0] === 'scripts'
    || parts.includes('test')
    || basename(repoRelativePath).includes('.test.');
}

function isPragma(text: string) {
  return /^\/[/*]\s*(@ts-|eslint-|prettier-|c8 |istanbul )/.test(text);
}

export const CONSUMER_LAST_STOP = '.prompt.md';
export const CONSUMER_INDEX = 'SKILL.md';
export const CONSUMER_TREE = 'frameworks/';

export const BRANCH_SWITCH = {
  'SKILL.md':
    'the root router is the switch between the two branches, and naming the contributor one is '
    + 'how it sends a contributor away. Every consumer document below it is downstream of that '
    + 'choice and has nobody left to redirect.',
};

export const CONSUMER_PACKAGE_PAGE = 'PACKAGE.md';

export function isConsumerDocument(repoRelativePath: string) {
  if (Object.hasOwn(BRANCH_SWITCH, repoRelativePath)) return false;
  if (repoRelativePath.endsWith(CONSUMER_LAST_STOP)) return true;
  if (basename(repoRelativePath) === CONSUMER_PACKAGE_PAGE && repoRelativePath.startsWith(CONSUMER_TREE)) return true;
  return basename(repoRelativePath) === CONSUMER_INDEX && repoRelativePath.startsWith(CONSUMER_TREE);
}

export const CONSUMER_OWN_OUTPUT = new Map([
  ['arena.generated.css',
   'the stylesheet the CONSUMER generates, in their own project, by running the arena-to-prod '
   + 'command each package ships. It carries the .generated. infix and is nothing this repository '
   + 'builds, so the build-product rule below reads it backwards: a reader of the npm page has '
   + 'this file and is being told to make it.'],
  ['icons.generated.css',
   'the Phosphor subset the CONSUMER generates, in their own project, by the same run of '
   + 'arena-to-prod. Same reading as arena.generated.css above: the infix is theirs '
   + 'and not this repository\'s, and the name is the one the npm page tells them to write.'],
]);

export const CONTRIBUTOR_PATHS = [
  [/\bscripts\/[\w./-]+/g, 'a path under scripts/, which no consumer of Arena has'],
  [/\bcontracts\/[a-z-]+\/AGENTS\.md\b/g, 'a normative contract document, which the router says not to read'],
  [/\bframeworks\/[a-z-]+\/AGENTS\.md\b/g, "a layer document, which is about changing Arena rather than using it"],
  [/\bframeworks\/PACKAGING\.md\b/g, 'the packaging document, which is about publishing Arena rather than using it'],
  [/\bframeworks\/[a-z-]+\/[A-Z][\w.]*\.[jt]sx?\b/g,
    'a layer-root source file, which a consumer reaches by importing the package rather than by path'],
  [/\b[\w-]+(?:\.[\w-]+)*\.(?:test|spec)\.(?:[jt]sx?)?/g,
    'a test file, which ships in no package and asserts something only this repository can run'],
  [/\b[\w-]+\.variants\.ts\b/g,
    "a layer's own styling recipe, which is compiled away before a package ships"],
  [/\b[\w-]+\.manifest\.json\b/g,
    'a Tailwind manifest, which is a source of the compiled stylesheet rather than a file a consumer has'],
  [/\b[\w-]+\.generated\b(?!\.html)/g,
    'a build product, which a consumer reaches by importing the package rather than by name. '
    + 'A generated demo page is the exception, being the one a by-hand check opens'],
];

export const FOREIGN_CODE = [
  [/\bmat-[a-z][\w-]*\b|\bmatInput\b|\bMat[A-Z]\w*\b/g,
   'Angular Material, which no Arena package depends on and no Arena component imports. An example '
   + 'reaching for it sends a reader to install a framework to draw what ArenaButton, ArenaIconButton '
   + 'and ArenaInput already draw'],
];

export const CONTRIBUTOR_BRANCH = 'contributor';
export const CONSUMER_BRANCH = 'consumer';

export const RULE_OWNERS = [
  {
    phrase: 'the nine forms',
    owner: CONTRIBUTOR_BRANCH,
    reason:
      "the API contract's own vocabulary. A consumer reads a member's type and default from the "
      + 'prompt table and never has to know how many forms exist, so a prompt reaching for the '
      + 'count is explaining a rule rather than a component.',
  },
  {
    phrase: 'binding table',
    owner: CONTRIBUTOR_BRANCH,
    reason:
      "the mapping from a contract member to each layer's idiom, which the layer has already "
      + 'applied by the time a consumer reads the prompt. Naming it sends a reader to a document '
      + 'the router tells them not to open.',
  },
  {
    phrase: /\bR[1-6]\b/,
    owner: CONTRIBUTOR_BRANCH,
    reason:
      'one of the six derived rules, cited by number. A rule number is a pointer into a rulebook '
      + 'the consumer branch never hands anybody, and it reaches a published .d.ts whenever it is '
      + "written into a contract description. State the consequence instead: \"a platform's own "
      + 'event type never travels in a payload\" says the same thing to a reader who has no R4. '
      + 'Registered as the family rather than as one number, because the first version of this '
      + 'entry named R4 alone and twenty-two live instances of R6 sat behind it.',
  },
  {
    phrase: /\bcheck:[a-z-]+/,
    owner: CONTRIBUTOR_BRANCH,
    reason:
      'a gate. Nobody consuming a package has the repository that runs one, so citing it as the '
      + 'reason for an API decision explains nothing and names a thing the reader cannot look at.',
  },
];

export function statesRule(text: string, phrase: string | RegExp) {
  return typeof phrase === 'string' ? text.includes(phrase) : phrase.test(text);
}

export function ruleOwnerProblems(root = ROOT, owners = RULE_OWNERS) {
  const problems = [];
  const met = new Set();
  for (const path of documents(root)) {
    const rel = relPosix(root, path);
    const branch = isConsumerDocument(rel) ? CONSUMER_BRANCH : CONTRIBUTOR_BRANCH;
    const text = readFileSync(path, 'utf8');
    for (const { phrase, owner, reason } of owners) {
      if (!statesRule(text, phrase)) continue;
      if (branch === owner) { met.add(phrase); continue; }
      problems.push(
        `${rel}: states "${phrase}", a ${owner} rule, on the ${branch} branch. `
        + `A rule written into both branches goes stale in one of them: ${reason}`,
      );
    }
  }
  for (const { phrase, owner, reason } of owners) {
    if (met.has(phrase)) continue;
    problems.push(
      `RULE_OWNERS assigns "${phrase}" to the ${owner} branch, and no document there states it, `
      + `so the entry outlived the rule it was written for: ${reason}`,
    );
  }
  return problems;
}

export const MEMBER_DOC_TREE = /^frameworks\/[^/]+\/components\//;

function isMemberDoc(text: string, repoRelativePath: string) {
  return MEMBER_DOC_TREE.test(repoRelativePath)
    && !repoRelativePath.includes('.test.')
    && text.startsWith('/**');
}

function documents(root: string) {
  return walk(root, (p: string) => p.endsWith('.md'), emittedTree(root));
}

function exempt(list: string[], rel: string) {
  return list.some((e) => rel === e || rel.startsWith(e));
}

function quote(text: string) {
  const run = text.trim();
  return run.length > QUOTED_RUN_CHARS ? `${run.slice(0, QUOTED_RUN_CHARS)}...` : run;
}

export function punctuationProblems(root = ROOT) {
  const scanned = documents(root);
  const problems = [];
  for (const path of scanned) {
    const rel = relPosix(root, path);
    if (exempt(Object.keys(PROSE_EXEMPT), rel)) continue;
    for (const segment of proseSegments(readFileSync(path, 'utf8'))) {
      for (const [character, name] of BANNED_PUNCTUATION) {
        if (character === undefined) continue;
        let at = segment.text.indexOf(character);
        while (at !== -1) {
          problems.push(
            `${rel}:${segment.line}:${segment.column + at}: ${name} in prose; `
            + `documentation punctuates with a colon, a comma or a full stop: "${quote(segment.text)}"`,
          );
          at = segment.text.indexOf(character, at + character.length);
        }
      }
    }
  }
  return { problems, scanned: scanned.length };
}

export function documentSizeProblems(root = ROOT, allowance = SIZE_ALLOWANCE) {
  const scanned = documents(root);
  const problems = [];
  const sizes = new Map();
  for (const path of scanned) {
    const rel = relPosix(root, path);
    if (exempt(SIZE_EXEMPT, rel)) continue;
    const size = readFileSync(path, 'utf8').length;
    sizes.set(rel, size);
    const limit = allowance.get(rel)?.limit ?? MAX_DOCUMENT_CHARS;
    if (size > limit) {
      problems.push(`${rel}: ${size} characters, over the ${limit} limit`);
    }
  }
  problems.push(...staleAllowanceProblems(sizes, allowance));
  return { problems, scanned: scanned.length };
}

export function staleAllowanceProblems(sizes: Map<string, number>, allowance = SIZE_ALLOWANCE) {
  const problems = [];
  for (const [rel, { limit, reason }] of allowance) {
    if (!sizes.has(rel)) {
      problems.push(
        `SIZE_ALLOWANCE raises ${rel} to ${limit}, and no document is there. An allowance for a `
        + `file that has moved or gone raises the limit for nothing: ${reason}`,
      );
      continue;
    }
    const size = sizes.get(rel) ?? 0;
    if (size <= MAX_DOCUMENT_CHARS) {
      problems.push(
        `SIZE_ALLOWANCE raises ${rel} to ${limit}, and it is ${size} characters, inside `
        + `the ${MAX_DOCUMENT_CHARS} everything else holds to. The allowance has outlived what it `
        + `was written for, so delete it and let the shared limit apply: ${reason}`,
      );
    }
  }
  return problems;
}

export function commentRuleProblems(root = ROOT) {
  const sources = SCANNED_TREES
    .map((tree) => join(root, tree))
    .filter((dir) => existsSync(dir))
    .flatMap((dir) => walk(dir, (p: string) => SOURCE_EXTENSIONS.some((e) => p.endsWith(e)), emittedTree(root)));

  const problems = [];
  let scanned = 0;

  for (const path of sources) {
    const source = readFileSync(path, 'utf8');
    if (isGenerated(path)) continue;
    scanned += 1;

    const rel = relPosix(root, path);
    const comments = findComments(source)
      .filter((c) => !isPragma(c.text) && !isMemberDoc(c.text, rel));
    if (comments.length === 0) continue;

    const [first, ...rest] = comments;
    if (!first) continue;
    const headerAllowed = allowsHeader(rel);

    if (!headerAllowed) {
      problems.push(`${rel}:${first.line}: carries a comment; only scripts and tests may, and only as a header`);
      continue;
    }
    if (!startsFile(source, first)) {
      problems.push(`${rel}:${first.line}: the one allowed comment must be the file header`);
      continue;
    }
    if (first.lines > HEADER_MAX_LINES) {
      problems.push(`${rel}:${first.line}: header is ${first.lines} lines, over the ${HEADER_MAX_LINES} limit`);
    }
    for (const extra of rest) {
      problems.push(`${rel}:${extra.line}: a second comment; one header per file is the whole allowance`);
    }
  }

  return { problems, scanned };
}

export function consumerBranchProblems(root = ROOT) {
  const scanned = documents(root).filter((p) => isConsumerDocument(relPosix(root, p)));
  const problems = [];
  for (const path of scanned) {
    const rel = relPosix(root, path);
    const source = readFileSync(path, 'utf8');
    for (const [pattern, reason] of CONTRIBUTOR_PATHS) {
      if (!pattern) continue;
      for (const hit of source.match(pattern) ?? []) {
        if ([...CONSUMER_OWN_OUTPUT.keys()].some((name) => name.startsWith(hit))) continue;
        problems.push(
          `${rel}: cites "${hit}", ${reason}. A consumer document is a stop on the way to writing `
          + 'a component: state the consequence here, and leave the reason on the contributor branch',
        );
      }
    }
  }
  return { problems, scanned: scanned.length };
}

export const COMPONENT_COUNT_CLAIM = /\b(\d+) components\b/g;

export function componentCountProblems(root = ROOT) {
  const declared = readJson(join(root, 'frameworks', 'Components.json')) as Record<string, string[]>;
  const shipped = Object.values(declared).flat().length;
  const scanned = documents(root)
    .filter((p) => basename(p) === CONSUMER_PACKAGE_PAGE && relPosix(root, p).startsWith(CONSUMER_TREE));
  const problems = [];

  for (const path of scanned) {
    const rel = relPosix(root, path);
    const claims = [...readFileSync(path, 'utf8').matchAll(COMPONENT_COUNT_CLAIM)];
    if (claims.length === 0) {
      problems.push(
        `${rel}: states no component count, and the page npm shows is where a reader meets one. `
        + `Write "${shipped} components" so this assertion holds it`,
      );
      continue;
    }
    for (const claim of claims) {
      if (Number(claim[1]) === shipped) continue;
      problems.push(
        `${rel}: claims ${claim[1]} components and Components.json declares ${shipped}. `
        + 'A count a reader meets first is worth holding, and this is the assertion that holds it',
      );
    }
  }

  if (scanned.length === 0) {
    problems.push(
      `found no ${CONSUMER_PACKAGE_PAGE} under ${CONSUMER_TREE} -- a count nobody counted is the `
      + 'defect this assertion exists to stop, so an empty walk is a failure rather than a pass',
    );
  }
  return { problems, scanned: scanned.length, shipped };
}

export const VOICE_PAGE_CLAIM = new Map<string, string>([
  ['frameworks/react/PACKAGE.md',
   'the npm page for the React package, and the place a consumer meets the catalogue at all: '
   + 'nothing else they read lists the voices'],
  ['frameworks/angular/PACKAGE.md', 'the same page for the Angular package, and the same reason'],
  ['SKILL.md',
   'the router an agent reads before it builds a screen, so it picks a voice on the reader\'s '
   + 'behalf and can only pick from what it was told about'],
]);

export const NOT_A_VOICE = new Map<string, string>([
  ['arena-num',
   'a utility from css/numerals.css that a consumer puts on one figure they draw themselves, so '
   + 'it is shipped and it is not a scope class: a voice is chosen once for a page and this is '
   + 'written per element'],
  ['arena-stack', 'the same, from css/rhythm.css: the air between two components, which a page applies and Arena never draws'],
  ['arena-row', 'the same sheet and the same reason, laid the other way'],
  ['arena-prose',
   'the same, from css/prose.css: the width of a reading column, which a consumer puts on the '
   + 'article or the section they wrote. A voice re-values --measure-prose behind it, which is '
   + 'exactly the split between a scope class and a utility'],
  ['arena-shell',
   'the same, from css/page.css: the column a page sits in, which a consumer puts on the element '
   + 'wrapping their header, main and footer. It is written once per page, which is what makes it '
   + 'read like a scope class, and it still is not one: it carries a box rather than a set of '
   + 'values, and a page carries it and a voice at the same time'],
  ['arena-band',
   'the same sheet: the content column itself, at --container-max with --gutter either side. A '
   + 'voice re-values both roles behind it, the way it re-values the measure behind .arena-prose'],
]);

export const CLASS_ATTRIBUTE = /class(?:Name)?="([^"]*)"/g;

const VOICE_CLASS = /^arena-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function scopeClassesNamed(text: string) {
  const out = new Set<string>();
  for (const m of text.matchAll(SCOPE_CLASS)) out.add(`arena-${captured(m)}`);
  for (const m of text.matchAll(CLASS_ATTRIBUTE))
    for (const cls of (m[1] ?? '').split(/\s+/)) if (VOICE_CLASS.test(cls)) out.add(cls);
  return out;
}

export function voiceCatalogueProblems(root = ROOT, pages = VOICE_PAGE_CLAIM, excused = NOT_A_VOICE) {
  const voices = extensionFiles(join(root, 'contracts', 'design')).map(extensionName);
  const allowed = new Set([...arenaScopeClasses(root)].map((c) => `arena-${c}`));
  for (const name of excused.keys()) allowed.add(name);
  const catalogue = voices.map((v) => `.arena-${v}`).join(', ');

  const problems = [];
  const written = new Set<string>();
  let scanned = 0;

  for (const [rel, why] of pages) {
    const path = join(root, rel);
    if (!existsSync(path)) {
      problems.push(
        `VOICE_PAGE_CLAIM names ${rel}, which is not there. It was on the record as ${why}, so `
        + 'either the catalogue moved to another page and this entry follows it, or a page that '
        + 'carried the claim has gone and nothing is holding the claim any more',
      );
      continue;
    }
    scanned++;
    const named = scopeClassesNamed(readFileSync(path, 'utf8'));
    for (const cls of named) written.add(cls);

    for (const voice of voices)
      if (!named.has(`arena-${voice}`))
        problems.push(
          `${rel}: names no .arena-${voice}, and this build ships it. The page is ${why}, and a `
          + `voice a consumer is never told about is a voice that did not ship. The catalogue is `
          + `${catalogue}`,
        );

    for (const cls of named)
      if (!allowed.has(cls))
        problems.push(
          `${rel}: offers .${cls}, and Arena answers to no such scope class, so the page offers `
          + `one the cascade ignores and a reader writes it into a root that does nothing. `
          + `The voices this build ships are ${catalogue}; if it is not a voice at all, record it `
          + 'in NOT_A_VOICE with what it is',
        );
  }

  for (const [name] of excused)
    if (!written.has(name))
      problems.push(`NOT_A_VOICE excuses .${name} and no page on the record writes it -- drop the entry`);

  if (voices.length === 0)
    problems.push('found 0 extensions -- with no catalogue to hold a page to, this assertion passes over nothing');
  if (scanned === 0)
    problems.push('read no page on the record -- a catalogue nobody offers is the defect this assertion exists to stop');

  return { problems, scanned, voices };
}

export function foreignCodeProblems(root = ROOT) {
  const scanned = documents(root).filter((p) => isConsumerDocument(relPosix(root, p)));
  const problems = [];
  for (const path of scanned) {
    const rel = relPosix(root, path);
    for (const { line, text } of fencedLines(readFileSync(path, 'utf8'))) {
      for (const [pattern, reason] of FOREIGN_CODE) {
        if (!pattern) continue;
        for (const hit of text.match(pattern) ?? []) {
          problems.push(
            `${rel}:${line}: a fenced example writes "${hit}", ${reason}. Prose may name a foreign `
            + 'system to refuse it, and an example is the half a reader copies',
          );
        }
      }
    }
  }
  return { problems, scanned: scanned.length };
}

export function zeroScanProblems(
  { documents, sources, prompts }: { documents: number; sources: number; prompts: number },
) {
  const problems = [];
  if (documents === 0) problems.push('found no .md files at all -- the document walk reached nothing');
  if (sources === 0) problems.push('found no source files at all -- the comment walk reached nothing');
  if (prompts === 0) problems.push('found no .prompt.md files at all -- the consumer branch reached nothing');
  return problems;
}

export function branchSwitchProblems(root = ROOT) {
  return Object.keys(BRANCH_SWITCH)
    .filter((rel) => !existsSync(join(root, rel)))
    .map((rel) => `BRANCH_SWITCH exempts ${rel}, which is not there -- a stale exemption is worse than none`);
}

function main() {
  const sizes = documentSizeProblems();
  const punctuation = punctuationProblems();
  const comments = commentRuleProblems();
  const branch = consumerBranchProblems();
  const empty = zeroScanProblems({
    documents: sizes.scanned,
    sources: comments.scanned,
    prompts: branch.scanned,
  });
  const foreign = foreignCodeProblems();
  const counts = componentCountProblems();
  const voices = voiceCatalogueProblems();
  const problems = [
    ...empty, ...branchSwitchProblems(), ...sizes.problems, ...punctuation.problems,
    ...comments.problems, ...branch.problems, ...ruleOwnerProblems(), ...foreign.problems,
    ...counts.problems, ...voices.problems,
  ];

  if (problems.length > 0) {
    for (const problem of problems) console.error(`check-docs: ${problem}`);
    console.error(`\ncheck-docs: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(
    `check-docs: ${sizes.scanned} document(s) inside their limit, ${MAX_DOCUMENT_CHARS} characters `
    + `bar ${SIZE_ALLOWANCE.size} on the record, and clear of `
    + `banned punctuation; ${comments.scanned} hand-written source(s) hold to the comment rule; `
    + `${branch.scanned} consumer document(s) cite no contributor path, offer no foreign framework `
    + `in a fenced example, and neither branch states one of the other's ${RULE_OWNERS.length} `
    + `registered rules; ${counts.scanned} package page(s) count ${counts.shipped} components; `
    + `${voices.scanned} page(s) offer the ${voices.voices.length} voice(s) this build ships and `
    + 'no class the cascade would ignore',
  );
}

if (isMainModule(import.meta.url)) main();
