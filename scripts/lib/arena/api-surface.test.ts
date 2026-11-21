import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, reactSurface, angularSurface, templateSlots, braceBody, UnrecognisedShape, PLATFORM_TYPES, reactImplementation, literalValue, defaultProblems, IMPERATIVE_HANDLES,
  angularImplementation, inputInitialValue,
} from './api-surface.ts';

const CLASSIFY: {
  name: string;
  reads?: [string, unknown][];
  forms?: [string, string][];
  refuses?: { annotation: string; matches?: RegExp[] }[];
}[] = [
  {
    name: 'the three primitives classify as primitives',
    reads: ['string', 'number', 'boolean'].map((t) => [t, { form: 'primitive', type: t }]),
  },
  {
    name: 'a closed literal union is an enum, and its values come out in order',
    reads: [["'sm' | 'md' | 'lg'", { form: 'enum', values: ['sm', 'md', 'lg'] }]],
  },
  {
    name: 'a node type is a slot',
    reads: [['React.ReactNode', { form: 'slot' }], ['ReactNode', { form: 'slot' }]],
  },
  {
    name: 'a function type is an event, and its single parameter is the payload',
    reads: [
      ['(crumb: ArenaCrumb) => void', { form: 'event', payload: 'ArenaCrumb' }],
      ['() => void', { form: 'event', payload: null }],
    ],
  },
  {
    name: 'an inbound function that RETURNS a value is the ninth form -- the refusal now holds only outside an input control',
    reads: [
      ['(value: number) => string', { form: 'functionInput', params: { value: 'number' }, returns: 'string' }],
      ['(isDark: boolean) => string', { form: 'functionInput', params: { isDark: 'boolean' }, returns: 'string' }],
      ['() => string', { form: 'functionInput', params: {}, returns: 'string' }],
    ],
  },
  {
    name: 'an array is one form discriminated by what it holds',
    reads: [
      ['ArenaCrumb[]', { form: 'array', of: 'ArenaCrumb' }],
      ['string[]', { form: 'array', of: 'string' }],
      ['Array<ArenaCrumb>', { form: 'array', of: 'ArenaCrumb' }],
    ],
  },
  {
    name: 'every platform type R4 names is recognised and reported, never thrown',
    forms: ['React.CSSProperties', 'React.Key', 'React.MouseEvent', 'DOMRect', 'React.HTMLInputTypeAttribute', 'Record<string, Widget>'].map((t) => [t, 'platform']),
  },
  {
    name: 'a union between forms is a union, not a coin-flip between them -- R5',
    forms: [['(string | TabItem)[]', 'union']],
  },
  {
    name: 'an unreadable annotation throws rather than reporting no member',
    refuses: [{ annotation: '{ [k: string]: unknown }' }, { annotation: '(a: string, b: string) => void' }],
  },
  {
    name: 'classify strips a leading readonly modifier before the array check -- Angular\'s input<readonly T[]>',
    reads: [['readonly ArenaActivityItem[]', { form: 'array', of: 'ArenaActivityItem' }]],
  },
  {
    name: 'classify reads Record<string, unknown> as consumer data rather than as a platform type',
    reads: [['Record<string, unknown>', { form: 'consumerData' }]],
  },
  {
    name: 'classify reads an array of consumer data, which is how a row list is spelled',
    reads: [
      ['Record<string, unknown>[]', { form: 'array', of: 'consumerData' }],
      ['Array<Record<string, unknown>>', { form: 'array', of: 'consumerData' }],
    ],
  },
  {
    name: 'classify still refuses a record of a known type rather than calling it consumer data',
    reads: [['Record<string, Widget>', { form: 'platform', type: 'Record<string, Widget>' }]],
    refuses: [{ annotation: 'ArenaTableColumn<T>', matches: [/unreadable type annotation/] }],
  },
  {
    name: 'an event payload may be consumer data in the React spelling',
    reads: [['(row: Record<string, unknown>) => void', { form: 'event', payload: 'consumerData' }]],
  },
  {
    name: 'a genuine second event parameter is still refused after the generic-comma fix',
    refuses: [
      { annotation: '(id: string, event: React.MouseEvent) => void', matches: [/more than one parameter/] },
      { annotation: '(a: string, b: string) => void', matches: [/more than one parameter/] },
    ],
  },
  {
    name: 'classify keeps a nullable return, so a layer returning null differs from a contract returning string',
    reads: [['(value: string) => string | null | undefined', { form: 'functionInput', params: { value: 'string' }, returns: 'string | null | undefined' }]],
  },
  {
    name: 'an arrow returning void or undefined is still an event',
    reads: [
      ['(crumb: ArenaCrumb) => void | undefined', { form: 'event', payload: 'ArenaCrumb' }],
      ['() => void | null', { form: 'event', payload: null }],
    ],
  },
  {
    name: 'classify surfaces a functionInput whose return is a platform type as platform, not as the ninth form',
    reads: [['(value: string) => React.MouseEvent', { form: 'platform', type: 'React.MouseEvent' }]],
  },
  {
    name: 'classify throws on a function returning a node -- that is a parameterised slot (R3), not a functionInput',
    refuses: [{ annotation: '(item: string) => React.ReactNode', matches: [/parameterised slot/i, /R3/, /renderItem|ngTemplateOutlet/] }],
  },
  {
    name: 'classify reads every parameter of a functionInput, and a generic\'s comma is not a separator',
    reads: [
      ['(value: string, other: number) => boolean', { form: 'functionInput', params: { value: 'string', other: 'number' }, returns: 'boolean' }],
      ['(row: Record<string, unknown>) => string', { form: 'functionInput', params: { row: 'consumerData' }, returns: 'string' }],
    ],
  },
  {
    name: 'a nullable arrow annotation reads as the arrow it wraps',
    reads: [
      ['((value: string) => string) | undefined', { form: 'functionInput', params: { value: 'string' }, returns: 'string' }],
      ['((v: string) => void) | null', { form: 'event', payload: 'string' }],
    ],
  },
  {
    name: 'stripping null/undefined does not collapse a genuine union',
    forms: [['string | TabItem', 'union'], ['string | TabItem | undefined', 'union']],
  },
  { name: 'a nullable primitive still reads as the primitive', reads: [['string | undefined', { form: 'primitive', type: 'string' }]] },
  {
    name: 'an inline enum with a nullable arm is still that enum, with every value it declares',
    reads: [["'sm' | 'md' | undefined", { form: 'enum', values: ['sm', 'md'] }]],
  },
  {
    name: 'a union of two parenthesised arms is not mistaken for one wrapped annotation',
    reads: [['(DOMRect) | (HTMLElement)', { form: 'union', parts: ['(DOMRect)', '(HTMLElement)'] }]],
  },
];

