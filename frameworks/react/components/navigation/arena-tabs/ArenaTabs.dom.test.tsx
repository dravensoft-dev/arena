import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaTabs } from './ArenaTabs.tsx';
import { ArenaTab } from '../arena-tab/ArenaTab.tsx';

afterEach(cleanup);

const three = (props: { onValueChange?: (value: string) => void } = {}) => (
  <ArenaTabs defaultValue="ov" onValueChange={props.onValueChange}>
    <ArenaTab value="ov" label="Overview"><p>overview body</p></ArenaTab>
    <ArenaTab value="dp" label="Deployments"><p>deployments body</p></ArenaTab>
    <ArenaTab value="ac" label="Activity"><p>activity body</p></ArenaTab>
  </ArenaTabs>
);

const tabsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="tab"]')];

const panelsOf = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
const panelOf = (root: ParentNode) => panelsOf(root).find((p) => !p.hasAttribute('hidden'));
const stopsOf = (root: ParentNode) => tabsOf(root).filter((t) => t.getAttribute('tabindex') === '0');
const selectedOf = (root: ParentNode) => tabsOf(root).filter((t) => t.getAttribute('aria-selected') === 'true');
const arrow = (root: ParentNode, key: string) => act(() => {
  root.querySelector('[role="tablist"]')!
    .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
});

test('clicking a tab selects it: aria-selected, the tab stop and the panel all move together', () => {
  const root = mount(three());
  const [ov, dp] = tabsOf(root);
  assert.equal(ov!.getAttribute('aria-selected'), 'true');
  assert.equal(dp!.getAttribute('aria-selected'), 'false');

  act(() => { dp!.click(); });

  const [ov2, dp2] = tabsOf(root);
  assert.equal(dp2!.getAttribute('aria-selected'), 'true');
  assert.equal(ov2!.getAttribute('aria-selected'), 'false');
  assert.equal(dp2!.getAttribute('tabindex'), '0');
  assert.equal(ov2!.getAttribute('tabindex'), '-1');
  assert.match(panelOf(root)!.textContent, /deployments body/);
});

test('a selection reports exactly one value', () => {
  const seen: unknown[] = [];
  const root = mount(three({ onValueChange: (v: string) => seen.push(v) }));
  act(() => { tabsOf(root)[1]!.click(); });
  act(() => { tabsOf(root)[2]!.click(); });
  assert.deepEqual(seen, ['dp', 'ac']);
});

test('a native change inside a panel is not heard as a tab choice, and choosing a tab is heard once', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaTabs value="ov" onValueChange={(v) => seen.push(v)}>
      <ArenaTab value="ov" label="Overview"><select><option>one</option><option>two</option></select></ArenaTab>
      <ArenaTab value="dp" label="Deployments"><p>deployments body</p></ArenaTab>
    </ArenaTabs>,
  );
  act(() => { root.querySelector('select')!.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.deepEqual(seen, [], 'a field inside a panel reported a tab choice');
  act(() => { tabsOf(root)[1]!.click(); });
  assert.deepEqual(seen, ['dp'], 'choosing a tab did not report exactly once');
});

test('exactly one tab is in the tab sequence, before and after a move', () => {
  const root = mount(three());
  assert.equal(stopsOf(root).length, 1);
  arrow(root, 'ArrowRight');
  assert.equal(stopsOf(root).length, 1, 'a second tab stop appeared inside the tablist');
  assert.equal(stopsOf(root)[0]!.textContent, 'Deployments');
});

test('a value naming no tab is still operable: an arrow moves from the tab stop', () => {
  const seen: unknown[] = [];
  const root = mount(
    <ArenaTabs value="nope" onValueChange={(v) => seen.push(v)}>
      <ArenaTab value="ov" label="Overview"><p>overview body</p></ArenaTab>
      <ArenaTab value="dp" label="Deployments"><p>deployments body</p></ArenaTab>
    </ArenaTabs>,
  );
  assert.equal(selectedOf(root).length, 0, 'a tab was selected that the consumer did not ask for');
  assert.equal(stopsOf(root).length, 1, 'the strip has no tab stop -- it cannot be reached by keyboard');
  assert.equal(panelOf(root), undefined, 'a panel is shown for a tab that is not selected');
  arrow(root, 'ArrowRight');
  assert.deepEqual(seen, ['dp'], 'an arrow key reported nothing -- the strip is keyboard-dead');
  assert.equal(document.activeElement, tabsOf(root)[1], 'the arrow did not move focus');
});

test('tabs that arrive after mount are still operable, though nothing is selected', () => {
  let reveal: (() => void) | undefined;
  function Late() {
    const [ready, setReady] = React.useState(false);
    reveal = () => setReady(true);
    return (
      <ArenaTabs>
        {ready && <ArenaTab value="ov" label="Overview"><p>overview body</p></ArenaTab>}
        {ready && <ArenaTab value="dp" label="Deployments"><p>deployments body</p></ArenaTab>}
      </ArenaTabs>
    );
  }
  const root = mount(<Late />);
  assert.equal(tabsOf(root).length, 0);
  act(() => { reveal!(); });
  assert.equal(tabsOf(root).length, 2, 'the late tabs never rendered');
  assert.equal(selectedOf(root).length, 0, 'a tab was selected with no value naming it');
  assert.equal(stopsOf(root).length, 1,
    'a strip whose tabs arrived late has no tab stop -- it cannot be reached by keyboard');
  arrow(root, 'ArrowRight');
  assert.equal(tabsOf(root)[1]!.getAttribute('aria-selected'), 'true',
    'an arrow key did not select -- the strip is keyboard-dead');
});

