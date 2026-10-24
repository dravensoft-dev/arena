/* The package sheet written flat: every `@import` of the installed package, and every relative `@import`
 * inside the sheets it reaches, is replaced by the file's own text, each file once at its first
 * occurrence, so a page with no CSS bundler can link the one file and every bundler reads the same
 * rules in the same order. A sheet the flat file cannot carry (an import that names no file of the
 * package, a `url()` that is not inline data) is a problem the build stops on. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { relPosix } from './posix.ts';
import { PACKAGE_HEADER, packageLines } from './theme-css.ts';
import type { CheckedConfig, PackageOptions } from './theme-css.ts';

const IMPORT = /@import\s+([^;]*);/g;
const QUOTED = /^(['"])([^'"]+)\1$/;
const URL_CALL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/g;

export function flattenImports(lines: string[], root: string, packageName: string): { css: string; problems: string[] } {
  const base = resolve(root);
  const prefix = `${packageName}/`;
  const emitted = new Set<string>();
  const problems: string[] = [];
  const marker = (file: string) => `/* ${packageName}/${relPosix(base, file)} */`;
  const inside = (file: string) => { const rel = relPosix(base, file); return rel !== '..' && !rel.startsWith('../') && !isAbsolute(rel); };

  const visit = (file: string, from: string, written: string): string => {
    if (!inside(file) || !existsSync(file) || !statSync(file).isFile()) {
      problems.push(`${from} imports ${written}, which is no file of the installed ${packageName}`);
      return '';
    }
    if (emitted.has(file)) return '';
    emitted.add(file);
    const label = marker(file).slice(3, -3);
    const css = readFileSync(file, 'utf8');
    for (const [, , target = ''] of css.replace(IMPORT, '').matchAll(URL_CALL)) {
      if (!/^data:/i.test(target.trim())) problems.push(`${label} holds url(${target}), and a flat sheet carries no file beside it`);
    }
    const body = css.replace(IMPORT, (_all, argument: string) => {
      const quoted = QUOTED.exec(argument.trim());
      const target = quoted?.[2] ?? '';
      if (!quoted || !target.startsWith('.')) {
        problems.push(`${label} imports ${argument.trim()}, which is not a quoted relative path`);
        return '';
      }
      return visit(resolve(dirname(file), target), label, target);
    });
    return `${marker(file)}\n${body.replace(/\s+$/, '')}\n`;
  };

  const parts: string[] = [];
  for (const line of lines) {
    const quoted = /^@import\s+(['"])([^'"]+)\1\s*;\s*$/.exec(line.trim());
    const target = quoted?.[2] ?? '';
    if (!target.startsWith(prefix)) {
      problems.push(`${line.trim()} is not an import of ${prefix}<path>`);
      continue;
    }
    parts.push(visit(resolve(base, target.slice(prefix.length)), packageName, target));
  }
  return { css: parts.filter((part) => part !== '').join('\n'), problems };
}

export function packageSheet(config: CheckedConfig, options: PackageOptions = {}): { css: string; problems: string[] } {
  const lines = packageLines(config, options);
  const { packageName = '@dravensoft/arena-react', root = null } = options;
  if (root === null) return { css: '', problems: [`arena build cannot read the installed ${packageName}`] };
  const flat = flattenImports(lines, root, packageName);
  return { css: `${PACKAGE_HEADER}\n${flat.css}`, problems: flat.problems };
}
