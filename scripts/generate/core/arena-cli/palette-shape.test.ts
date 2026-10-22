/* The palette subpath and the Angular theme surface each declare ArenaRuntimePalette, because the
 * root entry may not import scripts/. Importing the Angular file here would pull its framework
 * code into the scripts compile, so this reads both declarations and compares their members:
 * a field renamed or retyped on either side fails this test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { repoRoot } from '../../../lib/arena/repo-root.ts';

const flat = (text: string) => text.replace(/[;,]$/, '').replace(/\s+/g, ' ');

function members(file: string): string[] {
  const text = readFileSync(join(repoRoot, file), 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  let polarity = `'dark' | 'light'`;
  source.forEachChild((node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ArenaPolarity') polarity = flat(node.type.getText(source));
  });
  const spelled = (member: ts.TypeElement) => flat(member.getText(source)).replace('ArenaPolarity', polarity);
  let found: string[] | null = null;
  source.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'ArenaRuntimePalette') {
      found = node.members.map(spelled);
    }
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'ArenaRuntimePalette' && ts.isTypeLiteralNode(node.type)) {
      found = node.type.members.map(spelled);
    }
  });
  assert.ok(found, `${file} declares no ArenaRuntimePalette`);
  return (found as string[]).sort();
}

test('Angular and the palette subpath declare the same ArenaRuntimePalette, member by member', () => {
  const built = members('scripts/generate/core/arena-cli/palette.ts');
  assert.deepEqual(members('frameworks/angular/theme/ArenaThemeService.ts'), built);
});