test('classify reads each annotation', () => {
  assert.ok(CLASSIFY.length > 0, 'the table has rows');
  for (const row of CLASSIFY) {
    for (const [annotation, expected] of row.reads ?? []) assert.deepEqual(classify(annotation), expected, `${row.name}: ${annotation}`);
    for (const [annotation, form] of row.forms ?? []) assert.equal(classify(annotation).form, form, `${row.name}: ${annotation}`);
    for (const { annotation, matches } of row.refuses ?? []) {
      assert.throws(() => classify(annotation), (err) => {
        assert.ok(err instanceof UnrecognisedShape, `${row.name}: ${annotation} throws UnrecognisedShape`);
        for (const m of matches ?? []) assert.match((err as Error).message, m, `${row.name}: ${annotation}`);
        return true;
      }, `${row.name}: ${annotation}`);
    }
  }
  assert.ok(PLATFORM_TYPES.includes('React.CSSProperties'));
});

test('braceBody returns the balanced interior, not the first closing brace it meets', () => {
  const src = 'x { a: { b: 1 }; c: 2 } y';
  assert.equal(braceBody(src, src.indexOf('{')).trim(), 'a: { b: 1 }; c: 2');
});

test('reactSurface reads every member of a props interface, with its optionality', () => {
  const src = `
    import * as React from 'react';
    /** doc */
    export interface ArenaAppLogoProps {
      /** Both halves at once. */
      size?: 'sm' | 'md';
      mark: React.ReactNode;
      name: string;
    }
    export function ArenaAppLogo(props: ArenaAppLogoProps): JSX.Element | null;
  `;
  const { heritage, members } = reactSurface(src, 'ArenaAppLogoProps');
  assert.deepEqual(heritage, []);
  assert.equal(members.length, 3);
  assert.deepEqual(members.map((m) => [m.name, m.form, m.required]), [
    ['size', 'enum', false], ['mark', 'slot', true], ['name', 'primitive', true],
  ]);
});

