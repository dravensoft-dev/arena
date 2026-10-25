/* A render under the sprite provider ArenaIcon needs, and the symbols a markup draws as <weight>-<name>, e.g. bold-plus. */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArenaIconsProvider } from '../ArenaIcons.ts';

export const ICONS_HREF = '/icons-test.svg';

export function withIcons(node: React.ReactNode): React.ReactElement {
  return <ArenaIconsProvider href={ICONS_HREF}>{node}</ArenaIconsProvider>;
}

export function renderIcons(node: React.ReactNode): string {
  return renderToStaticMarkup(withIcons(node));
}

export function symbols(html: string): string[] {
  return [...html.matchAll(/<svg\b[^>]*><use href="[^"]*#ph-([a-z]+-[^"]+)"/g)].map((m) => m[1] ?? '');
}

export function domSymbols(root: ParentNode): string[] {
  return [...root.querySelectorAll('svg > use')].map((use) => (use.getAttribute('href') ?? '').split('#ph-')[1] ?? '');
}
