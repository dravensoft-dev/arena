import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, reactSurface, angularSurface, templateSlots, braceBody, UnrecognisedShape, PLATFORM_TYPES, reactImplementation, literalValue, defaultProblems, IMPERATIVE_HANDLES,
  angularImplementation, inputInitialValue,
} from './api-surface.ts';

test('the three primitives classify as primitives', () => {
  for (const t of ['string', 'number', 'boolean']) {
    assert.deepEqual(classify(t), { form: 'primitive', type: t });
  }
});

test('a closed literal union is an enum, and its values come out in order', () => {
  assert.deepEqual(classify("'sm' | 'md' | 'lg'"), { form: 'enum', values: ['sm', 'md', 'lg'] });
});

test('a node type is a slot', () => {
  assert.deepEqual(classify('React.ReactNode'), { form: 'slot' });
  assert.deepEqual(classify('ReactNode'), { form: 'slot' });
});

test('a function type is an event, and its single parameter is the payload', () => {
  assert.deepEqual(classify('(crumb: ArenaCrumb) => void'), { form: 'event', payload: 'ArenaCrumb' });
  assert.deepEqual(classify('() => void'), { form: 'event', payload: null });
});

test('an inbound function that RETURNS a value is the ninth form -- the refusal now holds only outside an input control', () => {

  assert.deepEqual(classify('(value: number) => string'),
    { form: 'functionInput', params: { value: 'number' }, returns: 'string' });
  assert.deepEqual(classify('(isDark: boolean) => string'),
    { form: 'functionInput', params: { isDark: 'boolean' }, returns: 'string' });

  assert.deepEqual(classify('() => string'),
    { form: 'functionInput', params: {}, returns: 'string' });
});

test('an event still reads as an event -- the rule is the return type, not the arrow', () => {
  assert.deepEqual(classify('(crumb: ArenaCrumb) => void'), { form: 'event', payload: 'ArenaCrumb' });
  assert.deepEqual(classify('() => void'), { form: 'event', payload: null });
});

test('an array is one form discriminated by what it holds', () => {
  assert.deepEqual(classify('ArenaCrumb[]'), { form: 'array', of: 'ArenaCrumb' });
  assert.deepEqual(classify('string[]'), { form: 'array', of: 'string' });
  assert.deepEqual(classify('Array<ArenaCrumb>'), { form: 'array', of: 'ArenaCrumb' });
});

test('every platform type R4 names is recognised and reported, never thrown', () => {
  for (const t of ['React.CSSProperties', 'React.Key', 'React.MouseEvent', 'DOMRect',
    'React.HTMLInputTypeAttribute', 'Record<string, Widget>']) {
    assert.equal(classify(t).form, 'platform', t);
  }
  assert.ok(PLATFORM_TYPES.includes('React.CSSProperties'));
});

test('a union between forms is a union, not a coin-flip between them -- R5', () => {
  const out = classify('(string | TabItem)[]');
  assert.equal(out.form, 'union');
});

