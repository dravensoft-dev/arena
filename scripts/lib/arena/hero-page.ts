/* The picture Arena is recognised by, and its argument in one frame: one component, the contracts
 * that decide what it is, and the three appearances a consuming project can give it. Every part is
 * the real thing rather than a drawing of one. The button carries the classes ArenaButton renders
 * and is painted by the stylesheet the packages ship; each copy is scoped to a style plugin out of
 * the catalogue, compiled here by the builder that writes the two plugins the site already loads,
 * so a skin whose radius or weight moves moves the picture. Two carry a palette of their own,
 * because a palette is the half Arena never ships: the middle one is Arena's, the course one is the
 * worked answer in arena-from-scratch/identity.example.html, and the third stands for a project
 * that has not written its config yet. */

import { block, PLUGIN_DIR } from '../../generate/arena/generate-tokens.ts';

export const HERO_SHEET = 'hero.css';
export const HERO_SOURCE = 'hero.html';
export const HERO_FILE = 'hero.png';
export const HERO_WIDTH = 1400;
export const HERO_HEIGHT = 820;

export const HERO_SKINS = [
  { name: 'storefront', primary: '#7b4fd6', content: '#ffffff' },
  { name: 'observability-console', primary: '', content: '' },
  { name: 'language-course', primary: '#58cc02', content: '#ffffff' },
];

export const skinClass = (name: string) => `arena-${name}`;

export async function heroStyles() {
  const blocks = [];
  for (const { name } of HERO_SKINS) {
    blocks.push(await block({
      selector: `.${skinClass(name)}`,
      source: 'plugin.tokens.json',
      dir: `${PLUGIN_DIR}/catalogue/${name}`,
    }));
  }
  return `${blocks.join('\n')}\n`;
}

const BUTTON = 'arena-button__root arena-button__root--variant-primary arena-button__root--size-lg';

const button = (label: string) =>
  `<button class="${BUTTON}" data-arena-part="button" type="button">${label}</button>`;

const LABEL = 'Publish';

const painted = (primary: string, content: string) => (primary === ''
  ? ''
  : ` style="--color-primary:${primary};--color-primary-content:${content}"`);

function slices() {
  return HERO_SKINS
    .map(({ name, primary, content }) =>
      `<div class="slice ${skinClass(name)}"${painted(primary, content)}>`
      + `${button(LABEL)}<span>${name}</span></div>`)
    .join('\n');
}

export function heroPage(drawn: number) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="intro/styles.css">
<link rel="stylesheet" href="frameworks/tailwind/consume/Components.generated.css">
<link rel="stylesheet" href="node_modules/@phosphor-icons/web/src/duotone/style.css">
<link rel="stylesheet" href="${HERO_SHEET}">
<style>
html,body{margin:0;padding:0}
body{width:${HERO_WIDTH}px;height:${HERO_HEIGHT}px;background:var(--bg);position:relative;
overflow:hidden;font-family:var(--font-body);color:var(--text-strong)}
.mark{position:absolute;left:88px;top:44px;display:flex;align-items:center;gap:24px}
.mark img{width:60px;height:60px}
.mark b{font-family:var(--font-display);font-size:82px;font-weight:700;letter-spacing:-0.02em}
.mark span{font-size:34px;color:var(--mute)}
.tally{position:absolute;left:494px;top:110px;width:746px;text-align:center;font-size:40px;
color:var(--mute)}
.tally b{font-family:var(--font-display);font-size:46px;color:var(--text-strong);font-weight:700}
.contract{position:absolute;left:88px;width:318px}
.contract.behaviour{top:198px}
.contract.api{top:426px}
.contract b{display:block;font-family:var(--font-mono);font-size:26px;color:var(--crimson);
letter-spacing:0.01em}
.contract span{display:block;margin-top:12px;font-size:24px;color:var(--mute);line-height:1.35}
svg.wires{position:absolute;inset:0;width:${HERO_WIDTH}px;height:${HERO_HEIGHT}px}
.bubble{position:absolute;left:444px;top:172px;width:852px;height:356px;
border:2px solid var(--mute);border-radius:50%}
.component{position:absolute;left:494px;top:238px;width:746px;text-align:center;
font-family:var(--font-mono);font-size:29px;color:var(--text-strong);letter-spacing:0.01em}
.split{position:absolute;left:494px;top:300px;width:746px;display:flex;
align-items:flex-start;gap:22px}
.slice{flex:1;display:flex;flex-direction:column;align-items:center;gap:22px}
.slice .arena-button__root{height:94px;font-size:33px;white-space:nowrap}
.slice span{font-family:var(--font-mono);font-size:18px;color:var(--mute);white-space:nowrap}
.robot{position:absolute;left:498px;top:596px;font-size:132px;color:var(--mute);line-height:1}
.reads{position:absolute;left:664px;top:614px;font-size:30px;color:var(--mute);max-width:648px;
line-height:1.4;margin:0}
.reads b{color:var(--text-strong);font-weight:600}
.layers{position:absolute;left:88px;top:664px;display:flex;align-items:center;gap:44px;
color:var(--mute)}
.layers div{display:flex;align-items:center;gap:16px;font-size:30px}
.layers svg{width:66px;height:66px;color:var(--mute)}
</style></head><body>

<div class="mark"><img src="assets/rotor-crimson.svg" alt=""><b>Arena</b><span>by Dravensoft</span></div>

<div class="tally"><b>+ ${drawn}</b> components</div>

<div class="contract behaviour"><b>contracts/behaviour</b>
<span>the roles it carries, the keys it answers, where focus lands</span></div>
<div class="contract api"><b>contracts/api</b>
<span>what a member is called, what it takes, what it means</span></div>

<svg class="wires" viewBox="0 0 ${HERO_WIDTH} ${HERO_HEIGHT}" fill="none">
<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--crimson)"></path></marker></defs>
<path d="M418 212 C 462 224, 456 290, 494 322" stroke="var(--crimson)" stroke-width="4"
marker-end="url(#tip)"></path>
<path d="M418 444 C 462 436, 456 392, 494 366" stroke="var(--crimson)" stroke-width="4"
marker-end="url(#tip)"></path>
<circle cx="666" cy="552" r="16" stroke="var(--mute)" stroke-width="2"></circle>
<circle cx="628" cy="586" r="11" stroke="var(--mute)" stroke-width="2"></circle>
</svg>

<div class="bubble"></div>
<div class="component">ArenaButton</div>
<div class="split">
${slices()}
</div>

<div class="layers">
<div><svg viewBox="-11.5 -10.23 23 20.46" fill="none" aria-hidden="true">
<circle r="2.05" fill="currentColor"></circle>
<g stroke="currentColor" stroke-width="1" fill="none">
<ellipse rx="11" ry="4.2"></ellipse>
<ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
<ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
</g></svg><span>React</span></div>
<div><svg viewBox="0 0 250 250" aria-hidden="true">
<path d="M125 30 31.9 63.2l14.2 123.1L125 230l78.9-43.7 14.2-123.1z" fill="none"
stroke="currentColor" stroke-width="13" stroke-linejoin="round"></path>
<path fill="currentColor" fill-rule="evenodd"
d="M125 62 74 182.6h20.4l10.9-27.3h39.4l10.9 27.3H176zm15.6 76.4h-31.2L125 100z"></path>
</svg><span>Angular</span></div>
</div>

<i class="robot ph-duotone ph-robot" aria-hidden="true"></i>
<p class="reads">The contracts say what it is. Your style plugin says what it looks like.
<b>Arena carries the language and never the skin.</b></p>

</body></html>
`;
}
