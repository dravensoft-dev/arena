/* The router in skills/design/SKILL.md answers each question with one page, and a page that
 * answers a neighbouring question points at that page instead of saying the answer again. A
 * pointer repeats the owner when one of its sentences of eight words or more is the owner's. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', '..', '..');
const SKILL = 'skills/design/SKILL.md';
const REF = 'skills/design/references/';
const read = (path: string) => readFileSync(join(root, path), 'utf8');

type Door = { question: string; owner: string; values?: string[]; pointers: string[]; ownerHeadings?: string[] };

const DOORS: Door[] = [
  { question: 'What do I paint the floor of my page with?', owner: `${REF}page.md`, pointers: [] },
  { question: 'What do I paint my own markup with?', owner: `${REF}tokens/markup/index.md`, pointers: [`${REF}page.md`] },
  { question: 'What is a role or a token called, what does it ask, and what is its value?', owner: `${REF}tokens/index.md`, pointers: [] },
  {
    question: 'How much air goes between two components, and what column does the page sit in?',
    owner: `${REF}style.md`,
    pointers: [`${REF}tokens/markup/space-and-layout.md`],
    ownerHeadings: ['The column the page sits in', 'The air between two components'],
  },
  {
    question: 'How much does a region hold, and what do compact and comfortable change?',
    owner: `${REF}style.md`,
    values: [`${REF}tokens/scales/density.md`],
    pointers: [`${REF}tokens/scales/density.md`, 'frameworks/VOCABULARY.md'],
    ownerHeadings: ['Density'],
  },
  { question: 'How do I make Arena look like my own product?', owner: `${REF}style-kernel.md`, pointers: [`${REF}color-slots/index.md`] },
  { question: 'What changes the look?', owner: `${REF}style-kernel.md`, pointers: [`${REF}color-slots/index.md`] },
  { question: 'What colours a group of components?', owner: `${REF}color-slots/index.md`, pointers: [`${REF}style-kernel.md`] },
];

const rows = () => {
  const table = (read(SKILL).split('## Where each question is answered')[1] ?? '').split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Question') && !line.startsWith('|---'));
  return table.map((line) => {
    const cells = line.split(/ \| /);
    return { question: (cells[0] ?? '').replace(/^\| /, ''), read: cells.slice(1).join(' | ') };
  });
};

const pagesOf = (cell: string, from: string) => [...new Set([...cell.matchAll(/\]\(([^)]+\.md)(#[^)]*)?\)/g)].map((m) => normalize(join(dirname(from), m[1] ?? ''))))];

const sentencesOf = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '')
  .split(/(?<=[.!?])\s+/).map((one) => one.replace(/\s+/g, ' ').trim()).filter((one) => one.split(' ').length >= 8);

const sectionOf = (path: string, headings: string[] | undefined) => {
  const text = read(path);
  if (!headings) return text;
  return headings.map((heading) => (text.split(new RegExp(`^## ${heading}\\n`, 'm'))[1] ?? '').split(/^## /m)[0] ?? '').join('\n');
};

test('each question the router asks names one page', () => {
  const table = rows();
  for (const door of DOORS) {
    const row = table.find((one) => one.question === door.question);
    assert.ok(row, `${door.question}: the router has no such row`);
    if (!row) continue;
    const named = pagesOf(row.read, SKILL).filter((page) => !(door.values ?? []).includes(page));
    assert.deepEqual(named, [door.owner], `${door.question}: the row names ${named.join(', ')}`);
    for (const pointer of door.pointers) {
      const links = pagesOf(read(pointer), pointer);
      assert.ok(links.includes(door.owner), `${door.question}: ${pointer} holds no link to ${door.owner}`);
      const owned = new Set(sentencesOf(sectionOf(door.owner, door.ownerHeadings)));
      const repeated = sentencesOf(read(pointer)).filter((one) => owned.has(one));
      assert.deepEqual(repeated, [], `${door.question}: ${pointer} repeats the owner's answer`);
    }
  }
});

test('the locale page shows a whole product in every field', () => {
  const page = read(`${REF}locale.md`);
  const blocks = [...page.matchAll(/```(tsx|ts)\n([\s\S]*?)```/g)].filter((one) => (one[2] ?? '').includes('satisfies Required<ArenaLocale>'));
  assert.equal(blocks.length, 2, 'locale.md holds one whole-locale block per layer');
  assert.ok((blocks[0]?.[2] ?? '').includes('@dravensoft/arena-react'), 'the first whole-locale block imports the React package');
  assert.ok((blocks[1]?.[2] ?? '').includes('@dravensoft/arena-angular'), 'the second whole-locale block imports the Angular package');
});
