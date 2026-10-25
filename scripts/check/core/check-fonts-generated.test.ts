import test from 'node:test';
import assert from 'node:assert/strict';
import { facesIn, checkFonts, askGoogle, urlProblems, exampleProblems, remoteFonts } from './check-fonts-generated.ts';
import { licenceFile, licenceUrl, recordProblems } from '../../generate/core/fetch-fonts.ts';

test('facesIn reads every font-family named inside an @font-face block', () => {
  const css = `@font-face {\n  font-family: 'Archivo';\n  font-weight: 400;\n}\n\n@font-face {\n  font-family: 'Archivo';\n  font-weight: 700;\n}\n`;
  assert.deepEqual([...facesIn(css)], ['Archivo']);
});

test('facesIn reads double-quoted family names too', () => {
  const css = `@font-face {\n  font-family: "Spline Sans Mono";\n  font-weight: 400;\n}\n`;
  assert.deepEqual([...facesIn(css)], ['Spline Sans Mono']);
});

test('a declared family with a face passes', () => {
  const faces = new Set(['Archivo', 'Familjen Grotesk']);
  assert.deepEqual(checkFonts(['Archivo', 'Familjen Grotesk'], faces), []);
});

test('a declared family with no face fails, naming the family and the fix', () => {
  const faces = new Set(['Archivo']);
  const errs = checkFonts(['Archivo', 'Inter'], faces);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /"Inter"/);
  assert.match(errs[0] ?? '', /no @font-face/);
  assert.match(errs[0] ?? '', /bun scripts\/generate\/core\/fetch-fonts\.ts/);
});

test('a generic fallback like system-ui is never in the declared list, so it is never required to have a face', () => {

  const faces = new Set(['Archivo']);
  assert.deepEqual(checkFonts(['Archivo'], faces), []);
});

test('multiple missing families each get their own message', () => {
  const errs = checkFonts(['Archivo', 'Inter', 'Comic Sans'], new Set());
  assert.equal(errs.length, 3);
});

const FONTS = {
  display: { family: 'Archivo', src: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;900' },
  body: { family: 'Familjen Grotesk', src: 'https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;900' },
};

test('a font URL Google answers is asked for exactly once, and 200 is no problem', async () => {
  const asked: string[] = [];
  const answers = await askGoogle(FONTS, async (url) => {
    asked.push(url);
    return { status: 200 };
  });
  assert.deepEqual(asked, [FONTS.display.src, FONTS.body.src]);
  assert.deepEqual(urlProblems(answers), []);
});

test('a URL Google refuses names the role, the URL and the status, because that is the consumer\'s build failing', async () => {
  const answers = await askGoogle(FONTS, async (url) => ({ status: url.includes('Familjen') ? 400 : 200 }));
  const problems = urlProblems(answers);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /fonts\.body/);
  assert.match(problems[0] ?? '', /answers 400/);
  assert.match(problems[0] ?? '', /Familjen\+Grotesk/);
});

test('a request that never completes is a skip, never a pass and never a failure', async () => {
  const answers = await askGoogle(FONTS, async () => { throw new Error('getaddrinfo ENOTFOUND'); });
  assert.deepEqual(urlProblems(answers), []);
  assert.equal(answers.filter((a) => a.unreachable !== undefined).length, 2,
    'an outage must stay distinguishable from an answer, or a dead network silently reads as a pass');
});

test('asking about no font at all is a failure rather than a vacuous pass', async () => {
  const problems = urlProblems(await askGoogle({}, async () => ({ status: 200 })));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /0 font URL/);
});

const RECORD = {
  'archivo.woff2': { family: 'Archivo', weights: [400, 900], sha256: 'a' },
  'archivo.OFL.txt': { family: 'Archivo', sha256: 'b' },
};

test('the licence of each family is fetched from the google/fonts tree and kept beside its binary', () => {
  assert.equal(licenceUrl('Familjen Grotesk'), 'https://raw.githubusercontent.com/google/fonts/main/ofl/familjengrotesk/OFL.txt');
  assert.equal(licenceFile('familjen-grotesk.woff2'), 'familjen-grotesk.OFL.txt');
});

test('a licence text is held to its recorded sha256 like a binary, and an unrecorded one is a problem', () => {
  const hashes: Record<string, string> = { 'archivo.woff2': 'a', 'archivo.OFL.txt': 'changed', 'other.OFL.txt': 'c' };
  const problems = recordProblems(RECORD, Object.keys(hashes), (file) => hashes[file] ?? '');
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /archivo\.OFL\.txt: sha256 changed, recorded b/);
  assert.match(problems[1] ?? '', /other\.OFL\.txt: present in assets\/fonts\/ and not recorded/);
  assert.deepEqual(recordProblems(RECORD, ['archivo.woff2'], (file) => (file === 'archivo.woff2' ? 'a' : '')).length, 1, 'a recorded licence that is gone is a problem');
});

test('every family of the example config names a binary and a licence in the record', () => {
  const fonts = { display: { family: 'Archivo', src: './fonts/archivo.woff2' }, body: { family: 'Inter', src: './fonts/inter.woff2' } };
  const problems = exampleProblems(fonts, RECORD);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /fonts\.body points at \.\/fonts\/inter\.woff2, which assets\/fonts\/Fonts\.generated\.json does not record/);
  assert.deepEqual(exampleProblems({ display: { family: 'Archivo', src: './fonts/archivo.woff2' } }, { 'archivo.woff2': RECORD['archivo.woff2'] }).length, 1, 'no licence beside it');
});

test('only the URLs of the example config are asked for', () => {
  const asked = remoteFonts({ display: { family: 'A', src: './fonts/a.woff2' }, body: { family: 'B', src: 'https://fonts.googleapis.com/css2?family=B' } });
  assert.deepEqual(Object.keys(asked), ['body']);
});