test('reactSurface surfaces heritage -- the {...rest} escape is a member surface too', () => {
  const src = `export interface XProps extends React.HTMLAttributes<HTMLSpanElement> { a: string; }`;
  assert.deepEqual(reactSurface(src, 'XProps').heritage, ['React.HTMLAttributes<HTMLSpanElement>']);
});

test('reactSurface splits heritage only at depth zero -- a generic\'s own comma is not a heritage separator', () => {
  const src = `export interface ArenaLineChartProps extends Omit<ArenaBarChartProps, 'slots'> { a: string; }`;
  assert.deepEqual(reactSurface(src, 'ArenaLineChartProps').heritage, ["Omit<ArenaBarChartProps, 'slots'>"]);
});

test('reactSurface throws when the interface it was asked for is not there', () => {
  assert.throws(() => reactSurface('export interface YProps { a: string; }', 'XProps'), UnrecognisedShape);
});

test('angularSurface reads input, input.required, output and a defaulted bare input', () => {
  const src = `
    @Component({ selector: 'arena-x', template: \`<span>{{ name() }}</span>\` })
    export class X {
      readonly name = input.required<string>();
      readonly dim = input<string>();
      readonly size = input<Size>('md');
      readonly separator = input('/');
      readonly navigate = output<ArenaCrumb>();
      protected readonly styles = computed(() => xStyles({ size: this.size() }));
    }
  `;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => [m.name, m.form, m.required]), [
    ['name', 'primitive', true],
    ['dim', 'primitive', false],
    ['size', 'named', false],
    ['separator', 'primitive', false],
    ['navigate', 'event', false],
  ]);
  assert.equal(members.find((m) => m.name === 'navigate')?.payload, 'ArenaCrumb');
});

test('angularSurface ignores protected and private members -- they are not the public API', () => {
  const src = `export class X { readonly a = input<string>(); protected readonly b = computed(() => 1); private c = 2; }`;
  assert.deepEqual(angularSurface(src, 'X').members.map((m) => m.name), ['a']);
});

test('angularSurface steps over a method body without mistaking its remains for a member', () => {
  const src = `
    export class X {
      readonly navigate = output<ArenaCrumb>();
      protected onClick(crumb: ArenaCrumb, event: MouseEvent): void {
        this.navigate.emit(crumb);
      }
    }
  `;
  assert.deepEqual(angularSurface(src, 'X').members.map((m) => m.name), ['navigate']);
});

test('angularSurface throws on a public member whose initialiser it cannot read', () => {
  const src = `export class X { readonly a = somethingElse<string>(); }`;
  assert.throws(() => angularSurface(src, 'X'), UnrecognisedShape);
});

test('angularSurface reads the input(default, {transform}) idiom, classifying from the first argument alone', () => {
  const src = `export class X { readonly dismissible = input(false, { transform: booleanAttribute }); }`;
  assert.deepEqual(angularSurface(src, 'X').members, [
    { name: 'dismissible', required: false, form: 'primitive', type: 'boolean' },
  ]);
});

