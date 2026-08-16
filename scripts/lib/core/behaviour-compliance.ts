/* Decides whether one element meets one requirement key. Three return values, and
 * `null` is the point: no single element can decide it, so a suite must assert it by
 * acting on the tree. A key in neither DECIDABLE nor BEHAVIOURAL throws.
 * DOM-generic on purpose: consumed from three runtimes, one with no DOM, which is what
 * GenericElement states: four members and never an HTMLElement. */

export type GenericElement = {
  tagName: string;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  textContent?: string | null;
};

type IdResolver = (id: string) => GenericElement | null;
type ResolveId = IdResolver | null;
type ResolveLabel = (el: GenericElement) => GenericElement | null;

export const IMPLICIT_ROLE: Record<string, string> = {
  A: 'link',
  ARTICLE: 'article',
  ASIDE: 'complementary',
  BUTTON: 'button',
  DIALOG: 'dialog',
  FIELDSET: 'group',
  FIGURE: 'figure',
  FOOTER: 'contentinfo',
  H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
  HEADER: 'banner',
  IMG: 'img',
  LI: 'listitem',
  MAIN: 'main',
  NAV: 'navigation',
  OL: 'list',
  OUTPUT: 'status',
  PROGRESS: 'progressbar',
  SELECT: 'combobox',
  TABLE: 'table',
  TBODY: 'rowgroup',
  TD: 'cell',
  TEXTAREA: 'textbox',
  TH: 'columnheader',
  TR: 'row',
  UL: 'list',
};

const INPUT_ROLE: Record<string, string> = {
  button: 'button', submit: 'button', reset: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  search: 'searchbox',
};

const NATIVELY_FOCUSABLE = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);

export const ELEMENT_ROLE: Record<string, string> = {
  alert: 'alert',
  alertdialog: 'alertdialog',
  button: 'button',
  checkbox: 'checkbox',
  combobox: 'combobox',
  banner: 'banner',
  contentinfo: 'contentinfo',
  'dialog-modal': 'dialog',
  disclosure: 'button',
  listbox: 'listbox',
  'menu-button': 'button',
  navigation: 'navigation',
  progressbar: 'progressbar',
  'scrollable-region': 'group',
  select: 'combobox',
  status: 'status',
  switch: 'switch',
  textbox: 'textbox',
  toolbar: 'toolbar',
  tooltip: 'tooltip',
};

export const LABEL_ACCEPTS_TEXT = new Set(['button', 'checkbox', 'disclosure', 'switch']);

export function roleOf(el: GenericElement, resolveId?: IdResolver) {
  const explicit = el.getAttribute('role');
  if (explicit) return explicit.trim().split(/\s+/)[0];
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return INPUT_ROLE[type] ?? 'textbox';
  }

  if (tag === 'SECTION') return hasAccessibleName(el, false, resolveId) ? 'region' : null;
  return IMPLICIT_ROLE[tag] ?? null;
}

const LABELABLE = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function namedByLabelElement(el: GenericElement, resolveLabel?: ResolveLabel) {
  if (!LABELABLE.has(el.tagName.toUpperCase())) return false;
  if (typeof resolveLabel !== 'function') {
    throw new Error(
      'hasAccessibleName: this is a labelable form control, so a <label> may be its name -- ' +
      'either one whose `for` points at it or one WRAPPING it -- and no resolveLabel was ' +
      'supplied to decide. Pass one to comparePattern; each wrapper builds one scoped to the ' +
      'rendered tree, because neither route is reachable from the four DOM operations this ' +
      'evaluator is allowed. Returning false instead would report every correctly labelled ' +
      'native control as unnamed, which is the commonest way a control is named at all.',
    );
  }
  const label = resolveLabel(el);
  return label !== null && (label.textContent ?? '').trim() !== '';
}

