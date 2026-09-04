/* The picture Arena is recognised by, and its argument in one frame: one component, the contracts
 * that decide what it is, and the eight appearances a consuming project can give it. Every part is
 * the real thing rather than a drawing of one. The button carries the classes ArenaButton renders
 * and is painted by the stylesheet the packages ship; each copy is scoped to a style plugin out of
 * the catalogue, compiled here by the builder that writes the two plugins the site already loads,
 * so a skin whose radius or weight moves moves the picture. The eight palettes are the ones the
 * eight published benches wear, copied from their own arena.config.json, because a palette is the
 * half Arena never ships and a made-up one would be Arena inventing the thing it says it does not
 * carry. Nothing holds them to those files; the benches are another repository. */

import { block, PLUGIN_DIR } from '../../generate/arena/generate-tokens.ts';

export const HERO_SHEET = 'hero.css';
export const HERO_SOURCE = 'hero.html';
export const HERO_FILE = 'hero.png';
export const HERO_WIDTH = 1400;
export const HERO_HEIGHT = 860;

export const HERO_SKINS = [
  { name: 'booking', primary: '#424dac', content: '#ffffff' },
  { name: 'project-tracker', primary: '#6c4ee3', content: '#ffffff' },
  { name: 'language-course', primary: '#58cc02', content: '#ffffff' },
  { name: 'storefront', primary: '#9c431b', content: '#ffffff' },
  { name: 'photo-feed', primary: '#4a9eff', content: '#0b1a2b' },
  { name: 'observability-console', primary: '#ff9243', content: '#1a1206' },
  { name: 'document-workspace', primary: '#0b6bcb', content: '#ffffff' },
  { name: 'inbox', primary: '#a396ff', content: '#151033' },
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
.tally{position:absolute;left:474px;top:110px;width:792px;text-align:center;font-size:40px;
color:var(--mute)}
.tally b{font-family:var(--font-display);font-size:46px;color:var(--text-strong);font-weight:700}
.contract{position:absolute;left:88px;width:318px}
.contract.behaviour{top:198px}
.contract.api{top:426px}
.contract b{display:block;font-family:var(--font-mono);font-size:26px;color:var(--crimson);
letter-spacing:0.01em}
.contract span{display:block;margin-top:12px;font-size:24px;color:var(--mute);line-height:1.35}
svg.wires{position:absolute;inset:0;width:${HERO_WIDTH}px;height:${HERO_HEIGHT}px}
.bubble{position:absolute;left:414px;top:190px;width:912px;height:410px;
border:2px solid var(--mute);border-radius:50%}
.component{position:absolute;left:474px;top:232px;width:792px;text-align:center;
font-family:var(--font-mono);font-size:29px;color:var(--text-strong);letter-spacing:0.01em}
.split{position:absolute;left:474px;top:288px;width:792px;display:grid;
grid-template-columns:repeat(4,1fr);gap:26px 18px}
.slice{display:flex;flex-direction:column;align-items:center;gap:14px}
.slice .arena-button__root{height:70px;font-size:25px;white-space:nowrap}
.slice span{font-family:var(--font-mono);font-size:13px;color:var(--mute);white-space:nowrap}
.robot{position:absolute;left:498px;top:644px;font-size:132px;color:var(--mute);line-height:1}
.reads{position:absolute;left:664px;top:662px;font-size:30px;color:var(--mute);max-width:648px;
line-height:1.4;margin:0}
.reads b{color:var(--text-strong);font-weight:600}
.layers{position:absolute;left:88px;top:712px;display:flex;align-items:center;gap:44px;
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
<path d="M398 212 C 446 228, 436 292, 470 314" stroke="var(--crimson)" stroke-width="4"
marker-end="url(#tip)"></path>
<path d="M398 444 C 430 446, 448 446, 470 446" stroke="var(--crimson)" stroke-width="4"
marker-end="url(#tip)"></path>
<circle cx="666" cy="600" r="16" stroke="var(--mute)" stroke-width="2"></circle>
<circle cx="628" cy="634" r="11" stroke="var(--mute)" stroke-width="2"></circle>
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
