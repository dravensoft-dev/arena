/* A slot gated by a contentChild(ArenaX) reports whether anything was projected, and the query
 * resolves the DIRECTIVE: a template that writes the attribute without listing ArenaX in its own
 * imports leaves the query null, the guard never renders, and the projected content vanishes.
 * Nothing reports it, because it is valid HTML and a valid compile, and the component cannot tell
 * an un-imported marker from an unfilled slot. So the check sits outside, here, over the
 * consumer's own sources, reading which host queries which marker out of the map the package
 * carries rather than out of a table that would rot. Its unit is one DECLARATION and never one
 * file: the two readers below each answer about the first they meet, so componentsOf cuts at the
 * decorator and pairs every template with the imports of its own component. Merging the file's
 * imports instead would let one component's import cover its sibling's marker. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type MarkerMap = Record<string, string[]>;

export function directiveFor(attribute: string, directives: Record<string, string> = {}): string {
  const named = directives[attribute];
  if (named) return named;
  return `Arena${attribute.charAt(0).toUpperCase()}${attribute.slice(1)}`;
}

export function stripAttributeValues(template: string): string {
  return template.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
}

export function markerUses(template: string, markers: MarkerMap) {
  const attributes = new Set(Object.values(markers).flat());
  const uses: Array<{ attribute: string; host: string }> = [];
  const stack: string[] = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

  for (const match of template.matchAll(tag)) {
    const [, closing, name = '', attrs = '', selfClosing] = match;
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at !== -1) stack.length = at;
      continue;
    }
    const bare = stripAttributeValues(attrs);
    for (const attribute of attributes) {
      if (!new RegExp(`(^|\\s)${attribute}(?=$|[\\s/=])`).test(bare)) continue;
      const host = [...stack].reverse().find((tagName) => (markers[tagName] ?? []).includes(attribute));
      if (host) uses.push({ attribute, host });
    }
    if (!selfClosing) stack.push(name);
  }
  return uses;
}

export function componentsOf(source: string): string[] {
  const starts = [...source.matchAll(/@Component\s*\(/g)].map((match) => match.index ?? 0);
  return starts.map((start, i) => source.slice(start, starts[i + 1]));
}

export function importsOf(source: string): string {
  const at = source.indexOf('imports: [');
  if (at === -1) return '';
  const end = source.indexOf(']', at);
  return end === -1 ? '' : source.slice(at, end);
}

export function templatesOf(path: string, source: string, read = readFileSync): string[] {
  const templates: string[] = [];
  const inline = source.indexOf('template: `');
  if (inline !== -1) {
    const start = inline + 'template: `'.length;
    const end = source.indexOf('`', start);
    if (end !== -1) templates.push(source.slice(start, end));
  }
  for (const match of source.matchAll(/templateUrl:\s*['"]([^'"]+)['"]/g)) {
    const at = join(dirname(path), match[1] ?? '');
    try {
      const template = String(read(at, 'utf8'));
      if (template !== '') templates.push(template);
    } catch {
      continue;
    }
  }
  return templates;
}

export function markerProblems(
  files: Array<{ path: string; source: string }>,
  markers: MarkerMap,
  directives: Record<string, string> = {},
  read = readFileSync,
): string[] {
  const problems: string[] = [];
  if (Object.keys(markers).length === 0) return problems;

  for (const { path, source } of files) {
    for (const declaration of componentsOf(source)) {
      if (!declaration.includes('imports: [')) continue;
      const imports = importsOf(declaration);
      for (const template of templatesOf(path, declaration, read)) {
        for (const { attribute, host } of markerUses(template, markers)) {
          const directive = directiveFor(attribute, directives);
          if (imports.includes(directive)) continue;
          problems.push(
            `${path} projects into the \`${attribute}\` slot of <${host}> and does not import `
            + `${directive}. That slot is gated on a query for the directive, so without the import `
            + 'it renders nothing at all, and neither the build nor the typecheck says so',
          );
        }
      }
    }
  }
  return [...new Set(problems)];
}
