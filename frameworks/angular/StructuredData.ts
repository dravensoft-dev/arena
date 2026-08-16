import type { ArenaCrumb } from './Api.generated';

export function arenaBreadcrumbList(items: readonly ArenaCrumb[], origin?: string): string {
  const element = (crumb: ArenaCrumb, index: number) => {
    const entry: Record<string, unknown> = {
      '@type': 'ListItem', position: index + 1, name: crumb.label,
    };
    if (crumb.href) entry['item'] = origin ? new URL(crumb.href, origin).href : crumb.href;
    return entry;
  };
  return arenaEscapeJsonLd(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(element),
  }));
}

export function arenaEscapeJsonLd(json: string): string {
  return json.replace(/</g, '\\u003c');
}