export function hasAccessibleName(
  el: GenericElement, acceptsText = false, resolveId?: IdResolver, resolveLabel?: ResolveLabel,
) {
  if (el.getAttribute('aria-label')) return true;
  if (acceptsText && (el.textContent ?? '').trim()) return true;
  const raw = el.getAttribute('aria-labelledby');
  if (!raw) return namedByLabelElement(el, resolveLabel);
  if (typeof resolveId !== 'function') {
    throw new Error(
      'hasAccessibleName: this element is named only by aria-labelledby and no resolveId was ' +
      'supplied, so whether it has a name cannot be decided. Pass resolveId to comparePattern -- ' +
      'each wrapper builds one scoped to the rendered tree. Counting the attribute instead would ' +
      'report a dangling reference as a name, and a dialog whose title carried no id would read ' +
      'as fully compliant while having no accessible name at all.',
    );
  }
  return referenceResolves('aria-labelledby', raw, resolveId);
}

export function isFocusable(el: GenericElement) {
  if (el.hasAttribute('disabled')) return false;
  const ti = el.getAttribute('tabindex');
  if (ti !== null) return Number(ti) >= 0;
  return NATIVELY_FOCUSABLE.has(el.tagName.toUpperCase());
}

export const ATTRIBUTE_FOR: Record<string, string> = {
  'roles.aria-modal': 'aria-modal',
  'roles.haspopup': 'aria-haspopup',
  'roles.expanded': 'aria-expanded',
  'roles.controls': 'aria-controls',
  'roles.activedescendant': 'aria-activedescendant',
  'roles.describedby': 'aria-describedby',
  'states.selected': 'aria-selected',
};

export const IDREF_ATTRIBUTES = new Map([
  ['aria-labelledby', {
    match: 'every',
    reason: "the attribute concatenates the text of every element it names into ONE accessible name, so an id resolving to nothing truncates that name in silence rather than removing it.",
  }],
  ['aria-controls', {
    match: 'every',
    reason: "every aria-controls in either layer is a single id Arena generates itself, so nothing legitimately points outside the rendered tree and a looser rule protects nobody.",
  }],
  ['aria-activedescendant', {
    match: 'every',
    reason: "a single IDREF by specification rather than a list, so every and some agree -- every is the honest spelling of a rule with one id to judge.",
  }],
  ['aria-describedby', {
    match: 'some',
    reason: "the one exception: ArenaTooltip merges the consumer's own description with Arena's bubble id, and the consumer's may name an element outside the component's rendered tree, so demanding that every id resolve would fail a correct component.",
  }],
]);

function referenceResolves(attr: string, raw: string, resolveId: IdResolver) {
  const ids = raw.split(/\s+/).filter(Boolean);

  if (!ids.length) return false;
  return IDREF_ATTRIBUTES.get(attr)?.match === 'every'
    ? ids.every((id) => resolveId(id) != null)
    : ids.some((id) => resolveId(id) != null);
}

export const IDREF = new Set(
  Object.entries(ATTRIBUTE_FOR)
    .filter(([, attr]) => IDREF_ATTRIBUTES.has(attr))
    .map(([key]) => key),
);

const ROLE_NAMED_BY_KEY: Record<string, string | string[]> = {
  'roles.grid': 'grid',
  'roles.row': 'row',
  'roles.cell': ['gridcell', 'cell', 'columnheader', 'rowheader'],
  'roles.feed': 'feed',
  'roles.article': 'article',
  'roles.tablist': 'tablist',
  'roles.tab': 'tab',
  'roles.tabpanel': 'tabpanel',
  'roles.option': 'option',
  'roles.group': ['group', 'radiogroup'],
  'roles.item': ['radio', 'menuitem', 'option'],
  'roles.graphic': 'img',
};

export const DECIDABLE = new Set([
  'roles.element',
  'roles.label',
  ...Object.keys(ATTRIBUTE_FOR),
  ...Object.keys(ROLE_NAMED_BY_KEY),
  'states.checked',
  'states.multiline',
  'live.politeness',
]);

