/* The question tables of the npm pages. A page carries an intro and a table of questions whose
 * answers link into skills/design/ at the tag of the release, because the prose lives there and
 * nowhere else. This file is the one manifest of those questions; the generator emits it between
 * the markers a person placed, and `check:skills` holds each row to a file and a heading that
 * exist and to a file the skill links. A row of a layer's page names no other layer.
 * githubSlug gives GitHub's anchor for a heading: link syntax read as its text, lower case, punctuation other than - and _
 * dropped, spaces to -. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot as root } from './repo-root.ts';
import { REPOSITORY } from './site-pages.ts';

export type Row = { question: string; file: string; heading: string };
export type Section = { section: string; rows: Row[] };

export const REACT_PAGE = 'frameworks/react/PACKAGE.md';
export const ANGULAR_PAGE = 'frameworks/angular/PACKAGE.md';
export const CONTRACTS_PAGE = 'contracts/NPM.md';
export const MCP_PAGE = 'mcp/NPM.md';
export const NPM_PAGES = [REACT_PAGE, ANGULAR_PAGE, CONTRACTS_PAGE, MCP_PAGE];

export const githubSlug = (heading: string) => heading
  .replace(/^#+\s*/, '')
  .trim()
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
  .replace(/\s/g, '-');

const ref = (file: string) => (file.startsWith('frameworks/') ? file : `skills/design/${file}`);
const row = (question: string, file: string, heading: string): Row => ({ question, file: ref(file), heading });

