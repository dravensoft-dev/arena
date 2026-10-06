/* The five readers of a manifest key, asked the question a Windows runner asks. Each of them
 * treats the key as a string carrying '/', and against a native one four answer the input
 * unchanged and the fifth throws: the build wrote every sheet beside its manifest, emitted a
 * barrel of backslash specifiers into CSS, skipped both consumer mirrors, and then died in
 * preludeSpecifier on a repeat of -3 that named neither the file nor the reason. None of that is
 * reachable from Linux through the real build, whose keys are already posix; it is reachable by
 * spelling the key the way win32 would and asking the same functions. The expected values below
 * are the ones the committed tree holds, not arithmetic done on paper. */

import test from 'node:test';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { join, win32 } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  CONSUME, PRELUDE, preludeSpecifier, sheetPath, buildVocabularyCss, vocabularyImports, vocabularyTypes,
} from './build-tailwind.ts';
import type { Family } from '../../lib/tailwind/vocabulary.ts';

const WINDOWS_ROOT = 'D:\\a\\arena\\arena';

const WINDOWS_MANIFEST =
  'D:\\a\\arena\\arena\\frameworks\\tailwind\\components\\display\\arena-badge\\ArenaBadge.manifest.json';

const key = () => relPosix(WINDOWS_ROOT, WINDOWS_MANIFEST, win32);

test('a key made on Windows is the same key Linux makes, which is what every reader below assumes', () => {
  assert.equal(key(), 'frameworks/tailwind/components/display/arena-badge/ArenaBadge.manifest.json');
});

test('the sheet lands under consume/ at the same category and directory, and not beside its manifest', () => {
  assert.equal(sheetPath(key()),
    'frameworks/tailwind/consume/components/display/arena-badge/ArenaBadge.styles.generated.css');
});

test('the prelude specifier climbs the directories that are there, and never a negative number of them', () => {
  assert.equal(preludeSpecifier(sheetPath(key())), '../../../Prelude.generated.css',
    'this is the specifier the committed ArenaBadge sheet holds; a native key counts three fewer '
    + 'segments, and repeat of -3 is the RangeError the Windows leg reported');
});

test('a key that is not repo-relative posix says so, rather than throwing a RangeError naming nothing', () => {
  assert.throws(() => preludeSpecifier('frameworks\\tailwind\\consume\\components\\x\\Y.styles.generated.css'),
    /repo-relative posix key/);
});

test('a native key is a silent no-op in sheetPath, which is why the key and not the reader is the fix', () => {
  const native = 'frameworks\\tailwind\\components\\display\\arena-badge\\ArenaBadge.manifest.json';
  assert.equal(sheetPath(native), native.replace(/\.manifest\.json$/, '.styles.generated.css'),
    'the prefix replace matches nothing, so the sheet keeps the manifest\'s own directory and no '
    + 'error is raised: the build simply writes the file somewhere no barrel imports it from');
});

test('the barrel specifier is relative to consume/, since it is written into a stylesheet', () => {
  assert.equal(sheetPath(key()).replace(`${CONSUME}/`, ''),
    'components/display/arena-badge/ArenaBadge.styles.generated.css');
});

test('a class module mirrors into a consuming layer by prefix, which a native key would skip', () => {
  assert.equal(
    key().replace(/\.manifest\.json$/, '.classes.generated.ts').replace('frameworks/tailwind/', 'frameworks/react/'),
    'frameworks/react/components/display/arena-badge/ArenaBadge.classes.generated.ts');
});

test('the prelude the specifier points at is the one under consume/, so the depth is read from it', () => {
  assert.equal(PRELUDE, `${CONSUME}/Prelude.generated.css`,
    'preludeSpecifier counts segments against this constant, so a move of the prelude changes '
    + 'every sheet and the count has to come from here rather than from a literal');
});

