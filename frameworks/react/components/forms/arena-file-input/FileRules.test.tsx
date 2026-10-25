/* The rules that decide which files a file input holds, read through the paired module both layers
 * import. A layer that disagreed here would hold a different set of files from the same pick, so
 * every case names the boundary it pins: an extension, a wildcard type, the size limit itself,
 * one file against many, and what counts as the same file twice. */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaLocale } from '../../../Api.generated';
import { forgetArenaWarnings } from '../../../WarnOnce.ts';
import {
  type ArenaFileFacts, arenaAcceptTokens, arenaAccepts, arenaFileAnnouncement, arenaFileInputIds,
  arenaFileRejection, arenaFileSelection, arenaFileSize, arenaMergeFiles, arenaRejectionLines, arenaSameFile,
} from './FileRules.ts';

const file = (name: string, size = 10, type = '', lastModified = 1): ArenaFileFacts => ({ name, size, type, lastModified });
const pdf = file('scan.pdf', 100, 'application/pdf');
const png = file('photo.png', 200, 'image/png');
const txt = file('notes.txt', 30, 'text/plain');

const WORDS = {
  locale: 'en-GB',
  fileInputNone: 'No file chosen',
  fileInputCount: '{count} selected',
  fileInputTooLarge: '{name} is larger than {size}',
  fileInputWrongType: '{name} is not an accepted type',
  fileInputSurplus: '{name} was not added',
} as unknown as ArenaLocale;

test('accept splits on commas, trims and lowercases, and an absent one is no rule', () => {
  assert.deepEqual(arenaAcceptTokens('.PDF, image/* ,'), ['.pdf', 'image/*']);
  assert.deepEqual(arenaAcceptTokens(undefined), []);
  assert.deepEqual(arenaAcceptTokens(''), []);
});

test('an extension matches the end of the name whatever its case', () => {
  assert.equal(arenaAccepts(file('Scan.PDF'), ['.pdf']), true);
  assert.equal(arenaAccepts(file('scan.pdf.txt'), ['.pdf']), false);
  assert.equal(arenaAccepts(file('backup.tar.gz'), ['.tar.gz']), true);
});

test('a wildcard type matches its family, an exact type only itself, and no type matches neither', () => {
  assert.equal(arenaAccepts(png, ['image/*']), true);
  assert.equal(arenaAccepts(txt, ['image/*']), false);
  assert.equal(arenaAccepts(file('mystery.bin'), ['image/*']), false);
  assert.equal(arenaAccepts(pdf, ['application/pdf']), true);
  assert.equal(arenaAccepts(file('x.pdf', 1, 'application/pdfx'), ['application/pdf']), false);
});

test('no accept holds every type', () => {
  assert.equal(arenaAccepts(file('anything'), []), true);
});

test('the size limit is inclusive: a file of exactly maxSize is held and one byte more is refused', () => {
  const at = file('at.pdf', 100, 'application/pdf');
  const over = file('over.pdf', 101, 'application/pdf');
  const merged = arenaMergeFiles([], [at, over], { maxSize: 100, multiple: true });
  assert.deepEqual(merged.held, [at]);
  assert.deepEqual(merged.tooLarge, ['over.pdf']);
});

test('a file refused for its type is not also refused for its size', () => {
  const merged = arenaMergeFiles([], [file('huge.exe', 999, 'application/x-msdownload')],
    { accept: '.pdf', maxSize: 10, multiple: true });
  assert.deepEqual(merged.wrongType, ['huge.exe']);
  assert.deepEqual(merged.tooLarge, []);
});

test('without multiple a pick replaces the selection, and every accepted file after the first is surplus', () => {
  const merged = arenaMergeFiles([txt], [pdf, png], { multiple: false });
  assert.deepEqual(merged.held, [pdf]);
  assert.deepEqual(merged.surplus, ['photo.png']);
  assert.equal(merged.changed, true);
});

test('without multiple a pick that holds nothing leaves the selection as it was', () => {
  const merged = arenaMergeFiles([pdf], [txt], { accept: '.pdf', multiple: false });
  assert.deepEqual(merged.held, [pdf]);
  assert.equal(merged.changed, false);
  assert.deepEqual(merged.wrongType, ['notes.txt']);
});

test('without multiple the same file picked again holds the new object and reports no change', () => {
  const again = { ...pdf };
  const merged = arenaMergeFiles([pdf], [again], { multiple: false });
  assert.equal(merged.held[0], again);
  assert.equal(merged.changed, false);
});

