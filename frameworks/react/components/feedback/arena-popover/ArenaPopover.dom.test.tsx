/* dialog-nonmodal requires the role and a name, and nothing else. Everything else this suite
 * holds is Arena's own decision, earned here by pressing a key or a pointer and reading what
 * moved: the trigger's popup state, focus on open, Escape and Tab-out returning focus to the
 * trigger, an outside press leaving focus where it is, and a menu inside the panel closing alone.
 * Every assertion runs the controlled shape a consumer writes, a host holding `open`. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { useState } from 'react';
import { join } from 'node:path';
import { mount, cleanup, act } from '../../../test/Harness.tsx';
import { assertPattern, REACT_COMPONENTS } from '../../../test/AssertPattern.tsx';
import { ArenaPopover } from './ArenaPopover.tsx';

afterEach(cleanup);

const BINDING = join(REACT_COMPONENTS, 'feedback/arena-popover/ArenaPopover.behaviour.json');

function Host({ children, asked }: { children?: React.ReactNode; asked?: boolean[] }) {
  const [open, setOpen] = useState(false);
  return (
    <ArenaPopover label="Filters" open={open} onOpenChange={(next) => { asked?.push(next); setOpen(next); }}
      trigger={<button type="button">Filters</button>}>
      {children ?? <><input aria-label="Branch" /><button type="button" onClick={() => setOpen(false)}>Apply</button></>}
    </ArenaPopover>
  );
}

const triggerIn = (root: ParentNode) => root.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')!;
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');

function key(target: Element, name: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(event); });
  return event;
}

function open(root: ParentNode) {
  act(() => { triggerIn(root).click(); });
  return panel()!;
}

test('ArenaPopover meets the dialog-nonmodal pattern it binds, open', () => {
  const root = mount(<Host />);
  const shown = open(root);
  assert.equal(shown.getAttribute('aria-modal'), null, 'a non-modal panel claimed to be modal');
  assertPattern({ root, bindingPath: BINDING, subjects: { default: shown } });
});

test('the trigger says it opens a dialog, and names the panel only while the panel is there', () => {
  const root = mount(<Host />);
  const trigger = triggerIn(root);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(trigger.getAttribute('aria-controls'), null, 'a closed trigger named a panel that is not there');
  const shown = open(root);
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(trigger.getAttribute('aria-controls'), shown.id, 'the open trigger does not name its panel');
  assert.ok(shown.id, 'the panel carries no id for the trigger to name');
});

test('the popup state reaches a trigger that drops every prop it is handed', () => {
  function DropsProps({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
    return <button type="button" onClick={onClick}>{children}</button>;
  }
  function Dropping() {
    const [open, setOpen] = useState(false);
    return <ArenaPopover label="Filters" open={open} onOpenChange={setOpen} trigger={<DropsProps>Filters</DropsProps>}><p>x</p></ArenaPopover>;
  }
  const root = mount(<Dropping />);
  const trigger = root.querySelector('button')!;
  assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
  act(() => { trigger.click(); });
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(trigger.getAttribute('aria-controls'), panel()!.id);
});

test('a trigger wrapped around its control is resolved to the control, for the state, the press and the focus return', () => {
  function Wrapped({ children }: { children?: React.ReactNode }) {
    return <span className="wrap">{children}</span>;
  }
  function Host2() {
    const [open, setOpen] = useState(false);
    return (
      <ArenaPopover label="Filters" open={open} onOpenChange={setOpen}
        trigger={<Wrapped><button type="button">Filters</button></Wrapped>}>
        <input aria-label="Branch" />
      </ArenaPopover>
    );
  }
  const root = mount(<Host2 />);
  const wrapper = root.querySelector('.wrap')!;
  const control = root.querySelector('button')!;
  assert.equal(control.getAttribute('aria-haspopup'), 'dialog', 'the control did not take the popup state');
  assert.equal(wrapper.getAttribute('aria-haspopup'), null, 'the wrapper took the popup state');
  act(() => { control.click(); });
  assert.ok(panel(), 'a press on the control did not open the panel');
  assert.equal(control.getAttribute('aria-expanded'), 'true');
  assert.equal(control.getAttribute('aria-controls'), panel()!.id);
  key(panel()!.querySelector('input')!, 'Escape');
  assert.equal(panel(), null);
  assert.equal(document.activeElement, control, 'Escape did not return focus to the control');
});

test('a trigger whose own press handler stops propagation still opens the panel', () => {
  function Host3() {
    const [open, setOpen] = useState(false);
    return (
      <ArenaPopover label="Filters" open={open} onOpenChange={setOpen}
        trigger={<button type="button" onClick={(e) => e.stopPropagation()}>Filters</button>}>
        <input aria-label="Branch" />
      </ArenaPopover>
    );
  }
  const root = mount(<Host3 />);
  act(() => { root.querySelector('button')!.click(); });
  assert.ok(panel(), 'a stopPropagation in the trigger kept the panel shut');
});

test('a wrapper that forwards its props carries no popup state; the control inside it does', () => {
  function Forwards({ children, ...rest }: { children?: React.ReactNode }) {
    return <span className="wrap" {...rest}>{children}</span>;
  }
  const root = mount(
    <ArenaPopover label="Filters" open onOpenChange={() => {}} trigger={<Forwards><button type="button">Filters</button></Forwards>}>
      <input aria-label="Branch" />
    </ArenaPopover>,
  );
  const wrapper = root.querySelector('.wrap')!;
  for (const name of ['aria-haspopup', 'aria-expanded', 'aria-controls']) {
    assert.equal(wrapper.getAttribute(name), null, `the wrapper carries ${name}`);
  }
  assert.equal(root.querySelector('button')!.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(root.querySelector('button')!.getAttribute('aria-expanded'), 'true');
});

test('opening moves focus to the first control in the panel, or to the panel when it holds none', () => {
  const root = mount(<Host />);
  open(root);
  assert.equal(document.activeElement, panel()!.querySelector('input'));
  cleanup();
  const bare = mount(<Host><p>Builds older than a week are archived.</p></Host>);
  open(bare);
  assert.equal(document.activeElement, panel());
});

test('Escape asks to close and returns focus to the trigger', () => {
  const asked: boolean[] = [];
  const root = mount(<Host asked={asked} />);
  open(root);
  key(panel()!.querySelector('input')!, 'Escape');
  assert.deepEqual(asked, [true, false]);
  assert.equal(panel(), null);
  assert.equal(document.activeElement, triggerIn(root));
});

test('a press outside asks to close and sends focus nowhere; a press inside does not', () => {
  const asked: boolean[] = [];
  const root = mount(<><Host asked={asked} /><button type="button" data-elsewhere>Elsewhere</button></>);
  open(root);
  act(() => { panel()!.querySelector('input')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.deepEqual(asked, [true], 'a press inside the panel closed it');
  act(() => { document.querySelector('[data-elsewhere]')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  assert.deepEqual(asked, [true, false]);
  assert.notEqual(document.activeElement, triggerIn(root),
    'an outside press pulled focus back to the trigger, away from what the reader pressed');
});

test('Tab from the last control and Shift+Tab from the first close the panel onto its trigger', () => {
  const root = mount(<Host />);
  open(root);
  const apply = panel()!.querySelector<HTMLElement>('button')!;
  apply.focus();
  assert.equal(key(apply, 'Tab').defaultPrevented, true);
  assert.equal(panel(), null);
  assert.equal(document.activeElement, triggerIn(root));
  open(root);
  key(panel()!.querySelector('input')!, 'Tab', true);
  assert.equal(panel(), null);
  assert.equal(document.activeElement, triggerIn(root));
});

test('content inside the panel closes it through open, which is the controlled half', () => {
  const root = mount(<Host />);
  open(root);
  act(() => { panel()!.querySelector<HTMLElement>('button')!.click(); });
  assert.equal(panel(), null);
  assert.equal(triggerIn(root).getAttribute('aria-expanded'), 'false');
});
