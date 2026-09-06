/* The rules of the language, once, so the four surfaces that state them cannot disagree: the
 * router's list, the note at the foot of every component prompt, the Context7 index and the
 * repository page. Each rule says whether a gate holds it, by naming the audit tag the shipped
 * module emits, and a rule no gate holds says what holds it instead. That pairing is the claim
 * this file exists for: the router said no gate reads your application while arena-to-prod --audit
 * already did, and nothing failed, because the sentence and the check had no common source. The
 * short half of every rule is written to survive being quoted alone, since Context7 stores it
 * without the rest and a gate holds it to being a span of the router. */

export type LanguageRule = {
  id: string;
  short: string;
  body: string;
  held: string | null;
  unheld: string | null;
};

export const RULES: LanguageRule[] = [
  {
    id: 'tokens-only',
    short: 'Tokens are the only styling layer.',
    body: 'A raw colour is a bug, and so is a bare `16px`. A hex, a channel triple in `rgb()` or '
      + '`oklch()`, and a colour\'s own name are the same defect written three ways. Read a value '
      + 'through its custom property, as `var(--crimson)` or `var(--sp-4)`. Derive one with '
      + '`calc()` or `clamp()` over a token, or mix one with `color-mix()` over a token.',
    held: 'raw-value',
    unheld: null,
  },
  {
    id: 'own-class',
    short: 'Put no class of your own on an Arena component.',
    body: 'Write no rule targeting one either. A component renders `arena-<component>__<slot>` '
      + 'class names, so a rule of yours reaches one by specificity. The name reads like a surface '
      + 'somebody meant you to target and it is not one: it is compiler output, no contract names '
      + 'it, and a slot may be renamed in any release. Content you draw yourself is yours, styled '
      + 'through the same tokens.',
    held: 'own-class',
    unheld: null,
  },
  {
    id: 'danger-outline',
    short: 'Danger is outline, never filled.',
    body: 'The background stays transparent, and the border and the content read `--danger`. '
      + 'Arena draws one filled danger surface, and it is the final irreversible confirmation '
      + 'inside `ArenaConfirmDialog`. A surface of your own may carry the `--danger-soft` tint.',
    held: 'danger-fill',
    unheld: null,
  },
  {
    id: 'one-primary',
    short: 'One primary accent per view.',
    body: 'Crimson is the voice, so at most one `variant="primary"` action stands on a screen. '
      + 'Gold is distinction and focus, and never a second primary.',
    held: 'one-primary',
    unheld: null,
  },
  {
    id: 'no-gradients',
    short: 'No gradients, on any surface.',
    body: 'Depth comes from the `base-100` to `base-200` to `base-300` surface scale, the hairline '
      + 'border and the warm shadow. `ArenaSkeleton`\'s neutral shimmer is the one exception.',
    held: 'raw-value',
    unheld: null,
  },
  {
    id: 'no-emoji',
    short: 'No emoji, in product or in copy.',
    body: '',
    held: 'emoji',
    unheld: null,
  },
  {
    id: 'icons-are-strings',
    short: 'Icons are Phosphor class-name strings, never elements and never SVG.',
    body: 'Write `icon="ph-bold ph-plus"`. Install `@phosphor-icons/web`, because Arena never '
      + 'bundles it.',
    held: 'icon-element',
    unheld: null,
  },
  {
    id: 'router-link',
    short: 'Never wrap an Arena component in your router\'s own link.',
    body: 'That nests an anchor inside an anchor, and in Angular it does not bind at all. Pass the '
      + 'href to the component and route from the event it reports. The members that take one are '
      + '`ArenaCard.href`, `ArenaCommand.route`, `ArenaCrumb.href` and `ArenaSideNavItem.href`.',
    held: 'router-link',
    unheld: null,
  },
  {
    id: 'anchor-splits',
    short: 'An anchor Arena draws splits its activations.',
    body: 'A primary click with no modifier, and Enter, are cancelled and reported through the '
      + 'component\'s own event. Route from that handler, and nothing navigates twice. A modified '
      + 'click, a middle click and the context menu belong to the browser: they open the `href` '
      + 'themselves and report nothing.',
    held: null,
    unheld: 'what a click does is decided at run time, and a source text shows the handler rather '
      + 'than the navigation it causes',
  },
  {
    id: 'press-stays',
    short: 'A press that starts on a control keeps to that control.',
    body: 'Arena draws an activation target around content you write, such as a card or a table '
      + 'row. A click or an Enter that begins on a button, a link or a field inside that target '
      + 'runs the control and nothing else. A press anywhere else on the surface activates the '
      + 'surface. So a card or a row may hold controls of your own, and it may also hand the press '
      + 'over entirely by not being interactive at all.',
    held: null,
    unheld: 'which control a press lands on is decided at run time',
  },
  {
    id: 'two-themes',
    short: 'Two themes, dark first.',
    body: 'Dark is `:root` and light is the `.arena-light` class. A component is never rewritten '
      + 'per theme, because it reads tokens. `.arena-compact` re-densifies the controls and '
      + '`.arena-comfortable` grows them to a 48px touch target. The two classes are exclusive.',
    held: null,
    unheld: 'a theme is a class on a root element, and a source text shows the class rather than '
      + 'whether a component was rewritten under it',
  },
  {
    id: 'chart-identity',
    short: 'A chart carries identity or meaning, never both.',
    body: 'The `--color-cat-*` ramp in fixed order is identity. The status colours are meaning. A '
      + 'status colour is never a series colour.',
    held: null,
    unheld: 'a series is a value your code builds, so the colour it carries is not in the source '
      + 'text. Passing a slot and a tone together warns in development, and the tone wins',
  },
  {
    id: 'copy-is-english',
    short: 'Copy is English, formal and direct.',
    body: 'Use concrete action verbs and no boastful adjectives. An error is blame-free and says '
      + 'what to do next.',
    held: null,
    unheld: 'whether a sentence is direct, blame-free and says what to do next is a judgement no '
      + 'pattern makes',
  },
  {
    id: 'required-member',
    short: 'A required member absent is a caller bug.',
    body: 'It is not a state to render. Every layer fails hard rather than drawing something '
      + 'empty, so an absent member is loud on the first render.',
    held: null,
    unheld: 'your editor reports it from the package\'s own type declarations before anything '
      + 'runs, and the component fails hard on the first render',
  },
  {
    id: 'no-listener-render',
    short: 'No render follows from whether you bound a listener or filled a slot.',
    body: 'A member decides, always, because at least one platform cannot ask the question.',
    held: null,
    unheld: 'this binds the components Arena ships rather than the code you write',
  },
  {
    id: 'method-not-member',
    short: 'A few components answer with a method rather than a member.',
    body: 'No member is imperative. The component\'s own document names the methods where they '
      + 'exist.',
    held: null,
    unheld: 'this says what a component offers rather than something your code can break',
  },
];