export const BEHAVIOURAL = new Set([

  'focus.unaffected', 'focus.onOpen', 'focus.onClose', 'focus.trap', 'focus.roving', 'focus.never',
  'focus.stop',

  'keyboard.Space', 'keyboard.Enter', 'keyboard.Escape',
  'keyboard.ArrowKeys', 'keyboard.ArrowUp', 'keyboard.ArrowDown',
  'keyboard.ArrowLeft', 'keyboard.ArrowRight',
  'keyboard.Home', 'keyboard.End',
  'keyboard.PageUp', 'keyboard.PageDown',
  'keyboard.ControlEnd', 'keyboard.ControlHome',
  'keyboard.TypeAhead',

  'content.noAutoDismiss',
  'alternative.table', 'alternative.jsonLd',

  'states.disabled', 'states.required', 'states.readonly',
  'states.multiselectable', 'states.busy', 'states.posinset',
  'states.valuenow', 'states.valuemin', 'states.valuemax',
]);

export function evaluate(
  el: GenericElement, key: string, value: unknown, patternName: string,
  given?: ResolveId, resolveLabel?: ResolveLabel,
) {
  const resolveId = given ?? undefined;
  if (key === 'roles.element') {
    const wanted = ELEMENT_ROLE[patternName];
    if (!wanted) {
      throw new Error(
        `evaluate: pattern "${patternName}" requires roles.element but has no ELEMENT_ROLE entry. ` +
        'Add one in scripts/lib/behaviour-compliance.ts naming the role that pattern requires.',
      );
    }
    return roleOf(el, resolveId) === wanted;
  }
  if (key === 'roles.label') {
    return hasAccessibleName(el, LABEL_ACCEPTS_TEXT.has(patternName), resolveId, resolveLabel);
  }

  const attr = ATTRIBUTE_FOR[key];
  if (attr) {
    const raw = el.getAttribute(attr);
    if (raw === null) return false;
    if (!IDREF.has(key)) return true;
    if (typeof resolveId !== 'function') {
      throw new Error(
        `evaluate: requirement "${key}" carries an IDREF and no resolveId was supplied. ` +
        'Pass resolveId to comparePattern -- each wrapper builds one scoped to the rendered ' +
        'tree. Falling back to a presence check would report a dangling reference as met, ' +
        'which is the defect this parameter exists to catch.',
      );
    }
    return referenceResolves(attr, raw, resolveId);
  }

  const wanted = ROLE_NAMED_BY_KEY[key];
  if (wanted) {
    const actual = roleOf(el, resolveId);
    return Array.isArray(wanted) ? actual != null && wanted.includes(actual) : actual === wanted;
  }

  if (key === 'states.checked') {

    if (el.getAttribute('aria-checked') !== null) return true;
    const role = roleOf(el, resolveId);
    return el.tagName.toUpperCase() === 'INPUT' && (role === 'checkbox' || role === 'radio');
  }
  if (key === 'states.multiline') {
    if (el.getAttribute('aria-multiline') !== null) return true;
    const tag = el.tagName.toUpperCase();
    if (tag === 'TEXTAREA') return true;
    if (tag !== 'INPUT') return false;
    const role = roleOf(el, resolveId);
    return role === 'textbox' || role === 'searchbox';
  }
  if (key === 'live.politeness') {

    if (el.getAttribute('aria-live') !== null) return true;
    const role = roleOf(el, resolveId);
    return role != null && ['status', 'alert', 'log'].includes(role);
  }

  if (BEHAVIOURAL.has(key)) return null;

  throw new Error(
    `evaluate: unrecognised requirement key "${key}". ` +
    'Every key must be in DECIDABLE or BEHAVIOURAL in scripts/lib/behaviour-compliance.ts. ' +
    'If this came from a pattern file, check it for a typo — an unknown key used to return ' +
    'null, which a suite could silence forever by declaring it behavioural.',
  );
}

export const QUANTIFIED = new Map([
  ['feed:roles.article',
    'one article per unit of content, so a feed whose third row lost its role is unmet however correct the first row is. Decidable per element through ROLE_NAMED_BY_KEY, and quantified over elements the component renders itself -- which is what separates it from the two entries in NOT_QUANTIFIED below.'],
  ['listbox:states.selected',
    'aria-selected is true on each selected option and false on the rest, so one option cannot answer for the list.'],
  ['radiogroup:states.checked',
    'true on the checked button and false on the rest -- verbatim the idiom that quantifies tabs:states.selected, one requirement key over.'],
  ['tabs:roles.controls',
    'each tab references its own tabpanel; checking only the selected one is exactly the defect 8C6 shipped.'],
  ['tabs:states.selected',
    'true on the active tab and false on the rest -- the same quantification listbox states, written as "the rest".'],
]);

