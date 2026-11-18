/* A compiled family sheet as a set of rules, one per part a selector names, keyed by the @scope it sits
 * in and the body it writes: two sheets that carry the same set paint every part alike, whichever
 * selector lists they group the parts into. A test helper, so it lives here and not beside a gate. */

const PAIR = /^:scope\[data-arena-part="([^"]+)"\], \[data-arena-part="\1"\]$/;

export function familyRules(css: string): Set<string> {
  const out = new Set<string>();
  let scope = '';
  for (const match of css.matchAll(/(@scope [^{]+)\{|([^{};]+)\{([^{}]*)\}|\}/g)) {
    if (match[1] !== undefined) { scope = match[1].trim(); continue; }
    if (match[2] === undefined) { scope = ''; continue; }
    const selectors = match[2].trim().split(/,\s*/);
    const body = (match[3] ?? '').split(';').map((one) => one.trim()).filter(Boolean).join('; ');
    const grouped: string[] = [];
    for (let at = 0; at < selectors.length; at += 1) {
      const pair = `${selectors[at]}, ${selectors[at + 1] ?? ''}`;
      if (PAIR.test(pair)) { grouped.push(pair); at += 1; } else grouped.push(selectors[at] ?? '');
    }
    for (const selector of grouped) out.add(`${scope} | ${selector} | ${body}`);
  }
  return out;
}