test('a bare input() with no argument at all still throws -- no generic and no default is no declared type', () => {
  const src = `export class X { readonly a = input(); }`;
  assert.throws(() => angularSurface(src, 'X'), UnrecognisedShape);
});

test('a bare ng-content is the default slot, named content; an attribute selector names its own', () => {
  assert.deepEqual(templateSlots('<span><ng-content /></span>'),
    [{ name: 'content', form: 'slot', required: false }]);
  assert.deepEqual(templateSlots('<ng-content select="[mark]" /><ng-content select="[icon]"></ng-content>'),
    [{ name: 'mark', form: 'slot', required: false }, { name: 'icon', form: 'slot', required: false }]);
});

test('an ng-content selector that is not an attribute selector throws -- the binding table defines one form', () => {
  assert.throws(() => templateSlots('<ng-content select="img" />'), UnrecognisedShape);
});

test('reactSurface keeps a member whole across an internal ; inside its own annotation -- ArenaOnboarding.d.ts\'s anchorRect: DOMRect | { left: number; bottom: number }', () => {
  const src = `
    export interface XProps {
      open: boolean;
      anchorRect?: DOMRect | { left: number; bottom: number };
      extra: string;
    }
  `;
  const { members } = reactSurface(src, 'XProps');
  assert.equal(members.length, 3, 'the object literal\'s internal ; must not manufacture a fourth, bogus member');
  assert.deepEqual(members.map((m) => m.name), ['open', 'anchorRect', 'extra']);
  const anchorRect = members.find((m) => m.name === 'anchorRect');

  assert.deepEqual(anchorRect, {
    name: 'anchorRect', required: false, form: 'union',
    parts: ['DOMRect', '{ left: number; bottom: number }'],
  });
});

test('a bare inline object-type annotation classifies as platform, reported rather than thrown -- ArenaAlert.d.ts\'s action: { label: string; onClick: () => void }', () => {
  const src = `
    export interface XProps {
      title?: string;
      action?: { label: string; onClick: () => void };
      onClose?: () => void;
    }
  `;

  const { members } = reactSurface(src, 'XProps');
  assert.equal(members.length, 3);
  const action = members.find((m) => m.name === 'action');
  assert.deepEqual(action, {
    name: 'action', required: false, form: 'platform',
    type: '{ label: string; onClick: () => void }',
  });
});

test('a union between a platform type and an inline object-type literal stays a union at the top level -- ArenaOnboarding.d.ts\'s anchorRect: DOMRect | { left: number; bottom: number }', () => {

  const out = classify('DOMRect | { left: number; bottom: number }');
  assert.deepEqual(out, { form: 'union', parts: ['DOMRect', '{ left: number; bottom: number }'] });
});

test('angularSurface skips a protected computed with a multi-statement body -- its own internal ; must not split it', () => {
  const src = `
    export class X {
      readonly name = input<string>();
      protected readonly computedThing = computed(() => {
        const a = 1;
        return a;
      });
      readonly navigate = output<ArenaCrumb>();
    }
  `;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => m.name), ['name', 'navigate']);
});

test('angularSurface skips a constructor block, the same way protected and private members are -- a public member on either side still comes back', () => {
  const src = `
    export class X {
      readonly a = input<string>();
      constructor() {
        effect(() => {
          doSomething();
        });
      }
      readonly b = input<string>();
    }
  `;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => m.name), ['a', 'b']);
});

test('angularSurface does not cut a member at a template-literal interpolation\'s own } -- ArenaCommandPalette.ts\'s `arena-command-palette-${nextId++}` field', () => {
  const src = `
    export class X {
      readonly open = input(false, { transform: booleanAttribute });
      private readonly uid = \`arena-command-palette-\${nextId++}\`;
      readonly commands = input<ArenaCommand[]>([]);
    }
  `;
  const { members } = angularSurface(src, 'X');
  assert.equal(members.length, 2, 'the interpolation\'s own } must not manufacture a spurious member split');
  assert.deepEqual(members.map((m) => m.name), ['open', 'commands']);
});

