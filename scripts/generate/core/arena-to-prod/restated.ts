/* A plugin declaration that restates what the part's slot already paints. The audit counts a part
 * as painted by reading selector text, which is right for a rule about a language and wrong for a
 * count a promotion argument stands on: a plugin can raise it without changing a pixel. This reads
 * the shipped sheet behind the part and compares property against property. A part maps to its
 * class by arithmetic on the hook, so no manifest is needed, and the callback keys on the part so
 * the CLI can look inside the package while a gate looks through the manifests. Where the sheet
 * carries no such rule it reports nothing, since a silent miss costs a reader nothing and a false
 * report costs them a search. A selector carrying a state is skipped: the slot's rule is its
 * resting one, and calling a pressed rule a restatement of it would refuse a real gesture. */

const PART_RULE = /\[data-arena-part\s*=\s*"([^"]+)"\]([^{]*)\{([^}]*)\}/g;

const DECLARATION = /([-a-z]+)\s*:\s*([^;]+)/g;

export function classFor(part: string) {
  const [base, slot] = part.split('.');
  return `arena-${base}__${slot ?? 'root'}`;
}

export function sheetFor(part: string) {
  return `arena-${part.split('.')[0]}.css`;
}

export function declarations(body: string) {
  const out = new Map<string, string>();
  for (const one of body.matchAll(DECLARATION))
    out.set((one[1] ?? '').trim(), (one[2] ?? '').trim().replace(/\s+/g, ' '));
  return out;
}

export function declarationsFor(css: string, className: string) {
  const rule = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(css);
  return rule ? declarations(rule[1] ?? '') : new Map<string, string>();
}

export function pluginRules(css: string) {
  const out: { part: string; declarations: Map<string, string> }[] = [];
  for (const one of css.matchAll(PART_RULE)) {
    if ((one[2] ?? '').trim()) continue;
    out.push({ part: one[1] ?? '', declarations: declarations(one[3] ?? '') });
  }
  return out;
}

export function restatedFindings(pluginCss: string, sheetOf: (part: string) => string | null) {
  const found: { part: string; property: string; value: string }[] = [];
  for (const { part, declarations: made } of pluginRules(pluginCss)) {
    const sheet = sheetOf(part);
    if (!sheet) continue;
    const painted = declarationsFor(sheet, classFor(part));
    for (const [property, value] of made)
      if (painted.get(property) === value) found.push({ part, property, value });
  }
  return found;
}