export const NOT_QUANTIFIED = new Map([
  ['feed:states.posinset',
    'BEHAVIOURAL rather than decidable: its prose carries a "when" (-1 for setsize when the total is unknown), so a snapshot of one element cannot answer it and evaluate() returns null. There is no per-element verdict to quantify over.'],
  ['navigation:roles.label',
    'quantifies over navigation landmarks on a PAGE, and only when more than one exists. A component suite renders one component; requiring a collection would force fixtures to render two landmarks to satisfy a rule that is not a claim about the component.'],
]);

export function comparePattern({
  pattern, binding, subjects = {}, fallback = null, behavioural = {}, resolveId, resolveLabel,
}: {
  pattern: any;
  binding: any;
  subjects?: Record<string, any>;
  fallback?: any;
  behavioural?: Record<string, any>;
  resolveId?: (id: string) => any;
  resolveLabel?: (el: any) => any;
}) {
  const excepted = new Map((binding.exceptions ?? []).map(
    (e: { requirement: string; reason: string }) => [e.requirement, e.reason]));
  const declared = new Map(Object.entries(behavioural));
  const used = new Set();
  const problems = [];

  let missedSubject = false;

  for (const [key, value] of Object.entries(pattern.requires)) {
    const subject = key in subjects ? subjects[key] : fallback;
    const quantified = QUANTIFIED.has(`${pattern.name}:${key}`);
    if (quantified && !Array.isArray(subject)) {

      const got = subject == null
        ? 'its subject is null -- a selector matched nothing, or none was passed'
        : 'its subject is a single element';
      throw new Error(
        `comparePattern: "${key}" of pattern "${pattern.name}" is quantified over every matching ` +
        `element, but ${got}. Pass an array -- checking one is the ` +
        `defect this rule exists to catch.\n      reason on file: ${QUANTIFIED.get(`${pattern.name}:${key}`)}`,
      );
    }
    const els = Array.isArray(subject) ? subject : (subject ? [subject] : []);
    if (!els.length) {
      missedSubject = true;
      problems.push(`${key}: no subject element — nothing was rendered, or the selector matched nothing.`);
      continue;
    }
    const verdicts = els.map((one) => evaluate(one, key, value, pattern.name, resolveId, resolveLabel));

    const domVerdict = verdicts.includes(null) ? null : verdicts.every(Boolean);

    let verdict = domVerdict;
    let source = 'the rendered DOM';
    if (domVerdict === null) {
      if (!declared.has(key)) {
        problems.push(
          `${key}: undecidable from the DOM and not declared behavioural. ` +
          'Assert it by acting on the tree and record the verdict in `behavioural`, ' +
          'or explain why it cannot be asserted at all.',
        );
        continue;
      }
      used.add(key);
      verdict = declared.get(key) === true;
      source = 'your behavioural test';
    }

    const hasException = excepted.has(key);
    if (verdict && hasException) {
      problems.push(
        `${key}: STALE EXCEPTION — met according to ${source}, but the binding still excepts it.\n` +
        `      reason on file: ${excepted.get(key)}\n` +
        '      Delete the exception, or name a subject if the exception is about a different element.',
      );
    } else if (!verdict && !hasException) {
      const scale = els.length > 1 ? ` (${verdicts.filter((v) => v === false).length} of ${els.length} failed)` : '';
      problems.push(
        `${key}: OVERCLAIM${scale} — the binding declares no exception, but ${source} does not meet it.\n` +
        `      pattern requires: ${JSON.stringify(value)}`,
      );
    }
  }

  for (const key of declared.keys()) {
    if (used.has(key)) continue;
    problems.push(missedSubject
      ? `${key}: declared behavioural but never reached, because a subject element above was ` +
        'missing and its requirement was skipped. Fix the missing subject first — this ' +
        'declaration may well be correct.'
      : `${key}: declared behavioural but never reached. ` +
        'Either the pattern no longer requires it, or it is now decidable from the DOM — ' +
        'remove it from `behavioural`.');
  }
  return problems;
}