test('angularSurface skips a zero-parameter constructor and still returns its neighbouring public members', () => {
  const src = `export class X { readonly a = input<string>(); constructor() {} readonly b = input<string>(); }`;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => m.name), ['a', 'b']);
});

test('angularSurface throws on a constructor parameter property -- it declares a genuinely public member the reader does not read', () => {
  const src = `export class X { readonly a = input<string>(); constructor(public readonly foo: string) {} }`;
  assert.throws(() => angularSurface(src, 'X'), (err) => {
    assert.ok(err instanceof UnrecognisedShape);
    assert.match(err.message, /parameter-propert/i);
    return true;
  });
});

test('angularSurface throws on a constructor parameter property hidden behind a function-typed parameter -- the first ) is the arrow type\'s, not the constructor\'s', () => {
  const src = `
    export class X {
      readonly a = input<string>();
      constructor(cb: (x: number) => void, private y: string) {}
      readonly b = input<string>();
    }
  `;
  assert.throws(() => angularSurface(src, 'X'), (err) => {
    assert.ok(err instanceof UnrecognisedShape);
    assert.match(err.message, /parameter-propert/i);
    return true;
  });
});

test('angularSurface does not mistake a default value\'s bare "readonly" identifier for a parameter-property modifier', () => {
  const src = `
    export class X {
      readonly a = input<string>();
      constructor(x = { readonly: true }) {}
      readonly b = input<string>();
    }
  `;
  const { members } = angularSurface(src, 'X');
  assert.equal(members.length, 2);
  assert.deepEqual(members.map((m) => m.name), ['a', 'b']);
});

test('angularSurface reports template slots alongside declared members', () => {
  const src = `
    @Component({ template: \`<span><ng-content select="[mark]" /></span>\` })
    export class X { readonly name = input.required<string>(); }
  `;
  assert.deepEqual(angularSurface(src, 'X').members.map((m) => [m.name, m.form]),
    [['name', 'primitive'], ['mark', 'slot']]);
});

test('a class doc comment mentioning <ng-content select="[icon]" /> in prose reports no slot when the real template has none', () => {
  const src = `
    /** This component projects a glyph (\`<ng-content select="[icon]" />\`) beside the label. */
    @Component({ template: \`<span [class]="styles().label()">{{ label() }}</span>\` })
    export class X { readonly label = input.required<string>(); }
  `;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => m.name), ['label'], 'the doc comment must not manufacture an icon slot');
});

test('the same class with the real template projecting [icon] reports exactly one icon slot', () => {
  const src = `
    /** This component projects a glyph (\`<ng-content select="[icon]" />\`) beside the label. */
    @Component({ template: \`<span aria-hidden="true"><ng-content select="[icon]" /></span><span [class]="styles().label()">{{ label() }}</span>\` })
    export class X { readonly label = input.required<string>(); }
  `;
  const { members } = angularSurface(src, 'X');
  assert.deepEqual(members.map((m) => [m.name, m.form]), [['label', 'primitive'], ['icon', 'slot']]);
});

test('a required input with a transform reads its FIRST generic, which is the member type', () => {
  const { members } = angularSurface(
    'export class X {\n  readonly open = input.required<boolean, unknown>({ transform: booleanAttribute });\n}',
    'X',
  );
  assert.deepEqual(members, [{ name: 'open', required: true, form: 'primitive', type: 'boolean' }]);
});

test('a required input with a transform and NO generics declares no type and is refused', () => {
  assert.throws(
    () => angularSurface(
      'export class X {\n  readonly open = input.required({ transform: booleanAttribute });\n}',
      'X',
    ),
    /UnrecognisedShape|unreadable/,
  );
});

