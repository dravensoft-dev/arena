/* The slider binds slider to each thumb, an element Arena draws and moves itself, so every key the
 * pattern requires is pressed and its result read back, and the conditional states are rendered
 * both ways: a vertical thumb says so and a horizontal one does not, and a range thumb's bounds move
 * with the other thumb. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../test/AssertPattern.tsx';
import { ArenaSlider, type ArenaSliderProps } from './arena-slider/ArenaSlider.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'forms/arena-slider/ArenaSlider.behaviour.json');

function render(props: Partial<ArenaSliderProps> = {}) {
  function Host() {
    const [value, write] = useState(props.value);
    const [valueEnd, writeEnd] = useState(props.valueEnd);
    return <ArenaSlider label="Volume" {...props} value={value} valueEnd={valueEnd} onValueChange={write} onValueEndChange={writeEnd} />;
  }
  const root = mount(<Host />);
  const thumbs = [...root.querySelectorAll<HTMLElement>('[role="slider"]')];
  const press = (key: string, thumb = thumbs[0]!) => act(() => { thumb.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
  const now = (thumb = thumbs[0]!) => thumb.getAttribute('aria-valuenow');
  return { root, thumbs, press, now };
}

test('a vertical thumb says so, and a horizontal one carries no orientation', () => {
  assert.equal(render({ orientation: 'vertical' }).thumbs[0]!.getAttribute('aria-orientation'), 'vertical');
  cleanup();
  assert.equal(render().thumbs[0]!.getAttribute('aria-orientation'), null);
});

test('each thumb of a range is a slider whose bounds are the other thumb', () => {
  const { thumbs } = render({ range: true, value: 30, valueEnd: 70 });
  assert.deepEqual(thumbs.map((one) => [one.getAttribute('aria-valuemin'), one.getAttribute('aria-valuemax')]), [['0', '70'], ['30', '100']]);
});

test('ArenaSlider meets the slider pattern on its thumb', () => {
  const { root, thumbs, press, now } = render({ value: 50, valueSuffix: '%' });
  const thumb = thumbs[0]!;
  press('ArrowRight');
  const right = now() === '51';
  press('ArrowUp');
  const up = now() === '52';
  press('ArrowLeft');
  const left = now() === '51';
  press('ArrowDown');
  const down = now() === '50';
  press('Home');
  const home = now() === '0';
  press('End');
  const end = now() === '100';
  assertPattern({
    root,
    bindingPath: BINDING,
    subjects: { default: thumb },
    behavioural: {
      'keyboard.ArrowRight': right,
      'keyboard.ArrowUp': up,
      'keyboard.ArrowLeft': left,
      'keyboard.ArrowDown': down,
      'keyboard.Home': home,
      'keyboard.End': end,
      'states.valuenow': now() === '100',
      'states.valuemin': thumb.getAttribute('aria-valuemin') === '0',
      'states.valuemax': thumb.getAttribute('aria-valuemax') === '100',
      'states.valuetext': thumb.getAttribute('aria-valuetext') === '100%',
      'states.orientation': thumb.getAttribute('aria-orientation') === null,
    },
  });
});