const layerSections = (layer: 'React' | 'Angular'): Section[] => {
  const react = layer === 'React';
  const only = (rows: Row[], when: boolean) => (when ? rows : []);
  return [
    {
      section: 'Install',
      rows: [
        row('How do I install the package?', 'references/install.md', 'How do I install a package?'),
        row('What comes down with the package?', 'references/install.md', `What comes down with the ${layer} package?`),
        row('What is an icon in Arena, and what do I install for it?', 'references/install.md', 'What is an icon in Arena?'),
        row('How do I import the stylesheets?', 'references/install.md', `How do I import the stylesheets in ${layer}?`),
        ...only([
          row('Why does TypeScript report TS2307 on a stylesheet import?', 'references/install.md', 'Why does TypeScript report TS2307 on a stylesheet import in React?'),
          row('How do I pass a logo to ArenaAppLogo?', 'references/install.md', 'How do I pass a logo to ArenaAppLogo in React?'),
        ], react),
        row('What is a component, its class and its stylesheet called?', 'references/install.md', `One name everywhere in ${layer}`),
        row('Why do class names and stylesheet names carry the component name?', 'references/install.md', 'Why do class names and stylesheet names carry the component name?'),
        row('Which bundlers, runtimes and framework versions does it work with?', 'references/stack.md', 'The repertoire'),
      ],
    },
    {
      section: 'Declare your skin',
      rows: [
        row('How do I declare a palette, a font or a style plugin in arena.config.json, and which colour keys does a palette take?', 'references/config.md', 'Declare your skin'),
        row('How do I make Arena look like my product and not like Dravensoft?', 'references/style-kernel.md', 'Making Arena look like your product'),
        row('Where does the appearance come from, and what does a palette leave undecided?', 'references/style-kernel.md', 'Where the appearance actually comes from'),
      ],
    },
    {
      section: 'Build to production',
      rows: [
        row('How do I send only the component stylesheets my screens render?', 'references/config.md', 'Build to production'),
        row('What counts as drawn when I send only some component stylesheets?', 'references/config.md', `What counts as drawn in ${layer}?`),
        row('What can the component stylesheet scan not send?', 'references/config.md', 'What can a scan not send?'),
        row('What does the arena-to-prod command write?', 'references/arena-to-prod.md', 'What does the command write?'),
        row('Which flags does arena-to-prod take?', 'references/arena-to-prod.md', 'Which flags does it take?'),
        row('When does arena-to-prod report and when does it refuse?', 'references/arena-to-prod.md', 'Does the command report or refuse?'),
        row('How do I run arena-to-prod before every build?', 'references/arena-to-prod.md', `How do I run it before every build in ${layer}?`),
        row('Why does arena-to-prod have an audit?', 'references/arena-to-prod.md', 'Why does the audit script exist?'),
        row('What does the arena-to-prod audit read in my sources?', 'references/arena-to-prod.md', 'What does the audit read in each layer?'),
      ],
    },
    {
      section: 'The page and the layout',
      rows: [
        row('Where does my spacing and sizing go?', 'references/style.md', 'Where does my spacing and sizing go?'),
        row(`How do I size and space a component in ${layer}?`, 'references/style.md', `What does that mean in ${layer}?`),
        row('What do I do when I wrap a component to size it?', 'references/style.md', 'What do I do when I wrap a component to size it?'),
        row('How wide is the page column, and how much air goes between components?', 'references/style.md', 'The column the page sits in'),
        row('What do I paint the page and my own markup with?', 'references/page.md', 'Which colour your own markup takes'),
        row('Why is my page white under a dark palette?', 'references/page.md', 'The floor, and Arena does not paint it'),
        row('Which class makes a component wider, smaller, filled or quieter?', 'frameworks/VOCABULARY.md', 'The vocabulary'),
        row('Which screens is Arena for, and which markup is mine?', 'references/media-register.md', 'When the markup is yours'),
      ],
    },
    {
      section: 'At runtime: theme, locale and confirmations',
      rows: [
        row('How do I switch palettes?', 'references/theme.md', `How do I switch palettes in ${layer}?`),
        row('How do I avoid a flash of the wrong palette on first paint?', 'references/theme.md', 'How do I avoid a flash on first paint?'),
        row('Why does the first-paint snippet read the media query?', 'references/theme.md', 'Why does the snippet read the media query?'),
        row('Which words does Arena draw itself?', 'references/locale.md', 'Which words does Arena draw itself?'),
        row('In what order does a word resolve?', 'references/locale.md', 'In what order does a word resolve?'),
        row('How do I set the locale?', 'references/locale.md', `How do I set the locale in ${layer}?`),
        row('How do I raise a confirmation from code?', 'references/exports.md', `How do I raise a confirmation from code in ${layer}?`),
        ...only([
          row('How do I bind reactive forms to Arena controls?', 'references/exports.md', 'How do I bind Angular reactive forms to Arena controls?'),
        ], !react),
      ],
    },
    {
      section: 'What else the package ships',
      rows: [
        row('Does every export carry a compatibility promise?', 'references/exports.md', 'Does every export carry a compatibility promise?'),
        row('What does the package export besides components?', 'references/exports.md', `What does the ${layer} package export besides components?`),
        ...only([
          row('Which projection markers must I import?', 'references/exports.md', 'Which Angular projection markers must I import?'),
          row('What does the head entry point export?', 'references/seo.md', 'What does the Angular head entry point export?'),
          row('Which sheet re-bases the CDK overlay?', 'references/stylesheets.md', 'Which sheet re-bases the Angular CDK overlay?'),
          row('Does my project need a Tailwind source for Arena?', 'references/stylesheets.md', 'Does Angular need a Tailwind `@source` for Arena?'),
        ], !react),
        row('Does the package write my head, and does the app have to be found?', 'references/seo.md', 'Arena writes the head in one layer, and the router is why'),
        row('Which stylesheets does the package ship?', 'references/stylesheets.md', 'The stylesheets each package ships'),
        row('In which order do the two halves of the stylesheet import?', 'references/stylesheets.md', 'Which order do the halves import in?'),
        row('What does Arena ship at all, and how much of it do I take?', 'references/surface.md', 'Everything Arena ships'),
        row('Where does Arena stop shipping, and what is left to me?', 'references/surface.md', 'Where Arena stops'),
      ],
    },
    {
      section: 'Building with an agent',
      rows: [
        row('How does an agent start on Arena?', 'SKILL.md', 'Which job is this?'),
        row('Where does each question go?', 'SKILL.md', 'Where each question is answered'),
        row('What does an agent decide before the first screen?', 'references/cold-start.md', 'Before the first screen'),
        row('What may I build this with, and how sure is Arena about each answer?', 'references/stack.md', 'What you may choose'),
        row('What does each layer require?', 'references/stack.md', 'What each layer requires'),
        row('How do I serve Arena to my editor?', 'references/mcp.md', 'Serving Arena to your editor over MCP'),
      ],
    },
    versionsSection,
  ];
};

