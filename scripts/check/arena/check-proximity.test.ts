/* The pure half of the proximity gate: the classes each part is rebuilt with, the page in each
 * load order, and the verdict on a measurement. The browser half is the gate's run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { partClasses, pageHtml, verdict } from './check-proximity.ts';
import { readManifests } from './check-measured-box.ts';

test('a part is rebuilt with the classes its slot resolves to by default', () => {
  const classes = partClasses(readManifests().values());
  assert.match(classes.get('button') ?? '', /\barena-button__root\b/);
  assert.match(classes.get('card.body') ?? '', /\barena-card__body\b/);
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
