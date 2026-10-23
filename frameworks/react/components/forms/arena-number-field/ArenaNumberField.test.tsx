/* What a server renders for a number field: the label tied to a text field that carries the
 * spinbutton role and its value attributes, the value written in the locale's format, two named
 * steppers out of the Tab sequence, and the plain decimal string a form submits. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaNumberField } from './ArenaNumberField.tsx';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const field = (html: string) => /<input[^>]*role="spinbutton"[^>]*>/.exec(html)?.[0] ?? '';

test('the label points at a text field that carries the spinbutton role and its bounds', () => {
  const html = render(<ArenaNumberField label="Max Replicas" value={3} min={1} max={20} />);
  assert.match(html, /<label id="nf-max-replicas-label" for="nf-max-replicas"/);
  const input = field(html);
  for (const attribute of ['id="nf-max-replicas"', 'type="text"', 'inputMode="decimal"', 'aria-valuenow="3"', 'aria-valuemin="1"', 'aria-valuemax="20"', 'aria-valuetext="3"', 'value="3"'])
    assert.ok(input.includes(attribute), `the field carries no ${attribute}: ${input}`);
});

test('an empty field carries no value attributes and no bound it was not given', () => {
  const input = field(render(<ArenaNumberField label="Replicas" />));
  for (const attribute of ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'])
    assert.ok(!input.includes(attribute), `an empty unbounded field carries ${attribute}: ${input}`);
  assert.match(input, /value=""/);
});

test('the value is written in the format, and the reading adds the prefix and the suffix', () => {
  const html = render(<ArenaNumberField label="Budget" value={48200.5} prefix="$" suffix="USD" format={{ locale: 'en-US', fractionDigits: 2 }} />);
  const input = field(html);
  assert.match(input, /value="48,200\.50"/);
  assert.match(input, /aria-valuetext="\$48,200\.50USD"/);
  assert.match(html, /data-arena-part="number-field.prefix"[^>]*aria-hidden="true">\$<\/span>/);
});

test('with no locale in the format the field writes in the locale Arena is given', () => {
  assert.match(field(render(<ArenaNumberField label="Weight" value={1234.5} />)), /value="1,234\.5"/);
});

test('the steppers are named buttons out of the Tab sequence, and the one at a bound is disabled', () => {
  const html = render(<ArenaNumberField label="Replicas" value={1} min={1} max={20} />);
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  assert.equal(buttons.length, 2);
  assert.match(buttons[0] ?? '', /tabindex="-1" aria-label="Decrease" disabled=""/);
  assert.match(buttons[1] ?? '', /tabindex="-1" aria-label="Increase"/);
  assert.doesNotMatch(buttons[1] ?? '', /disabled/);
  assert.doesNotMatch(render(<ArenaNumberField label="Replicas" steppers={false} />), /<button/);
});

test('a form receives the plain decimal string through a hidden input, and an empty field submits empty', () => {
  assert.match(render(<ArenaNumberField label="Budget" name="budget" value={48200.5} format={{ locale: 'de-DE' }} />),
    /<input type="hidden" name="budget" value="48200.5"\/>/);
  assert.match(render(<ArenaNumberField label="Budget" name="budget" />), /<input type="hidden" name="budget" value=""\/>/);
  assert.doesNotMatch(field(render(<ArenaNumberField label="Budget" name="budget" />)), /name=/);
});

test('the hint and then the error describe the field, and a hidden label still names it', () => {
  assert.match(field(render(<ArenaNumberField label="Replicas" hint="Between 1 and 20." />)), /aria-describedby="nf-replicas-note"/);
  const failed = render(<ArenaNumberField label="Replicas" hint="Between 1 and 20." error="Too many." />);
  assert.match(failed, /<span id="nf-replicas-note"[^>]*>Too many\.<\/span>/);
  assert.match(field(failed), /aria-invalid="true"/);
  const quiet = render(<ArenaNumberField label="Replicas" showLabel={false} />);
  assert.doesNotMatch(quiet, /<label/);
  assert.match(field(quiet), /aria-label="Replicas"/);
});

test('required is the native attribute on the field, and the mark beside the label is not spoken', () => {
  const html = render(<ArenaNumberField label="Replicas" required />);
  assert.match(field(html), /required=""/);
  assert.doesNotMatch(field(html), /aria-required/);
  assert.match(html, /data-arena-part="number-field.required"[^>]*aria-hidden="true">\*<\/span>/);
});

test('a number outside the bounds is drawn and announced at the nearest bound', () => {
  const html = render(<ArenaNumberField label="Replicas" value={500} min={1} max={100} />);
  const input = field(html);
  assert.match(input, /value="100"/);
  assert.match(input, /aria-valuenow="100"/);
  assert.match((html.match(/<button[^>]*>/g) ?? [])[1] ?? '', /disabled/);
});

test('a blank label throws, because nothing can derive what the number counts', () => {
  assert.throws(() => render(<ArenaNumberField label="  " />), /^Error: ArenaNumberField:/);
});