const versionsSection: Section = {
  section: 'Versions and licence',
  rows: [
    row('Why might a package version differ from the Arena version?', 'references/versioning.md', "Why might a package's latest version not match Arena's latest version?"),
    row('Which licence does Arena carry?', 'references/versioning.md', 'Which licence does Arena carry?'),
  ],
};

export const NPM_QUESTIONS: Record<string, Section[]> = {
  [REACT_PAGE]: layerSections('React'),
  [ANGULAR_PAGE]: layerSections('Angular'),
  [CONTRACTS_PAGE]: [
    {
      section: 'What the package holds',
      rows: [
        row('What does the contracts package arrive with?', 'references/contracts.md', 'What arrives'),
      ],
    },
    {
      section: 'Reading the contracts',
      rows: [
        row('How do I read a design value?', 'references/contracts.md', 'How do I read a design value?'),
        row('How do I read a component contract?', 'references/contracts.md', 'How do I read a component contract?'),
      ],
    },
    {
      section: 'Versions and licence',
      rows: [
        row('How do I version the contracts package?', 'references/contracts.md', 'How do I version the contracts package?'),
        ...versionsSection.rows,
      ],
    },
  ],
  [MCP_PAGE]: [
    {
      section: 'Install and connect',
      rows: [
        row('How do I install the server?', 'references/mcp.md', 'How do I install the server?'),
        row('How do I point my editor at the server?', 'references/mcp.md', 'How do I point my editor at the server?'),
      ],
    },
    {
      section: 'What the server serves',
      rows: [
        row('Which tools does the server offer?', 'references/mcp.md', 'Which tools does the server offer?'),
        row('Which arena:// resources does the server offer?', 'references/mcp.md', 'Which arena:// resources does the server offer?'),
        row('What does arena_check read?', 'references/mcp.md', 'What does arena_check read?'),
        row('What if the server and my package differ in version?', 'references/mcp.md', 'What if the server and my package differ in version?'),
        row('What is the Arena MCP server not?', 'references/mcp.md', 'What is the server not?'),
      ],
    },
    {
      section: 'Versions and licence',
      rows: versionsSection.rows,
    },
  ],
};

export function releaseVersion(base = root) {
  const plugin = JSON.parse(readFileSync(join(base, '.claude-plugin/plugin.json'), 'utf8')) as { version: string };
  return plugin.version;
}

const cell = (text: string) => text.replace(/\|/g, '\\|');

export function renderQuestions(page: string, base = root, manifest = NPM_QUESTIONS) {
  const sections = manifest[page];
  if (!sections) throw new Error(`npm-questions: no question manifest for ${page}`);
  const tag = `${REPOSITORY}/blob/v${releaseVersion(base)}`;
  return sections.map(({ section, rows }) => [
    `## ${section}`,
    '',
    '| Question | Answer |',
    '| --- | --- |',
    ...rows.map(({ question, file, heading }) => {
      const name = file.split('/').at(-1) ?? file;
      const text = heading === question ? name : `${name} → ${heading}`;
      return `| ${cell(question)} | [${cell(text)}](${tag}/${file}#${githubSlug(heading)}) |`;
    }),
  ].join('\n')).join('\n\n');
}
