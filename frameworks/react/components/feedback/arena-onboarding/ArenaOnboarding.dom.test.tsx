import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { ArenaOnboarding } from './ArenaOnboarding.tsx';

afterEach(cleanup);

function press(el: Element, key: string, init: KeyboardEventInit = {}) {
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }));
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
}

const THREE_STEPS = [
  { title: 'Welcome', body: 'One' },
  { title: 'ArenaCommand palette', body: 'Two' },
  { title: 'All set', body: 'Three' },
];

test('a click inside the panel does not reach the scrim, which is what stopPropagation buys once they share an ancestor', () => {
  let skipped = false;
  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => { skipped = true; }} onBack={() => {}} onNext={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.equal(panel!.parentElement!.getAttribute('role'), null, 'precondition: the scrim is the panel\'s ancestor, not a sibling');

  click(panel!);
  assert.equal(skipped, false, 'a click on the panel body dismissed the tour');

  const back = [...panel!.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === 'Back');
  click(back!);
  assert.equal(skipped, false, 'a click on Back dismissed the tour through the scrim listener behind it');
});

test('ArenaOnboarding falls back to the step eyebrow when the step has no title -- roles.label is met on an untitled step', () => {
  const container = mount(
    <ArenaOnboarding open steps={[{ eyebrow: 'Welcome', body: 'Body' }]} index={0} onSkip={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.equal(panel!.getAttribute('aria-label'), 'Welcome', 'an untitled step must borrow the eyebrow as its name');
});

test('ArenaOnboarding falls back to a positional name when the step has neither title nor eyebrow', () => {

  const container = mount(
    <ArenaOnboarding open steps={[{ body: 'One' }, { body: 'Two' }, { body: 'Three' }]} index={1} onSkip={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.equal(panel!.getAttribute('aria-label'), 'Step 2 of 3', 'a step with no editorial text must still name the dialog positionally');
  const dots = panel!.querySelector<HTMLElement>('[aria-label^="Progress"]');
  assert.notEqual(dots, null, 'precondition: the progress dots carry a name of their own');
  assert.notEqual(
    dots!.getAttribute('aria-label'),
    panel!.getAttribute('aria-label'),
    'the dots and the panel that contains them announce identically, so a screen reader reads one name twice',
  );
});

test('Next inside a form advances the tour and does not submit the form', () => {
  let submits = 0;
  let nexts = 0;
  const container = mount(
    <form onSubmit={(e) => { e.preventDefault(); submits += 1; }}>
      <ArenaOnboarding open steps={[{ title: 'One' }, { title: 'Two' }]} index={0} onNext={() => { nexts += 1; }} />
    </form>,
  );
  const next = container.querySelector<HTMLElement>('[data-arena-part="onboarding.next"]');
  assert.ok(next, 'the Next button is drawn');
  click(next!);
  assert.equal(submits, 0);
  assert.equal(nexts, 1);
});

test('Next then Back leaves focus inside the panel, and Escape then closes the tour', () => {
  let skipped = 0;
  function Host() {
    const [index, setIndex] = useState(0);
    return (
      <ArenaOnboarding open steps={THREE_STEPS} index={index}
        onNext={() => setIndex((i) => i + 1)} onBack={() => setIndex((i) => i - 1)} onSkip={() => { skipped += 1; }} />
    );
  }
  const container = mount(<Host />);
  const buttons = () => Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
  const named = (name: string) => buttons().find((b) => b.textContent === name)!;
  const panel = container.querySelector<HTMLElement>('[role="dialog"]')!;

  const next = buttons()[buttons().length - 1]!;
  next.focus();
  click(next);
  const back = buttons()[0]!;
  assert.equal(back.textContent, 'Back');
  back.focus();
  click(back);
  assert.equal(buttons().some((b) => b.textContent === 'Back'), false, 'Back is gone at index 0');
  assert.equal(panel.contains(document.activeElement), true, 'focus must stay inside the panel after the step change');
  assert.equal(document.activeElement, named('Skip'), 'the dropped focus did not land on the panel\'s first control');

  press(document.activeElement!, 'Escape');
  assert.equal(skipped, 1, 'Escape reports skip exactly once');
});
