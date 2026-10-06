/* The tree a layer's render is held to, and the HTML the gate builds from it, asserted on plain
 * objects since scripts/ runs without a DOM. A tree keeps what the cascade reads and nothing
 * else: tag, part, boundary, a display: contents host, vocabulary classes and the text that
 * gives a control its own width. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, treeHtml, readProximity, vocabularyClasses, type NodeLike } from './proximity.ts';

const node = (tag: string, attrs: Record<string, string> = {}, children: NodeLike[] = [], text = ''): NodeLike => ({
  nodeType: 1, tagName: tag.toUpperCase(), getAttribute: (n) => attrs[n] ?? null, hasAttribute: (n) => n in attrs,
  childNodes: [...(text ? [{ nodeType: 3, textContent: text } as NodeLike] : []), ...children],
});

test('a render keeps parts, boundaries, hosts, vocabulary classes and text, and prunes the rest', () => {
  const host = node('arena-button', { class: 'arena-fill ng-star-inserted', style: 'display: contents' }, [
    node('button', { 'data-arena-part': 'button', 'data-arena-boundary': '', class: 'arena-button__root' }, [node('i', { class: 'ph' })], 'Save'),
  ]);
  assert.deepEqual(normalize(node('div', {}, [host]), new Set(['arena-fill'])), {
    tag: 'div', children: [{ tag: 'arena-button', contents: true, class: 'arena-fill', children: [
      { tag: 'button', part: 'button', boundary: true, text: 'Save' },
    ] }],
  });
});

test('the gate rebuilds a part with its slot classes and the subject marked', () => {
  const html = treeHtml({ tag: 'div', class: 'arena-fit', children: [{ tag: 'button', part: 'button', boundary: true, class: 'arena-fill', text: 'Save', subject: true }] },
    (part) => (part === 'button' ? 'arena-button__root' : ''));
  assert.equal(html, '<div class="arena-fit"><button data-arena-part="button" data-arena-boundary="" data-proximity-subject="" class="arena-button__root arena-fill">Save</button></div>');
});

test('a part also takes the data attributes its slot carries, which are what select a variant', () => {
  const html = treeHtml({ tag: 'button', part: 'button', text: 'Save' },
    () => 'arena-button__root', () => ({ 'data-arena-size': 'md', 'data-arena-sticky': '' }));
  assert.equal(html, '<button data-arena-part="button" class="arena-button__root" data-arena-size="md" data-arena-sticky="">Save</button>');
});

test('the fixture has cases, each with a measure, and the vocabulary includes the witness family it declares', () => {
  const { families, cases } = readProximity();
  assert.ok(cases.length > 0, 'the fixture declares no case; an empty sweep is a failure');
  assert.ok(vocabularyClasses(families).has('arena-witness-on'));
});
