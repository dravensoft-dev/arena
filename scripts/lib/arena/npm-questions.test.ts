import test from 'node:test';
import assert from 'node:assert/strict';
import { githubSlug, NPM_QUESTIONS, NPM_PAGES, renderQuestions } from './npm-questions.ts';

test('githubSlug lower-cases, drops punctuation and turns spaces into hyphens', () => {
  assert.equal(githubSlug('How do I install a package?'), 'how-do-i-install-a-package');
  assert.equal(githubSlug('## Declare your skin'), 'declare-your-skin');
  assert.equal(githubSlug('Why does TypeScript report TS2307 on a stylesheet import in React?'),
    'why-does-typescript-report-ts2307-on-a-stylesheet-import-in-react');
});

test('githubSlug keeps hyphens and underscores and the text inside inline code', () => {
  assert.equal(githubSlug('Does Angular need a Tailwind `@source` for Arena?'), 'does-angular-need-a-tailwind-source-for-arena');
  assert.equal(githubSlug('The `arena_find` tool, re-ranked'), 'the-arena_find-tool-re-ranked');
  assert.equal(githubSlug("Why might a package's latest version not match Arena's latest version?"),
    'why-might-a-packages-latest-version-not-match-arenas-latest-version');
});

test('githubSlug drops the colon and slashes of an arena:// heading', () => {
  assert.equal(githubSlug('Which arena:// resources does the server offer?'), 'which-arena-resources-does-the-server-offer');
});

test('every npm page has a manifest with a section and a row each', () => {
  for (const page of NPM_PAGES) {
    const sections = NPM_QUESTIONS[page] ?? [];
    assert.ok(sections.length > 0, `${page} has sections`);
    for (const { rows } of sections) assert.ok(rows.length > 0);
  }
});

test('the rendered table splits by section and links the file at its anchor', () => {
  const text = renderQuestions('contracts/NPM.md');
  assert.match(text, /^## What the package holds$/m);
  assert.match(text, /\| Question \| Answer \|/);
  assert.match(text, /\[contracts\.md → What arrives\]\(https:\/\/github\.com\/dravensoft-dev\/arena\/blob\/v\d+\.\d+\.\d+\/skills\/design\/references\/contracts\.md#what-arrives\)/);
  assert.match(text, /\[contracts\.md\]\(https:[^)]*#how-do-i-read-a-design-value\)/);
  assert.throws(() => renderQuestions('nothing.md'), /no question manifest/);
});

test('githubSlug reads link syntax inside a heading as its text', () => {
  assert.equal(githubSlug('The [stack page](./stack.md) answers'), 'the-stack-page-answers');
});

test('no page has two rows on one anchor', () => {
  for (const page of NPM_PAGES) {
    const anchors = (NPM_QUESTIONS[page] ?? []).flatMap(({ rows }) => rows.map((r) => `${r.file}#${githubSlug(r.heading)}`));
    assert.equal(new Set(anchors).size, anchors.length, page);
  }
});