test('a required input with THREE generics is unreadable, not silently narrowed to the first', () => {
  assert.throws(
    () => angularSurface(
      'export class X {\n  readonly open = input.required<boolean, unknown, string>({ transform: booleanAttribute });\n}',
      'X',
    ),
    UnrecognisedShape,
  );
});

test('a class with no template literal at all (templateUrl, or no @Component) has no slots, and does not throw', () => {
  const withDecoratorNoTemplate = `
    @Component({ templateUrl: './x.html' })
    export class X { readonly label = input.required<string>(); }
  `;
  assert.deepEqual(angularSurface(withDecoratorNoTemplate, 'X').members.map((m) => m.name), ['label']);

  const withNoDecoratorAtAll = `export class X { readonly label = input.required<string>(); }`;
  assert.deepEqual(angularSurface(withNoDecoratorAtAll, 'X').members.map((m) => m.name), ['label']);
});

test('an event payload may be consumer data in the Angular spelling', () => {
  const { members } = angularSurface(
    'export class X {\n  readonly select = output<Record<string, unknown>>();\n}',
    'X',
  );
  assert.deepEqual(members, [{ name: 'select', form: 'event', required: false, payload: 'consumerData' }]);
});

test('reactImplementation reads a plain exported component and its destructuring defaults', () => {
  const src = "export function ArenaTag({ children, tone = 'neutral', removable = false, onRemove }) {\n  return null;\n}\n";
  const impl = reactImplementation(src, 'ArenaTag');
  assert.equal(impl.destructures, true);
  assert.equal(impl.rest, null);
  assert.equal(impl.defaults.get('tone'), "'neutral'");
  assert.equal(impl.defaults.get('removable'), 'false');
  assert.equal(impl.defaults.get('onRemove'), null);
});

test('reactImplementation reaches a forwardRef component, which is not an "export function"', () => {
  const src = "export const Chip = React.forwardRef(function Chip({ id, cols = 1 }, ref) {\n  return null;\n});\n";
  const impl = reactImplementation(src, 'Chip');
  assert.equal(impl.defaults.get('cols'), '1');
});

test('reactImplementation reports a surviving rest spread, which is the escape the .d.ts cannot show', () => {
  const src = 'export function ArenaCard({ children, ...rest }) { return null; }\n';
  assert.equal(reactImplementation(src, 'ArenaCard').rest, 'rest');
});

test('a component taking no object pattern is readable and simply has nothing to compare', () => {
  const impl = reactImplementation('export function Rotor(props) { return null; }\n', 'Rotor');
  assert.equal(impl.destructures, false);
  assert.equal(impl.defaults.size, 0);
});

test('literalValue reads the literals a default can be, and refuses an expression', () => {
  assert.equal(literalValue("'md'"), 'md');
  assert.equal(literalValue('true'), true);
  assert.equal(literalValue('3'), 3);
  assert.equal(literalValue(''), undefined);
  assert.equal(literalValue('calc(var(--sp-1) * 120)'), undefined);
  assert.equal(literalValue(null), undefined);
});

test('a default the contract and the implementation both state must match', () => {
  assert.deepEqual(defaultProblems('react/ArenaSkeleton', 'lines', 3, '3'), []);
  assert.match(defaultProblems('react/ArenaSkeleton', 'lines', 3, '4')[0] ?? '', /declares default 3, the implementation uses 4/);
});

test('an implementation default the contract does not name is undocumented API', () => {
  const problems = defaultProblems('react/ArenaDialog', 'fillBelow', undefined, "'md'");
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /defaults to "md" and the contract declares no default/);
});

test('a contract default with no destructuring default is NOT reported, because the default may be applied downstream', () => {
  assert.deepEqual(defaultProblems('react/ArenaBarChart', 'slot', 1, null), []);
});