export const heldRules = (rules = RULES) => rules.filter((rule) => rule.held !== null);

export const WRAP_AT = 98;

export function wrapped(text: string, indent = '  ', at = WRAP_AT) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const grown = line === '' ? word : `${line} ${word}`;
    if (grown.length > at && line !== '') { lines.push(line); line = indent + word; continue; }
    line = grown;
  }
  if (line !== '') lines.push(line);
  return lines.join('\n');
}

export const REPORTED_MARK = '**`--audit` reports this one.**';

export function renderBullet(rule: LanguageRule) {
  const said = [`- **${rule.short}**`, rule.body, rule.held === null ? '' : REPORTED_MARK];
  return wrapped(said.filter((part) => part !== '').join(' '));
}

export function renderList(rules = RULES) {
  return rules.map(renderBullet).join('\n');
}

export const SUMMARY_WRAP = 72;

export function renderShortList(rules = RULES, at = SUMMARY_WRAP) {
  return rules.map((rule) => wrapped(`- ${rule.short}`, '  ', at)).join('\n');
}

export function renderHeldSentence(rules = RULES) {
  return wrapped('Every rule below is a rule of the language and not a preference. **`arena-to-prod '
    + '--audit` reads your own sources and reports the ones marked below.** It reports rather than '
    + 'fails, so add `--strict=audit` where a finding should stop the run. Nothing reads your '
    + 'application for the unmarked ones, and those hold because you hold them. The full record, '
    + 'with the reason each unmarked rule is one a source text cannot show, is `arena://rules` on '
    + 'the MCP server.', '');
}
