/* The properties a container sets, asked of the TypeScript compiler against the regenerated
 * vocabulary types: the documented examples compile under strict, a misspelt property
 * and a number are errors. The program is rooted at the vocabulary types and a virtual
 * example, with @types/react from the repo's node_modules. */

import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { join, resolve } from 'node:path';
import { budgetFor, deadline } from '../../lib/arena/deadline.ts';

const root = resolve(import.meta.dirname, '../../..');
const generated = join(root, 'frameworks/react/Vocabulary.generated.ts');
const example = join(root, 'frameworks/react/css-properties-example.tsx');
const PROGRAM_BUILT = deadline('typescript program built', 30_000, 'each case builds a full program rooted at the vocabulary types and @types/react, which took 5.6 s on a loaded machine; 30 s ends a hang, not a slow run');

function diagnose(style: string) {
  const options: ts.CompilerOptions = {
    strict: true, jsx: ts.JsxEmit.ReactJSX, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, allowImportingTsExtensions: true,
  };
  const host = ts.createCompilerHost(options);
  const load = host.getSourceFile.bind(host);
  const text = `export const el = <div style={${style}} />;\n`;
  const isExample = (file: string) => resolve(file) === example;
  host.getSourceFile = (file, language, ...rest) => (isExample(file) ? ts.createSourceFile(file, text, language) : load(file, language, ...rest));
  const read = host.fileExists.bind(host);
  host.fileExists = (file) => isExample(file) || read(file);
  return ts.getPreEmitDiagnostics(ts.createProgram([generated, example], options, host));
}

test('the column example compiles', { timeout: budgetFor(PROGRAM_BUILT, PROGRAM_BUILT) }, () => {
  assert.deepEqual(diagnose("{ '--arena-column-build-width': 'calc(var(--sp-1) * 24)', '--arena-column-p95-align': 'right' }").map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')), []);
  assert.deepEqual(diagnose("{ display: 'flex', gap: 'var(--sp-3)', '--arena-skeleton-height': 'calc(var(--sp-1) * 10)', '--arena-skeleton-width': 'calc(var(--sp-1) * 55)' }").map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')), []);
});

test('a misspelt property is an error', () => {
  assert.deepEqual(diagnose("{ '--arena-colum-x-width': '1px' }").map((d) => d.code), [2353]);
});

test('a number is an error', () => {
  assert.deepEqual(diagnose("{ '--arena-grid-min': 4 }").map((d) => d.code), [2322]);
});