test('every tab controls a panel that exists, not only the selected one', () => {
  const root = mount(three());
  const ids = new Set(panelsOf(root).map((p) => p.getAttribute('id')));
  assert.equal(ids.size, 3, 'a panel per tab must exist, or the unselected tabs\' aria-controls dangle');
  for (const tab of tabsOf(root)) {
    const ref = tab.getAttribute('aria-controls');
    assert.ok(ref && ids.has(ref), `tab "${tab.textContent}" controls "${ref}", which nothing renders`);
    assert.equal(root.querySelector<HTMLElement>(`#${ref}`)!.getAttribute('aria-labelledby'), tab.getAttribute('id'),
      'a panel is labelled by a tab other than the one that controls it');
  }
  assert.equal(panelsOf(root).filter((p) => !p.hasAttribute('hidden')).length, 1,
    'exactly one panel is visible -- the rest are hidden, not absent');
});

test('ArrowRight moves selection and focus to the next tab', () => {
  const root = mount(three());
  arrow(root, 'ArrowRight');
  assert.equal(tabsOf(root)[1]!.getAttribute('aria-selected'), 'true');

  assert.equal(document.activeElement, tabsOf(root)[1]);
  assert.match(panelOf(root)!.textContent, /deployments body/);
});

test('ArrowLeft moves the other way, and both directions wrap', () => {
  const root = mount(three());
  arrow(root, 'ArrowLeft');
  assert.equal(tabsOf(root)[2]!.getAttribute('aria-selected'), 'true', 'ArrowLeft did not wrap to the last tab');
  arrow(root, 'ArrowRight');
  assert.equal(tabsOf(root)[0]!.getAttribute('aria-selected'), 'true', 'ArrowRight did not wrap to the first tab');
});

test('a key the pattern does not claim is left alone', () => {
  const root = mount(three());
  const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  act(() => { root.querySelector<HTMLElement>('[role="tablist"]')!.dispatchEvent(ev); });
  assert.equal(ev.defaultPrevented, false, 'ArenaTabs cancelled a key it does not handle');
  assert.equal(tabsOf(root)[0]!.getAttribute('aria-selected'), 'true');
});

test('the selected tab and its panel reference each other in the real DOM', () => {
  const root = mount(three());
  const selected = tabsOf(root).find((t) => t.getAttribute('aria-selected') === 'true');
  const panel = panelOf(root);
  assert.equal(selected!.getAttribute('aria-controls'), panel!.getAttribute('id'));
  assert.equal(panel!.getAttribute('aria-labelledby'), selected!.getAttribute('id'));

  assert.equal(root.querySelector<HTMLElement>(`#${panel!.getAttribute('id')}`)!, panel);
});

test('dropping a tab does not migrate a surviving panel\'s typed input into the wrong tab', () => {
  function IdentityHarness() {
    const [keys, setKeys] = React.useState(['a', 'b', 'c']);
    return (
      <>
        <button type="button" data-drop onClick={() => setKeys(['b', 'c'])}>drop</button>
        <ArenaTabs defaultValue="b">
          {keys.map((k) => <ArenaTab key={k} value={k} label={`Tab ${k}`}><input data-for={k} /></ArenaTab>)}
        </ArenaTabs>
      </>
    );
  }
  const root = mount(<IdentityHarness />);

  act(() => {
    for (const input of root.querySelectorAll<HTMLInputElement>('input[data-for]')) {
      input.value = `typed-${input.dataset.for}`;
    }
  });
  act(() => { root.querySelector<HTMLElement>('[data-drop]')!.click(); });

  const pairs = [...root.querySelectorAll<HTMLInputElement>('input[data-for]')]
    .map((input) => [input.dataset.for, input.value]);
  assert.deepEqual(pairs, [['b', 'typed-b'], ['c', 'typed-c']],
    'a surviving panel\'s input held another tab\'s typed value -- the panel list is keyed positionally');
});

test('the binding is honest: every `tabs` requirement, in both directions', () => {
  const root = mount(three());
  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation', 'arena-tabs', 'ArenaTabs.behaviour.json'),
    subjects: {
      default: root.querySelector<HTMLElement>('[role="tablist"]')!,
      'roles.tab': root.querySelector<HTMLElement>('[role="tab"]')!,

      'roles.controls': [...root.querySelectorAll<HTMLElement>('[role="tab"]')],
      'states.selected': [...root.querySelectorAll<HTMLElement>('[role="tab"]')],
      'roles.tabpanel': root.querySelector<HTMLElement>('[role="tabpanel"]')!,
    },

    behavioural: {
      'focus.roving': true,
      'keyboard.ArrowLeft': true,
      'keyboard.ArrowRight': true,
    },
  });
});

test('ArenaTab binds "none" because ArenaTabs owns the pattern, and it adds no affordance of its own', () => {
  const root = mount(three());
  const [first] = tabsOf(root);

  assert.equal(first!.getAttribute('role'), 'tab',
    'the role an ArenaTab carries is a clause of the `tabs` pattern ArenaTabs binds -- the ArenaTab does not choose it');
  assert.equal(first!.hasAttribute('aria-haspopup'), false,
    'an ArenaTab that grew an affordance of its own would need a pattern of its own, and its binding says it has none');

  assertPattern({
    root,
    bindingPath: join(REACT_COMPONENTS, 'navigation/arena-tab/ArenaTab.behaviour.json'),
    subjects: { default: first },
  });
});
