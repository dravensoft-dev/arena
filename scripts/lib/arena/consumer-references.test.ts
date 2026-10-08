import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerText, layerOfHeading } from './consumer-references.ts';

const PAGE = [
  '# Title', 'shared intro', '## What does React export?', 'reactOnly',
  '### Sub of react', 'reactSub', '## What does Angular export?', 'angularOnly',
  '### Sub of angular', 'angularSub', '## Both', 'shared body', '```', '## Angular in a fence', '```', 'tail',
].join('\n');

test('a heading names its layer, and one naming both or neither is shared', () => {
  assert.equal(layerOfHeading('In React'), 'react');
  assert.equal(layerOfHeading('The Angular package'), 'angular');
  assert.equal(layerOfHeading('React and Angular'), null);
  assert.equal(layerOfHeading('Which words'), null);
});

test('a layer reads its own sections and the shared ones, and never the other layer\'s', () => {
  const react = layerText(PAGE, 'react');
  assert.match(react, /reactOnly/);
  assert.match(react, /reactSub/);
  assert.match(react, /shared intro/);
  assert.match(react, /shared body/);
  assert.doesNotMatch(react, /angularOnly|angularSub/);
  const angular = layerText(PAGE, 'angular');
  assert.match(angular, /angularSub/);
  assert.doesNotMatch(angular, /reactOnly|reactSub/);
});

test('a heading inside a code fence does not open a section', () => {
  assert.match(layerText(PAGE, 'react'), /tail/);
});
