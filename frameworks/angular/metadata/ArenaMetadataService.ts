import { DOCUMENT, Injectable, InjectionToken, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface ArenaMetadataConfig {
  suffix?: string;
  separator?: string;
  origin?: string;
  robots?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export interface ArenaPageMetadata {
  title?: string;
  description?: string;
  robots?: string;
  image?: string;
  type?: string;
  canonical?: string;
  url?: string;
}

export const ARENA_ROBOTS_UNTIL_SAID = 'noindex';
export const ARENA_TITLE_SEPARATOR = ' · ';
export const ARENA_OG_TYPE = 'website';

export const ARENA_METADATA = new InjectionToken<ArenaMetadataConfig>('ARENA_METADATA', {
  providedIn: 'root',
  factory: () => ({}),
});

export const ARENA_NO_ORIGIN = 'metadata: a route is indexable and no `origin` is configured, so it'
  + ' publishes no canonical at all. Two addresses reaching the same page are then two pages, and'
  + ' whichever one is linked more wins. The origin is a value you pass rather than one read off'
  + ' window.location, because that one differs between a server render and the client that'
  + ' hydrates it. Pass it to provideArenaMetadata, or say `robots: "noindex"` and mean it.';

@Injectable({ providedIn: 'root' })
export class ArenaMetadataService {
  private readonly doc = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly documentTitle = inject(Title);
  private readonly config = inject(ARENA_METADATA);

  private warnedNoOrigin = false;

  apply(page: ArenaPageMetadata): void {
    const title = this.compose(page.title);
    const description = page.description ?? this.config.description;
    const canonical = this.absolute(page.canonical ?? page.url);
    const robots = page.robots ?? this.config.robots ?? ARENA_ROBOTS_UNTIL_SAID;

    if (title !== undefined) this.documentTitle.setTitle(title);

    this.named('description', description);
    this.named('robots', robots);
    this.warnOnMissingOrigin(robots, page);

    this.canonical(canonical);

    this.property('og:type', page.type ?? ARENA_OG_TYPE);
    this.property('og:title', title);
    this.property('og:description', description);
    this.property('og:url', canonical);
    this.property('og:image', page.image ?? this.config.image);
    this.property('og:site_name', this.config.siteName);
  }

  private warnOnMissingOrigin(robots: string, page: ArenaPageMetadata): void {
    if (this.warnedNoOrigin || this.config.origin !== undefined) return;
    if (robots.includes('noindex')) return;
    if (page.canonical === undefined && page.url === undefined) return;
    this.warnedNoOrigin = true;
    if (typeof console !== 'undefined') console.warn(`[arena] ${ARENA_NO_ORIGIN}`);
  }

  private compose(title: string | undefined): string | undefined {
    const { suffix } = this.config;
    const separator = this.config.separator ?? ARENA_TITLE_SEPARATOR;
    if (title === undefined || title.trim() === '') return suffix;
    return suffix === undefined ? title : `${title}${separator}${suffix}`;
  }

  private absolute(path: string | undefined): string | undefined {
    const { origin } = this.config;
    if (origin === undefined || path === undefined) return undefined;
    const cut = path.indexOf('#');
    const without = cut === -1 ? path : path.slice(0, cut);
    const root = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    return without.startsWith('/') ? `${root}${without}` : `${root}/${without}`;
  }

  private named(name: string, content: string | undefined): void {
    const selector = `name="${name}"`;
    if (content === undefined || content === '') { this.meta.removeTag(selector); return; }
    this.meta.updateTag({ name, content }, selector);
  }

  private property(property: string, content: string | undefined): void {
    const selector = `property="${property}"`;
    if (content === undefined || content === '') { this.meta.removeTag(selector); return; }
    this.meta.updateTag({ property, content }, selector);
  }

  private canonical(href: string | undefined): void {
    const head = this.doc.head;
    const found = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (href === undefined) { found?.remove(); return; }
    const link = found ?? head.appendChild(this.doc.createElement('link'));
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', href);
  }
}