test('with multiple a pick appends, in pick order, after what is held', () => {
  const merged = arenaMergeFiles([txt], [pdf, png], { multiple: true });
  assert.deepEqual(merged.held, [txt, pdf, png]);
  assert.equal(merged.changed, true);
  assert.deepEqual(merged.surplus, []);
});

test('the same name, size and modified time is one file, held once', () => {
  assert.equal(arenaSameFile(pdf, { ...pdf }), true);
  assert.equal(arenaSameFile(pdf, { ...pdf, lastModified: 2 }), false);
  assert.equal(arenaSameFile(pdf, { ...pdf, size: 101 }), false);
  const merged = arenaMergeFiles([pdf], [{ ...pdf }, png, { ...png }], { multiple: true });
  assert.deepEqual(merged.held.map((one) => one.name), ['scan.pdf', 'photo.png']);
});

test('a pick of files already held changes nothing and refuses nothing', () => {
  const merged = arenaMergeFiles([pdf], [{ ...pdf }], { multiple: true });
  assert.equal(merged.changed, false);
  assert.equal(arenaFileRejection(merged), null);
});

test('the selection is three parallel arrays in held order', () => {
  assert.deepEqual(arenaFileSelection([pdf, png]), {
    names: ['scan.pdf', 'photo.png'], sizes: [100, 200], types: ['application/pdf', 'image/png'],
  });
});

test('a rejection exists only when something was refused, and owns its arrays', () => {
  const merged = arenaMergeFiles([], [txt], { accept: '.pdf', multiple: true });
  const rejection = arenaFileRejection(merged);
  assert.deepEqual(rejection, { tooLarge: [], wrongType: ['notes.txt'], surplus: [] });
  assert.notEqual(rejection?.wrongType, merged.wrongType);
});

test('the ids follow the label, with the control id first and the label and text ids after it', () => {
  assert.deepEqual(arenaFileInputIds(undefined, 'Passport  scan'),
    { trigger: 'fi-passport-scan', label: 'fi-passport-scan-label', text: 'fi-passport-scan-text' });
  assert.deepEqual(arenaFileInputIds('upload', 'Passport scan'),
    { trigger: 'upload', label: 'upload-label', text: 'upload-text' });
});

test('a size is a number in the locale and an SI symbol, a thousand to the step', () => {
  assert.equal(arenaFileSize(0, 'en'), '0 B');
  assert.equal(arenaFileSize(999, 'en'), '999 B');
  assert.equal(arenaFileSize(1000, 'en'), '1 kB');
  assert.equal(arenaFileSize(1500, 'en'), '1.5 kB');
  assert.equal(arenaFileSize(5242880, 'en'), '5.2 MB');
  assert.equal(arenaFileSize(999950, 'en'), '1 MB');
  assert.equal(arenaFileSize(3e9, 'en'), '3 GB');
  assert.equal(arenaFileSize(5e12, 'en'), '5,000 GB');
  assert.equal(arenaFileSize(1500, 'es-ES'), '1,5 kB');
});

test('a locale Intl refuses warns once and writes the size in en', () => {
  forgetArenaWarnings();
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (message: string) => { warned.push(message); };
  try {
    assert.equal(arenaFileSize(1500, 'not a tag'), '1.5 kB');
    assert.equal(arenaFileSize(2500, 'not a tag'), '2.5 kB');
  } finally {
    console.warn = original;
    forgetArenaWarnings();
  }
  assert.equal(warned.length, 1);
  assert.match(warned[0] ?? '', /not a tag/);
});

test('each refusal is a sentence from the locale, sizes in the locale, in the order of the rejection', () => {
  const lines = arenaRejectionLines(WORDS, { tooLarge: ['big.pdf'], wrongType: ['a.exe'], surplus: ['b.pdf'] }, 5242880);
  assert.deepEqual(lines, ['big.pdf is larger than 5.2 MB', 'a.exe is not an accepted type', 'b.pdf was not added']);
  assert.deepEqual(arenaRejectionLines(WORDS, null, undefined), []);
});

test('the announcement says how many are held, or that none is, and then each refusal', () => {
  assert.equal(arenaFileAnnouncement(WORDS, 0, []), 'No file chosen');
  assert.equal(arenaFileAnnouncement(WORDS, 2, ['a.exe is not an accepted type']), '2 selected a.exe is not an accepted type');
});