test('every family under the vocabulary directory compiles to its own sheet under consume/vocabulary', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-vocab-'));
  try {
    mkdirSync(join(root, 'frameworks/tailwind/vocabulary/arena-fill'), { recursive: true });
    writeFileSync(join(root, 'frameworks/tailwind/vocabulary/arena-fill/Fill.family.json'), JSON.stringify({
      family: 'fill', reach: 'box', description: 'd', default: 'arena-fit',
      variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' },
    }));
    const manifests = new Map([['frameworks/tailwind/components/forms/arena-button/ArenaButton.manifest.json',
      { component: 'ArenaButton', answers: ['fill'], slots: { root: 'w-[var(--arena-fill-width,fit-content)]' } }]]);
    const out = buildVocabularyCss({ root, manifests });
    const sheet = out.get(join(root, 'frameworks/tailwind/consume/vocabulary/Fill.generated.css')) ?? '';
    assert.match(sheet, /^\/\* GENERATED by scripts\/build\/tailwind\/build-tailwind\.ts/);
    assert.match(sheet, /\[data-arena-part="button"\]/);
    assert.deepEqual(vocabularyImports(root), ["@import './vocabulary/Fill.generated.css';"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a tree with no family emits no vocabulary sheet and imports none', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-vocab-'));
  try {
    assert.equal(buildVocabularyCss({ root, manifests: new Map() }).size, 0);
    assert.deepEqual(vocabularyImports(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('each component gets every context class and the box classes its manifest answers, as a type and as a runtime list', () => {
  const families = [
    { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } },
    { family: 'witness', reach: 'context', description: 'd', default: 'arena-witness-off', variants: { 'arena-witness-on': '[--arena-witness-mark:1]', 'arena-witness-off': '[--arena-witness-mark:0]' } },
  ] as const;
  const text = vocabularyTypes([...families], new Map([['ArenaButton', ['fill']]]), ['ArenaButton', 'ArenaCard'], 'https://x/frameworks/VOCABULARY.md');
  assert.match(text, /export type ArenaContextClass = 'arena-witness-off' \| 'arena-witness-on';/);
  assert.match(text, /export type ArenaFillClass = 'arena-fill' \| 'arena-fit';/);
  assert.match(text, /export type ArenaButtonClass = ArenaClassList<ArenaContextClass \| ArenaFillClass>;/);
  assert.match(text, /export type ArenaCardClass = ArenaClassList<ArenaContextClass>;/);
  assert.match(text, /"ArenaButton": \["arena-witness-off", "arena-witness-on", "arena-fill", "arena-fit"\]/);
  assert.match(text, /"ArenaCard": \["arena-witness-off", "arena-witness-on"\]/);
});

test('with no context family the context union is never, so a component answering nothing takes no class', () => {
  assert.match(vocabularyTypes([], new Map(), ['ArenaCard'], 'p'), /export type ArenaContextClass = never;/);
});

test('a markup box family is offered to no component, and a markup context family to every one', () => {
  const stack = { family: 'stack', reach: 'box', target: 'markup', description: 'd', variants: { 'arena-stack': '[display:flex]' } } as Family;
  const density = { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd',
    variants: { 'arena-compact': 'x', 'arena-comfortable': 'y' } } as Family;
  const text = vocabularyTypes([stack, density], new Map(), ['ArenaCard'], 'p');
  assert.match(text, /export type ArenaContextClass = 'arena-comfortable' \| 'arena-compact';/);
  assert.doesNotMatch(text, /ArenaStackClass|arena-stack/);
  assert.match(text, /"ArenaCard": \["arena-comfortable", "arena-compact"\]/);
});

test('a component takes a list of its vocabulary classes, and a box family contributes only the options it answers', () => {
  const families = [
    { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } },
    { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd', variants: { 'arena-compact': 'x' } },
  ] as Family[];
  const text = vocabularyTypes(families, new Map<string, any>([
    ['ArenaButton', ['fill']],
    ['ArenaTag', [{ family: 'fill', options: ['arena-fit'], default: 'arena-fit' }]],
  ]), ['ArenaButton', 'ArenaTag'], 'p');
  assert.match(text, /export type ArenaClassList<T extends string> = T \| `\${T} \${T}` \| `\${T} \${T} \${T}`;/);
  assert.match(text, /export type ArenaTagClass = ArenaClassList<ArenaContextClass \| 'arena-fit'>;/);
  assert.match(text, /"ArenaTag": \["arena-compact", "arena-fit"\]/);
  assert.match(text, /"ArenaButton": \["arena-compact", "arena-fill", "arena-fit"\]/);
});

test('the emitted ArenaButtonClass accepts a list of classes, and refuses a token no family writes', () => {
  const families = [
    { family: 'fill', reach: 'box', description: 'd', default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } },
    { family: 'density', reach: 'context', target: 'markup', restates: 'dz', description: 'd', variants: { 'arena-compact': 'x', 'arena-comfortable': 'y' } },
  ] as Family[];
  const source = vocabularyTypes(families, new Map([['ArenaButton', ['fill']]]), ['ArenaButton'], 'p');
  const diagnostics = (line: string) => {
    const files = new Map([['/v.ts', source], ['/use.ts', `import type { ArenaButtonClass } from './v.ts';\n${line}\n`]]);
    const options = { noEmit: true, strict: true, allowImportingTsExtensions: true, types: [] };
    const host = ts.createCompilerHost(options);
    const read = host.readFile.bind(host);
    host.readFile = (file) => files.get(file) ?? read(file);
    host.fileExists = (file) => files.has(file) || ts.sys.fileExists(file);
    const load = host.getSourceFile.bind(host);
    host.getSourceFile = (file, language, ...rest) => (files.has(file) ? ts.createSourceFile(file, files.get(file)!, language) : load(file, language, ...rest));
    return ts.getPreEmitDiagnostics(ts.createProgram(['/use.ts'], options, host));
  };
  assert.equal(diagnostics("export const a: ArenaButtonClass = 'arena-fill arena-compact';").length, 0);
  assert.equal(diagnostics("export const a: ArenaButtonClass = 'arena-fill arena-fit';").length, 0,
    'only the runtime refuses two options of one family, since arenaClassName drops the second');
  assert.ok(diagnostics("export const a: ArenaButtonClass = 'arena-nope';").length > 0);
});
