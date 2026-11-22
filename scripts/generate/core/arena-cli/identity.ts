/* arena check reads design/identity.html beside the config and names what it still leaves open.
 * A section is an element carrying data-identity-section, and a dashed block is an element
 * carrying data-arena-unfilled. Either attribute may be single-quoted or upper-case. A section
 * holding a block is named with its count, and a section of the template that is absent is named
 * missing. A project without the file gets no report, because the document is optional. */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { report } from './report.ts';
import type { Report } from './report.ts';

export const SECTION_ATTRIBUTE = 'data-identity-section';
export const UNFILLED_ATTRIBUTE = 'data-arena-unfilled';

export const IDENTITY_SECTIONS: readonly { id: string; title: string }[] = [
  { id: 'product', title: 'The product' },
  { id: 'palette', title: 'The palette' },
  { id: 'surfaces', title: 'The surfaces' },
  { id: 'type', title: 'The type' },
  { id: 'character', title: 'The character' },
  { id: 'air', title: 'The air' },
  { id: 'slots', title: 'Where the colour goes' },
  { id: 'states', title: 'The states' },
  { id: 'media', title: 'The media' },
  { id: 'page', title: 'The page' },
  { id: 'language', title: 'The language' },
  { id: 'theme', title: 'Switching the theme' },
  { id: 'preview', title: 'The preview' },
  { id: 'unsettled', title: 'What this document does not settle' },
];

const PAGE = 'design/identity.html';
const SECTION = new RegExp(`${SECTION_ATTRIBUTE}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'gi');
const UNFILLED = new RegExp(`(?:^|[\\s<"'])${UNFILLED_ATTRIBUTE}(?=[\\s=>/])`, 'gi');

export function identityProblems(html: string): string[] {
  const marks = [...html.matchAll(SECTION)].map((one) => ({ id: (one[1] ?? one[2] ?? '').toLowerCase(), at: one.index ?? 0 }));
  const unfilled = new Map<string, number>();
  marks.forEach((mark, i) => {
    const body = html.slice(mark.at, marks[i + 1]?.at ?? html.length);
    const count = body.match(UNFILLED)?.length ?? 0;
    unfilled.set(mark.id, (unfilled.get(mark.id) ?? 0) + count);
  });

  const held: string[] = [];
  const absent: string[] = [];
  for (const { id, title } of IDENTITY_SECTIONS) {
    const count = unfilled.get(id);
    if (count === undefined) {
      absent.push(`${PAGE}: the section "${title}" is missing. Keep every section of the template, and answer one the product does not need with why it does not apply.`);
    } else if (count > 0) {
      held.push(`${PAGE}: the section "${title}" still holds ${count} unfilled block${count === 1 ? '' : 's'}. Replace each dashed block with the decision it asks for.`);
    }
  }
  return [...held, ...absent];
}

export function identityStep(config: string): { reports: Report[] } {
  const path = join(dirname(config), 'design', 'identity.html');
  if (!existsSync(path)) return { reports: [] };
  return { reports: identityProblems(readFileSync(path, 'utf8')).map((line) => report('identity', line)) };
}
