/* Each claim is driven over a source built in a temporary tree, because the repository passing is
 * the weakest evidence a gate can offer: it is what a gate that holds nothing also reports. The
 * masking pair is asserted both ways round, since the one pass that reads a string and the passes
 * that must not are the shape this gate got wrong first. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BROWSER_GLOBALS, ENVELOPES, ROUTER, ROUTER_ONLY_UNDER, SSR_HOSTILE, architectureProblems,
  deferred, envelopeProblems, hostileApiProblems, importsIn, masked, moduleScopeProblems, node,
  optionalPeerProblems, packageOf, shipped, topLevelStatements, withoutComments, zeroScanProblems,
} from './check-architecture.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-architecture-'));
  for (const [rel, text] of Object.entries(files)) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const react = (body: string) => tree({ 'frameworks/react/A.ts': body });

test('every envelope names a layer, its allowed reach and the reason a consumer is spared it', () => {
  assert.deepEqual(ENVELOPES.map((one) => one.layer), ['react', 'angular']);
  for (const one of ENVELOPES) {
    assert.ok(one.allowed.length > 0, `${one.layer} allows something`);
    assert.ok(one.why.length > 80, `${one.layer} states what admitting a package would cost`);
  }
  assert.deepEqual(node.writes, [], 'a gate judges and does not emit');
});

test('the two maskers are opposites where it matters: a specifier survives one and no global survives the other', () => {
  const source = "import x from 'react';\n// window.innerWidth in a comment\nconst s = 'document';";
  assert.match(withoutComments(source), /'react'/, 'an import specifier is a string and must survive');
  assert.doesNotMatch(withoutComments(source), /innerWidth/, 'a comment is blanked');
  assert.doesNotMatch(masked(source), /react/, 'the full mask blanks a string too');
  assert.equal(masked(source).split('\n').length, source.split('\n').length,
    'masking preserves line structure, so an offset still resolves');
});

test('a specifier is reduced to the package a consumer installs, and a relative one to nothing', () => {
  assert.equal(packageOf('@angular/router'), '@angular/router');
  assert.equal(packageOf('@angular/cdk/overlay'), '@angular/cdk');
  assert.equal(packageOf('react-dom/server'), 'react-dom');
  assert.equal(packageOf('./Local.ts'), null);
  assert.equal(packageOf('node:fs'), null, 'node built-ins are the host and not a dependency');
});

test('an import outside the envelope is a decision the library made for its consumer', () => {
  const base = react("import { useRouter } from 'next/navigation';\n");
  const problems = envelopeProblems(ENVELOPES[0]!, base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /imports next, which is outside the react envelope/);
  assert.deepEqual(envelopeProblems(ENVELOPES[0]!, react("import { useId } from 'react';\n")), []);
});

test('a dynamic import counts, because a consumer installs what a chunk asks for too', () => {
  assert.deepEqual(importsIn("const m = await import('some-store');"), ['some-store']);
});

test('a browser global read while the module evaluates is reported, and one inside a function is not', () => {
  assert.equal(moduleScopeProblems(react('const w = window.innerWidth;\n')).length, 1);
  assert.match(moduleScopeProblems(react('const w = window.innerWidth;\n'))[0] ?? '',
    /throws during a server render/);
  assert.deepEqual(moduleScopeProblems(react('export const w = () => window.innerWidth;\n')), []);
  assert.deepEqual(moduleScopeProblems(react('function w() { return document.title; }\n')), []);
});

test('a typeof guard is the escape the layer already uses, and it is accepted', () => {
  assert.deepEqual(
    moduleScopeProblems(react("const d = typeof document === 'undefined' ? null : document.body;\n")),
    [],
  );
  assert.ok(deferred("typeof window === 'undefined'", 'window'));
  assert.ok(!deferred('const w = window.innerWidth', 'window'));
});

test('a global named in a comment or a string is prose and never a read', () => {
  assert.deepEqual(moduleScopeProblems(react('// window.innerWidth is read in the hook below\n')), []);
  assert.deepEqual(moduleScopeProblems(react("const name = 'document';\n")), []);
});

test('every global the gate watches is one a server has none of', () => {
  assert.ok(BROWSER_GLOBALS.includes('window') && BROWSER_GLOBALS.includes('document'));
  for (const one of BROWSER_GLOBALS) assert.match(one, /^[A-Za-z]+$/);
});

test('a top-level statement is split on depth, so a brace-heavy expression is one statement', () => {
  const found = topLevelStatements('const a = { b: 1 };\nconst c = 2;\n');
  assert.equal(found.length, 2);
  assert.match(found[0]?.text ?? '', /const a/);
});

test('an API a server render cannot answer is reported wherever it sits', () => {
  const problems = hostileApiProblems(react("import { useLayoutEffect } from 'react';\n"));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /useLayoutEffect/);
  for (const [, why] of SSR_HOSTILE) assert.ok(why.length > 60, 'each names what to do instead');
});

test('the router keeps the promise its optional declaration makes, at both ends', () => {
  assert.match(optionalPeerProblems({})[0] ?? '', /no longer declared optional/);
  assert.deepEqual(optionalPeerProblems({ [ROUTER]: { optional: true } }, react('')), []);

  const base = tree({
    'frameworks/angular/Toasts.ts': `import { Router } from '${ROUTER}';\n`,
    [`${ROUTER_ONLY_UNDER}Strategy.ts`]: `import { TitleStrategy } from '${ROUTER}';\n`,
  });
  const problems = optionalPeerProblems({ [ROUTER]: { optional: true } }, base);
  assert.equal(problems.length, 1, 'the metadata entry point may import it and nothing else may');
  assert.match(problems[0] ?? '', /frameworks\/angular\/Toasts\.ts/);
});

test('a suite, a demo and a build output are not shipped sources', () => {
  const base = tree({
    'frameworks/react/A.test.tsx': 'const w = window.innerWidth;',
    'frameworks/react/dist/B.ts': 'const w = window.innerWidth;',
    'frameworks/react/C.demo.entry.generated.tsx': 'const w = window.innerWidth;',
    'frameworks/react/D.ts': "import { useId } from 'react';",
  });
  assert.deepEqual(shipped('react', base), ['frameworks/react/D.ts']);
  assert.deepEqual(moduleScopeProblems(base), []);
});

test('a layer that walked nothing is a failure rather than a clean pass', () => {
  assert.match(zeroScanProblems(new Map([['react', 0]]))[0] ?? '', /walked 0 shipped source/);
  assert.deepEqual(zeroScanProblems(new Map([['react', 12]])), []);
});

test('the repository is inside its own envelope, over more than nothing', () => {
  const { problems, counted } = architectureProblems();
  assert.deepEqual(problems, []);
  for (const [layer, n] of counted) assert.ok(n > 20, `${layer} was measured over its real tree`);
});
