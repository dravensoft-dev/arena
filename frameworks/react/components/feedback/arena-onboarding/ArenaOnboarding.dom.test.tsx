import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaOnboarding } from './ArenaOnboarding.tsx';

afterEach(cleanup);

const ONBOARDING_BEHAVIOURAL = {

  'focus.onOpen': true,

  'focus.onClose': true,

  'focus.trap': true,

  'keyboard.Escape': true,
};

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

test('ArenaOnboarding matches its dialog-modal binding, in both directions', () => {
  const container = mount(
    <ArenaOnboarding open steps={[{ title: 'Welcome', body: 'Body' }]} index={0} onSkip={() => {}} />,
  );
  assertPattern({
    root: container,
    bindingPath: join(REACT_COMPONENTS, 'feedback/arena-onboarding/ArenaOnboarding.behaviour.json'),

    subjects: { default: container.querySelector<HTMLElement>('[role="dialog"]') },
    behavioural: ONBOARDING_BEHAVIOURAL,
  });
});

test('ArenaOnboarding dismisses on Escape -- keyboard.Escape is met', () => {

  let skipped = false;
  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => { skipped = true; }} />,
  );
  press(container!.querySelector<HTMLElement>('[role="dialog"]')!, 'Escape');
  assert.equal(skipped, true, 'Escape did not reach the coachmark\'s own dismissal channel');
});

test('ArenaOnboarding still dismisses on a scrim click -- the mouse path Escape joins rather than replaces', () => {

  let skipped = false;
  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => { skipped = true; }} />,
  );
  const scrim = container.querySelector<HTMLElement>('[role="dialog"]')!.parentElement;
  assert.notEqual(scrim, null, 'precondition: the panel sits inside the scrim');
  click(scrim!);
  assert.equal(skipped, true, 'the scrim click must still dismiss');
});

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

test('ArenaOnboarding moves focus to the first focusable inside the panel on open -- focus.onOpen is met', () => {

  const invoker = document.createElement('button');
  document.body.appendChild(invoker);
  invoker.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');

  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.notEqual(document.activeElement, invoker, 'focus stayed on the invoker, outside the coachmark');
  assert.equal(
    document.activeElement,
    panel!.querySelector<HTMLElement>('button')!,
    'the coachmark\'s first focusable descendant did not receive focus',
  );
  invoker.remove();
});

function OnboardingHarness() {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button type="button" data-role="invoker" onClick={() => setOpen(true)}>Open</button>
      <ArenaOnboarding open={open} steps={THREE_STEPS} index={1} onSkip={() => setOpen(false)} />
    </div>
  );
}

test('ArenaOnboarding restores focus to the invoker on close -- focus.onClose is met', () => {
  const container = mount(<OnboardingHarness />);
  const invoker = container.querySelector<HTMLElement>('[data-role="invoker"]');
  invoker!.focus();
  assert.equal(document.activeElement, invoker, 'precondition: the invoker holds focus');
  assert.equal(container.querySelector<HTMLElement>('[role="dialog"]')!, null, 'precondition: the coachmark starts closed');

  click(invoker!);
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.notEqual(panel, null, 'precondition: the click opened the coachmark');

  assert.equal(document.activeElement, panel!.querySelector<HTMLElement>('button')!, 'precondition: opening put focus inside the coachmark');

  click(panel!.parentElement!);
  assert.equal(container.querySelector<HTMLElement>('[role="dialog"]')!, null, 'precondition: the scrim click really closed the coachmark');

  assert.equal(document.activeElement, invoker, 'focus was not restored to the invoker that opened the coachmark');
});

test('ArenaOnboarding wraps Shift+Tab from the first focusable to the last -- focus.trap is met at the boundary', () => {
  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => {}} onBack={() => {}} onNext={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  const buttons = panel!.querySelectorAll<HTMLElement>('button');
  assert.equal(buttons.length, 3, 'precondition: a middle step renders Back, Skip and Next');
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  act(() => { first!.focus(); });
  assert.equal(document.activeElement, first, 'precondition: the first focusable holds focus');
  press(first!, 'Tab', { shiftKey: true });
  assert.equal(document.activeElement, last, 'Shift+Tab at the first boundary did not wrap to the last');
});

test('ArenaOnboarding wraps Tab from the last focusable to the first -- the other boundary', () => {
  const container = mount(
    <ArenaOnboarding open steps={THREE_STEPS} index={1} onSkip={() => {}} onBack={() => {}} onNext={() => {}} />,
  );
  const panel = container.querySelector<HTMLElement>('[role="dialog"]');
  const buttons = panel!.querySelectorAll<HTMLElement>('button');
  const first = buttons[0];
  const last = buttons[buttons.length - 1];
  act(() => { last!.focus(); });
  assert.equal(document.activeElement, last, 'precondition: the last focusable holds focus');
  press(last!, 'Tab');
  assert.equal(document.activeElement, first, 'Tab at the last boundary did not wrap to the first');
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
  assert.equal(named('Skip') !== undefined, true);

  press(document.activeElement!, 'Escape');
  assert.equal(skipped, 1, 'Escape reports skip exactly once');
});
