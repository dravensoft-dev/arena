/* One TypeScript program over tsconfig.test.json and the JIT transform the Angular CLI applies,
 * which writes the metadata Bun drops when it strips a layer source's types: a signal input, a
 * query, a model. jit-preload.ts loads every layer source through emitJit(path, jit), so the
 * suites run from source with no ngc emit. */

import { join } from 'node:path';
import ts from 'typescript';
import { angularJitApplicationTransform } from '@angular/compiler-cli';
import { repoRoot } from '../arena/repo-root.ts';

export const PROJECT = join(repoRoot, 'frameworks', 'angular', 'tsconfig.test.json');
const pathPattern = (path: string) => path.split(/[\\/]/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\\\/]');
export const FROM_SOURCE = new RegExp(`^${pathPattern(join(repoRoot, 'frameworks', 'angular'))}[\\\\/](?!build[\\\\/]|dist[\\\\/]|node_modules[\\\\/]).*\\.ts$`);

export function jitProgram(project = PROJECT) {
  const parsed = ts.getParsedCommandLineOfConfigFile(project, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(`jit-preload: ${project} does not parse: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
    },
  });
  if (!parsed) throw new Error(`jit-preload: ${project} does not parse`);
  const options = { ...parsed.options, noEmit: false, declaration: false, sourceMap: false, inlineSourceMap: true, inlineSources: true };
  const program = ts.createProgram({ rootNames: parsed.fileNames, options });
  return { program, options, transform: angularJitApplicationTransform(program) };
}

export function emitJit(path: string, jit: ReturnType<typeof jitProgram>) {
  const source = jit.program.getSourceFile(path);
  if (!source) {
    throw new Error(`jit-preload: ${path} is outside ${PROJECT}, so no program reads it; `
      + 'add it to that tsconfig or run the emitted suite');
  }
  let out: string | undefined;
  jit.program.emit(source, (name, text) => { if (name.endsWith('.js')) out = text; }, undefined, false, { before: [jit.transform] });
  if (out === undefined) throw new Error(`jit-preload: ${path} emitted no JavaScript`);
  return out;
}
