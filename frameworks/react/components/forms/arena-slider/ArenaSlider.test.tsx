/* What a server renders for a slider: a thumb that carries the slider role, its bounds, its reading
 * and its name, the fraction it stands at as a channel the manifest places it by, a readout, and the
 * hidden input a form submits. Two thumbs bound each other; a vertical one says so. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ArenaSlider } from './ArenaSlider.tsx';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const thumbs = (html: string) => html.match(/<span[^>]*role="slider"[^>]*>/g) ?? [];

test('one thumb carries the slider role, its bounds and its reading, and stands at its fraction', () => {
  const html = render(<ArenaSlider label="Volume" value={40} valueSuffix="%" />);
  const [thumb = ''] = thumbs(html);
  for (const attribute of ['tabindex="0"', 'aria-valuenow="40"', 'aria-valuemin="0"', 'aria-valuemax="100"', 'aria-valuetext="40%"', '--arena-slider-at:0.4'])
    assert.ok(thumb.includes(attribute), `the thumb carries no ${attribute}: ${thumb}`);
  assert.doesNotMatch(thumb, /aria-orientation/);
  assert.match(html, /--arena-slider-from:0;--arena-slider-to:0.4/);
  assert.match(html, /data-arena-part="slider.value"[^>]*>40%<\/span>/);
});

test('with no value the thumb stands at the minimum, snapped to the step, and a value outside is held at a bound', () => {
  assert.match(thumbs(render(<ArenaSlider label="Gain" min={10} max={50} />))[0] ?? '', /aria-valuenow="10"/);
  assert.match(thumbs(render(<ArenaSlider label="Gain" value={33} step={5} />))[0] ?? '', /aria-valuenow="35"/);
  assert.match(thumbs(render(<ArenaSlider label="Gain" value={400} />))[0] ?? '', /aria-valuenow="100"/);
  assert.match(thumbs(render(<ArenaSlider label="Gain" min={5} max={5} />))[0] ?? '', /aria-valuemin="0" aria-valuemax="100"/);
});

test('the thumb is named by the label, and a hidden label still names it', () => {
  const html = render(<ArenaSlider label="Volume" hint="Applies to every output." />);
  const id = /<span id="([^"]+)"[^>]*data-arena-part="slider.label"/.exec(html)?.[1];
  assert.ok(id);
  assert.ok((thumbs(html)[0] ?? '').includes(`aria-labelledby="${id}"`));
  assert.match(thumbs(html)[0] ?? '', /aria-describedby="[^"]+-hint"/);
  const quiet = render(<ArenaSlider label="Volume" showLabel={false} />);
  assert.match(quiet, /data-arena-part="slider.thumb-label"[^>]*>Volume<\/span>/);
});

test('two thumbs bound each other, are named by the label and their own word, and read as one span', () => {
  const html = render(<ArenaSlider label="Price" range value={20} valueEnd={75} valuePrefix="$" />);
  const [start = '', end = ''] = thumbs(html);
  assert.match(start, /aria-valuenow="20" aria-valuemin="0" aria-valuemax="75"/);
  assert.match(end, /aria-valuenow="75" aria-valuemin="20" aria-valuemax="100"/);
  assert.match(html, /data-arena-part="slider.thumb-label"[^>]*>Minimum<\/span>/);
  assert.match(html, /data-arena-part="slider.thumb-label"[^>]*>Maximum<\/span>/);
  assert.match(start, /aria-labelledby="[^" ]+-label [^" ]+-start"/);
  assert.match(html, /data-arena-part="slider.value"[^>]*>\$20 – \$75<\/span>/);
  assert.match(html, /--arena-slider-from:0.2;--arena-slider-to:0.75/);
});

test('in range mode the end starts at the top step and a start above the end is drawn at the end', () => {
  const [, end = ''] = thumbs(render(<ArenaSlider label="Price" range max={10} step={3} />));
  assert.match(end, /aria-valuenow="9"/);
  const [start = ''] = thumbs(render(<ArenaSlider label="Price" range value={80} valueEnd={30} />));
  assert.match(start, /aria-valuenow="30"/);
});

test('a vertical slider says so on every thumb and in its layout', () => {
  const html = render(<ArenaSlider label="Gain" orientation="vertical" range />);
  for (const thumb of thumbs(html)) assert.match(thumb, /aria-orientation="vertical"/);
  assert.match(html, /data-arena-orientation="vertical"/);
});

test('a form receives the number through a hidden input, and a range posts two under one name', () => {
  assert.match(render(<ArenaSlider label="Volume" name="volume" value={40} />), /<input type="hidden" name="volume" value="40"\/>/);
  const pair = render(<ArenaSlider label="Price" name="price" range value={20} valueEnd={75} />);
  assert.deepEqual(pair.match(/<input type="hidden"[^>]*>/g), ['<input type="hidden" name="price" value="20"/>', '<input type="hidden" name="price" value="75"/>']);
});

test('disabled takes the thumb out of the Tab sequence and says so', () => {
  assert.match(thumbs(render(<ArenaSlider label="Volume" disabled />))[0] ?? '', /tabindex="-1"[^>]*aria-disabled="true"/);
});

test('a blank label throws, because nothing can derive what the range measures', () => {
  assert.throws(() => render(<ArenaSlider label=" " />), /^Error: ArenaSlider:/);
});
