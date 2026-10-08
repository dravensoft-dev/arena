/* The tree a layer's render is held to, and the HTML the gate builds from it, asserted on plain
 * objects since scripts/ runs without a DOM. A tree keeps what the cascade reads and nothing
 * else: tag, part, boundary, a display: contents host, vocabulary classes and the text that
 * gives a control its own width. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, treeHtml, DESTRUCTIVE, TONE, readProximity, vocabularyClasses, type NodeLike } from './proximity.ts';

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

test('a surface and a channel binding are kept, and any other inline style is pruned', () => {
  const scrim = node('div', { 'data-arena-part': 'dialog.scrim', 'data-arena-surface': 'floating', 'data-arena-open': '', style: 'width: 480px' });
  const face = node('span', { 'data-arena-part': 'avatar', style: '--arena-size-avatar: var(--arena-size-face, var(--size-md-face)); width: 3px' });
  assert.deepEqual(normalize(node('div', {}, [scrim, face]), new Set()), {
    tag: 'div', children: [
      { tag: 'div', part: 'dialog.scrim', open: true, surface: 'floating' },
      { tag: 'span', part: 'avatar', vars: '--arena-size-avatar:var(--arena-size-face,var(--size-md-face))' },
    ],
  });
});

test('the gate writes the surface and the binding back as attributes', () => {
  const html = treeHtml({ tag: 'span', part: 'avatar', open: true, surface: 'floating', vars: '--arena-size-avatar:var(--arena-size-face)', contents: true }, () => '');
  assert.equal(html, '<span data-arena-part="avatar" data-arena-open="" data-arena-surface="floating" style="display: contents; --arena-size-avatar:var(--arena-size-face)"></span>');
});

test('a destructive part keeps its flag, and the gate writes it over the default the slot carries', () => {
  const button = node('button', { 'data-arena-part': 'button', 'data-arena-destructive': 'true' });
  const quiet = node('button', { 'data-arena-part': 'button', 'data-arena-destructive': 'false' });
  const bare = node('button', { 'data-arena-part': 'button', 'data-arena-destructive': '' });
  assert.deepEqual(normalize(node('div', {}, [button, quiet, bare]), new Set()), {
    tag: 'div', children: [{ tag: 'button', part: 'button', destructive: true }, { tag: 'button', part: 'button' }, { tag: 'button', part: 'button', destructive: true }],
  });
  const html = treeHtml({ tag: 'button', part: 'button', destructive: true }, () => '', () => ({ [DESTRUCTIVE]: 'false' }));
  assert.equal(html, '<button data-arena-part="button" data-arena-destructive="true"></button>');
});

test('a part keeps a tone that states something, and the gate writes it over the default the slot carries', () => {
  const badge = node('span', { 'data-arena-part': 'badge', 'data-arena-tone': 'success' });
  const quiet = node('span', { 'data-arena-part': 'badge', 'data-arena-tone': 'neutral' });
  assert.deepEqual(normalize(node('div', {}, [badge, quiet]), new Set()), {
    tag: 'div', children: [{ tag: 'span', part: 'badge', tone: 'success' }, { tag: 'span', part: 'badge' }],
  });
  const html = treeHtml({ tag: 'span', part: 'badge', tone: 'success' }, () => '', () => ({ [TONE]: 'neutral' }));
  assert.equal(html, '<span data-arena-part="badge" data-arena-tone="success"></span>');
});