test('a non-literal default is not compared, because the gate reads source and does not evaluate it', () => {
  assert.deepEqual(defaultProblems('react/ArenaDialog', 'fillBelow', 'calc(var(--sp-1) * 120)', 'calc(var(--sp-1) * 120)'), []);
});

test('IMPERATIVE_HANDLES names each allowed method by literal value, with a reason', () => {
  assert.deepEqual([...IMPERATIVE_HANDLES.keys()].sort(),
    ['ArenaFileInput.clear', 'ArenaFileInput.files', 'ArenaInput.focus', 'ArenaInput.select', 'ArenaNumberField.focus',
      'ArenaNumberField.select', 'ArenaPinInput.focus'],
    'a public method on a component class is an undeclared surface unless it is one of these, '
    + 'and widening the set is a decision rather than an oversight');
  for (const [name, reason] of IMPERATIVE_HANDLES) {
    assert.ok(reason.length > 60, `${name} carries no real reason`);
  }
});

test('an allowed handle is skipped, and any other public method still fails', () => {
  const allowed = 'export class ArenaInput {\n  readonly a = input<string>();\n  focus(): void { this.x(); }\n}';
  assert.deepEqual(angularSurface(allowed, 'ArenaInput').members.map((m) => m.name), ['a']);

  const stray = 'export class ArenaInput {\n  readonly a = input<string>();\n  reset(): void { this.x(); }\n}';
  assert.throws(() => angularSurface(stray, 'ArenaInput'), UnrecognisedShape);

  const wrongClass = 'export class ArenaSelect {\n  readonly a = input<string>();\n  focus(): void { this.x(); }\n}';
  assert.throws(() => angularSurface(wrongClass, 'ArenaSelect'), UnrecognisedShape,
    'the allowance is keyed by component and method, so it does not leak to a sibling');
});

test('an input\'s initial value is read whichever of the three shapes declares it', () => {
  assert.equal(inputInitialValue("input<G, G | undefined>('md', { transform: (v) => v ?? 'md' })"), "'md'");
  assert.equal(inputInitialValue('input(0)'), '0');
  assert.equal(inputInitialValue('input<string | undefined>(undefined)'), 'undefined');
  assert.equal(inputInitialValue('input(ARENA_CHART_HEIGHT)'), 'ARENA_CHART_HEIGHT');
});

test('a member with no initial value to read answers nothing rather than an empty string', () => {
  assert.equal(inputInitialValue('input.required<string>()'), null);
  assert.equal(inputInitialValue('input<string>()'), null);
  assert.equal(inputInitialValue('output<void>()'), null);
  assert.equal(inputInitialValue('model<string>(\'a\')'), null);
  assert.equal(inputInitialValue('signal(3)'), null);
});

test('angularImplementation answers the defaults a class declares and skips what has none', () => {
  const source = "export class X {\n"
    + "  readonly gap = input<G, G | undefined>('md', { transform: (v) => v ?? 'md' });\n"
    + '  readonly lines = input(3);\n'
    + '  readonly label = input.required<string>();\n'
    + '  readonly picked = output<string>();\n'
    + '}';
  const { defaults } = angularImplementation(source, 'X');
  assert.deepEqual([...defaults], [['gap', "'md'"], ['lines', '3']]);
});

test('a quoted member is read by its name, with its doc', () => {
  const src = "export interface XProps {\n  /** Shown. */\n  label?: string;\n  /** Written by a composer. */\n  'aria-expanded'?: boolean;\n}";
  const { members, docs } = reactSurface(src, 'XProps');
  assert.deepEqual(members.map((m) => m.name), ['label', 'aria-expanded']);
  assert.equal(docs.get('aria-expanded'), 'Written by a composer.');
  assert.equal(docs.get('label'), 'Shown.');
});

test('a quoted destructuring entry is read by its key', () => {
  const impl = reactImplementation("function X({ label, 'aria-expanded': ariaExpanded }: XProps) { return null; }", 'X');
  assert.ok(impl.defaults.has('aria-expanded'));
});
