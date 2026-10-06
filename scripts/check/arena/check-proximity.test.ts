/* The pure half of the proximity gate: the classes each part is rebuilt with, the page in each
 * load order, and the verdict on a measurement. The browser half is the gate's run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { partClasses, partData, pageHtml, verdict, markupVerdict, witnessManifests } from './check-proximity.ts';
import { readManifests } from './check-measured-box.ts';

test('a part is rebuilt with the classes its slot resolves to by default', () => {
  const classes = partClasses(readManifests().values());
  assert.match(classes.get('button') ?? '', /\barena-button__root\b/);
  assert.match(classes.get('card.body') ?? '', /\barena-card__body\b/);
});

test('a part is rebuilt with the data its slot carries by default, so a default variant still paints', () => {
  const data = partData(readManifests().values());
  assert.equal(data.get('button')?.['data-arena-variant'], undefined, 'emphasis is a class an adopter writes and no longer a variant');
  assert.equal(data.get('button')?.['data-arena-size'], undefined, 'size is a class an adopter writes and no longer a variant');
});

test('the two orders put the vocabulary after the components, then before them', () => {
  const sheets = { components: ['c.css'], vocabulary: ['v.css'] };
  const first = pageHtml('components-first', '<p></p>', 'w{}', sheets);
  const second = pageHtml('vocabulary-first', '<p></p>', 'w{}', sheets);
  assert.ok(first.indexOf('c.css') < first.indexOf('v.css'));
  assert.ok(second.indexOf('v.css') < second.indexOf('c.css'));
});

test('a measure that holds is no problem, and one that does not names the case, the layer and the order', () => {
  const kase = { name: 'n', container: '', measure: { width: 'container' as const }, react: null, angular: null };
  assert.equal(verdict(kase, 'react', 'components-first', { width: 480, container: 480, property: '' }), null);
  assert.match(verdict(kase, 'angular', 'vocabulary-first', { width: 90, container: 480, property: '' }) ?? '',
    /n \(angular, vocabulary-first\): the subject is 90px wide and the case expects the container's 480px/);
  const own = { ...kase, measure: { width: 'own' as const } };
  assert.match(verdict(own, 'react', 'components-first', { width: 480, container: 480, property: '' }) ?? '', /expects its own width/);
  const mark = { ...kase, measure: { property: '--arena-witness-mark', value: '1' } };
  assert.match(verdict(mark, 'react', 'components-first', { width: 0, container: 0, property: '0' }) ?? '', /--arena-witness-mark is "0"/);
});

test('a measure that names other parts holds only when every one of them has the value, and fails on none', () => {
  const kase = { name: 's', container: '', measure: { property: 'height', value: '40px', others: { button: '32px' } }, react: null, angular: null };
  const at = (others: Record<string, string[]>) => verdict(kase, 'react', 'components-first', { width: 0, container: 0, property: '40px', others });
  assert.equal(at({ button: ['32px', '32px'] }), null);
  assert.match(at({ button: ['32px', '40px'] }) ?? '', /height is "40px" on a button and the case expects "32px"/);
  assert.match(at({ button: [] }) ?? '', /carries no button beside the subject/);
  assert.match(verdict(kase, 'react', 'components-first', { width: 0, container: 0, property: '32px', others: { button: ['32px'] } }) ?? '', /height is "32px" on the subject/);
});

test('a markup case holds when every recorded property matches, names the property that does not, and refuses an unrecorded one', () => {
  const kase = { name: 'stack', html: '<div class="arena-stack" data-proximity-subject></div>', expect: { display: 'flex', 'row-gap': '16px' } };
  assert.equal(markupVerdict(kase, 'components-first', { display: 'flex', 'row-gap': '16px' }), null);
  assert.match(markupVerdict(kase, 'vocabulary-first', { display: 'block', 'row-gap': '16px' }) ?? '',
    /stack \(vocabulary-first\): display is "block" and the case expects "flex"/);
  const open = { ...kase, expect: { display: null } };
  assert.match(markupVerdict(open, 'components-first', { display: 'flex' }) ?? '', /unrecorded.*\{"display":"flex"\}/);
});

test('an equal case holds when the two properties resolve alike at the subject', () => {
  const kase = { name: 'r', html: '<p data-proximity-subject></p>', equal: { '--step-label': '--dz-text-2xs' } };
  assert.equal(markupVerdict(kase, 'components-first', { '--step-label': '10px', '--dz-text-2xs': '10px' }), null);
  assert.match(markupVerdict(kase, 'components-first', { '--step-label': '11px', '--dz-text-2xs': '10px' }) ?? '',
    /--step-label is "11px" and --dz-text-2xs is "10px"/);
});

test('a root class lands on the html element', () => {
  assert.match(pageHtml('components-first', '<div></div>', '', { components: [], vocabulary: [] }, 'arena-compact'),
    /<html class="arena-compact">/);
});

test('a witness part with an options subset answers as an object, and a bare part answers by name', () => {
  const family = { family: 'w', reach: 'box' as const, description: 'd', default: 'arena-w-a', variants: { 'arena-w-a': '[--arena-w-mark:1]', 'arena-w-b': '[--arena-w-mark:2]' },
    parts: ['card', { part: 'button', options: ['arena-w-a'] }] };
  const [card, button] = witnessManifests(family);
  assert.deepEqual(card!.answers, ['w']);
  assert.deepEqual(button!.answers, [{ family: 'w', options: ['arena-w-a'], default: 'arena-w-a' }]);
});
