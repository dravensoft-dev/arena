import test from 'node:test';
import assert from 'node:assert/strict';
import { isArenaOwnActivation } from './AnchorActivation.ts';

const OPERABLE = ['button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'tab', 'option', 'treeitem', 'slider', 'spinbutton', 'combobox', 'textbox', 'searchbox'];

function row(inner: string) {
  const container = document.createElement('div');
  container.innerHTML = inner;
  document.body.append(container);
  return container;
}

test('a press on any control role inside the target keeps to that control', () => {
  for (const role of OPERABLE) {
    const container = row(`<span role="${role}"><b>x</b></span>`);
    assert.equal(isArenaOwnActivation(container.querySelector('b'), container), false, `role="${role}" keeps its press`);
    container.remove();
  }
});

test('a structural role is not a control, so a press on a cell or a panel is the target\'s own', () => {
  for (const role of ['gridcell', 'row', 'tabpanel', 'article', 'progressbar']) {
    const container = row(`<span role="${role}"><b>x</b></span>`);
    assert.equal(isArenaOwnActivation(container.querySelector('b'), container), true, `role="${role}" is the row's`);
    container.remove();
  }
});