test('an unreadable annotation throws rather than reporting no member', () => {
  assert.throws(() => classify('{ [k: string]: unknown }'), UnrecognisedShape);
  assert.throws(() => classify('(a: string, b: string) => void'), UnrecognisedShape);
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

test('classify strips a leading readonly modifier before the array check -- Angular\'s input<readonly T[]>', () => {
  assert.deepEqual(classify('readonly ArenaActivityItem[]'), { form: 'array', of: 'ArenaActivityItem' });
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

test('classify reads Record<string, unknown> as consumer data rather than as a platform type', () => {
  assert.deepEqual(classify('Record<string, unknown>'), { form: 'consumerData' });
});

test('classify reads an array of consumer data, which is how a row list is spelled', () => {
  assert.deepEqual(classify('Record<string, unknown>[]'), { form: 'array', of: 'consumerData' });
  assert.deepEqual(classify('Array<Record<string, unknown>>'), { form: 'array', of: 'consumerData' });
});

test('classify still refuses a record of a known type rather than calling it consumer data', () => {
  assert.deepEqual(classify('Record<string, Widget>'), { form: 'platform', type: 'Record<string, Widget>' });
  assert.throws(() => classify('ArenaTableColumn<T>'), /unreadable type annotation/);
});

test('an event payload may be consumer data, in either layer\'s spelling', () => {
  assert.deepEqual(
    classify('(row: Record<string, unknown>) => void'),
    { form: 'event', payload: 'consumerData' },
  );
  const { members } = angularSurface(
    'export class X {\n  readonly select = output<Record<string, unknown>>();\n}',
    'X',
  );
  assert.deepEqual(members, [{ name: 'select', form: 'event', required: false, payload: 'consumerData' }]);
});

test('a genuine second event parameter is still refused after the generic-comma fix', () => {
  assert.throws(
    () => classify('(id: string, event: React.MouseEvent) => void'),
    /more than one parameter/,
  );
  assert.throws(() => classify('(a: string, b: string) => void'), /more than one parameter/);
});

test('classify reads an inbound function that returns a value as a functionInput', () => {
  assert.deepEqual(classify('(value: string) => string'),
    { form: 'functionInput', params: { value: 'string' }, returns: 'string' });
});

test('classify reduces a nullable return to the non-null type', () => {
  assert.deepEqual(classify('(value: string) => string | null | undefined'),
    { form: 'functionInput', params: { value: 'string' }, returns: 'string' });
});

test('classify surfaces a functionInput whose return is a platform type as platform, not as the ninth form', () => {
  assert.deepEqual(classify('(value: string) => React.MouseEvent'),
    { form: 'platform', type: 'React.MouseEvent' });
});

test('classify throws on a function returning a node -- that is a parameterised slot (R3), not a functionInput', () => {
  assert.throws(() => classify('(item: string) => React.ReactNode'), (err) => {
    assert.ok(err instanceof UnrecognisedShape);
    assert.match(err.message, /parameterised slot/i);
    assert.match(err.message, /R3/);

    assert.match(err.message, /renderItem|ngTemplateOutlet/);
    return true;
  });
});

test('a void arrow is still an event, not a functionInput', () => {
  assert.deepEqual(classify('(v: string) => void'), { form: 'event', payload: 'string' });
});

test('classify reads every parameter of a functionInput, and a generic\'s comma is not a separator', () => {
  assert.deepEqual(classify('(value: string, other: number) => boolean'),
    { form: 'functionInput', params: { value: 'string', other: 'number' }, returns: 'boolean' });
  assert.deepEqual(classify('(row: Record<string, unknown>) => string'),
    { form: 'functionInput', params: { row: 'consumerData' }, returns: 'string' });
});

test('a nullable arrow annotation reads as the arrow it wraps', () => {
  assert.deepEqual(classify('((value: string) => string) | undefined'),
    { form: 'functionInput', params: { value: 'string' }, returns: 'string' });
  assert.deepEqual(classify('((v: string) => void) | null'),
    { form: 'event', payload: 'string' });
});

test('stripping null/undefined does not collapse a genuine union', () => {
  assert.equal(classify('string | TabItem').form, 'union');
  assert.equal(classify('string | TabItem | undefined').form, 'union');
});

test('a nullable primitive still reads as the primitive', () => {
  assert.deepEqual(classify('string | undefined'), { form: 'primitive', type: 'string' });
});

test('an inline enum with a nullable arm is still that enum, with every value it declares', () => {
  assert.deepEqual(classify("'sm' | 'md' | undefined"),
    { form: 'enum', values: ['sm', 'md'] });
});

test('a union of two parenthesised arms is not mistaken for one wrapped annotation', () => {
  assert.deepEqual(classify('(DOMRect) | (HTMLElement)'),
    { form: 'union', parts: ['(DOMRect)', '(HTMLElement)'] });
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
  const problems = defaultProblems('react/ArenaDialog', 'width', undefined, "'480px'");
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /defaults to "480px" and the contract declares no default/);
});

test('a contract default with no destructuring default is NOT reported, because the default may be applied downstream', () => {
  assert.deepEqual(defaultProblems('react/ArenaBarChart', 'slot', 1, null), []);
});

test('a non-literal default is not compared, because the gate reads source and does not evaluate it', () => {
  assert.deepEqual(defaultProblems('react/ArenaDialog', 'width', 'calc(var(--sp-1) * 120)', 'calc(var(--sp-1) * 120)'), []);
});

test('IMPERATIVE_HANDLES names each allowed method by literal value, with a reason', () => {
  assert.deepEqual([...IMPERATIVE_HANDLES.keys()].sort(), ['ArenaInput.focus', 'ArenaInput.select'],
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
