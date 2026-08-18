/* What a page loads as JavaScript, read out of its own text, for the two sides that have to agree
 * about it: the one assembling the site and the gate holding it. A `<script type="module">` names
 * an entry and the entry names the next module, so what a page needs is a graph and never a
 * directory. An HTML target and an import specifier get two questions, being two notations: a
 * `src` is a URL, so anything without a scheme is a path, while a specifier is an ES one, so a
 * bare name is the import map's, and following that as a path reports the map's own key as a file
 * nobody wrote. Both import patterns anchor at a statement boundary and require the `from`,
 * because `export function ArenaBreadcrumbs({ separator = "/" })` opens with `export` and quotes a
 * default argument, which read as a specifier is an import of the root of the filesystem. Nothing
 * here opens a file: it takes text and hands back targets, and the caller resolves them. */

export const OFF_SITE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

export const SCRIPT_TAG = /<script\b([^>]*)>/gi;
export const IMPORT_MAP = /<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi;
export const MODULE_TYPE = /\btype\s*=\s*["']module["']/i;
export const SRC_ATTR = /\bsrc\s*=\s*["']([^"']+)["']/i;

export const SIDE_EFFECT_IMPORT = /(?:^|[;}])\s*import\s*["']([^"']+)["']/gm;
export const FROM_IMPORT = /(?:^|[;}])\s*(?:import|export)\b[^;'"]*?\bfrom\s*["']([^"']+)["']/gm;
export const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

export function isPathSpecifier(specifier: string) {
  return specifier === '.' || specifier === '..'
    || specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');
}

export function moduleScripts(html: string) {
  const found = [];
  for (const tag of html.matchAll(SCRIPT_TAG)) {
    const attributes = tag[1] ?? '';
    if (!MODULE_TYPE.test(attributes)) continue;
    const src = SRC_ATTR.exec(attributes)?.[1];
    if (src !== undefined && src !== '' && !OFF_SITE.test(src)) found.push(src);
  }
  return found;
}

export function importMapTargets(html: string) {
  const found = [];
  for (const map of html.matchAll(IMPORT_MAP)) {
    const parsed: unknown = JSON.parse(map[1] ?? '{}');
    const imports = (parsed as { imports?: unknown } | null)?.imports;
    if (typeof imports !== 'object' || imports === null) continue;
    for (const target of Object.values(imports)) {
      if (typeof target === 'string' && target !== '' && !OFF_SITE.test(target)) found.push(target);
    }
  }
  return found;
}

export function pageModules(html: string) {
  return [...new Set([...moduleScripts(html), ...importMapTargets(html)])];
}

export function importSpecifiers(js: string) {
  const found = new Set<string>();
  for (const pattern of [SIDE_EFFECT_IMPORT, FROM_IMPORT, DYNAMIC_IMPORT]) {
    for (const match of js.matchAll(pattern)) {
      const specifier = match[1] ?? '';
      if (isPathSpecifier(specifier)) found.add(specifier);
    }
  }
  return [...found];
}
