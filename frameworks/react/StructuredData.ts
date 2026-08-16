import type { ArenaCrumb } from './Api.generated';

export function arenaBreadcrumbList(items: readonly ArenaCrumb[], origin?: string): string {
  const listed = items.filter((crumb) => crumb.href);
  const element = (crumb: ArenaCrumb, index: number) => {
    const href = crumb.href as string;
    const id = origin ? new URL(href, origin).href : href;
    return { '@type': 'ListItem', position: index + 1, name: crumb.label, item: id };
  };
  return arenaEscapeJsonLd(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listed.map(element),
  }));
}

export function arenaEscapeJsonLd(json: string): string {
  return json.replace(/</g, '\\u003c');
}
