# Assembling a page

How do I put a skip link, an app bar, a side nav, the main region and a footer on one page? Which landmark is each piece? How wide is the side rail, and when does it become a drawer? How does the document title follow the route? Read this when you write the frame that every screen of the application sits in. The composition inside the frame stays yours, and [`page.md`](./page.md) holds the pieces and the paint for it.

## What does the skeleton look like in React?

The `.arena-shell` holds the skip link, the app bar, a row that holds the rail and the main region, and a footer of your own. The row is the shell's one child that takes the slack, so it carries `.arena-shell__main`.

```tsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  ArenaAppBar, ArenaAppLogo, ArenaIconButton, ArenaMain, ArenaSideNav, ArenaSideNavItem, ArenaSkipLink,
} from '@dravensoft/arena-react';

const DESTINATIONS = [{ id: 'orders', href: '/orders' }, { id: 'cash', href: '/cash' }];

export function Shell({ openSearch }: { openSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = DESTINATIONS.find((d) => pathname === d.href || pathname.startsWith(`${d.href}/`))?.id;
  const go = (id: string) => navigate(DESTINATIONS.find((d) => d.id === id)!.href);

  return (
  <div className="arena-shell">
    <ArenaSkipLink label="Skip to content" />
    <ArenaAppBar
      brand={<Link to="/" aria-label="Andina, home"><ArenaAppLogo name="Andina" className="arena-size-sm" /></Link>}
      actions={<ArenaIconButton icon="ph-bold ph-magnifying-glass" label="Search" onActivate={openSearch} />} />
    <div className="arena-shell__main app-frame">
      <ArenaSideNav ariaLabel="Primary" active={active} onNav={(id) => go(id)}>
        <ArenaSideNavItem id="orders" icon="ph-bold ph-package" label="Orders" href="/orders" />
        <ArenaSideNavItem id="cash" icon="ph-bold ph-coins" label="Cash" href="/cash" />
      </ArenaSideNav>
      <ArenaMain>
        <Outlet />
      </ArenaMain>
    </div>
    <footer>© 2026 Andina</footer>
  </div>
  );
}
```

```css
.app-frame {
  display: grid;
  grid-template-columns: calc(var(--sp-1) * 64) minmax(0, 1fr);
}
```

The content of the `brand` slot is the project's own, its router link included, so the rule against wrapping a component in a router link does not reach it. `.app-frame` is a class of your own on markup you wrote, so the vocabulary rules for Arena components do not reach it. A page without a rail puts `.arena-shell__main` on a `<div>` around `ArenaMain`, as [`ArenaMain.prompt.md`](../../../frameworks/react/components/layout/arena-main/ArenaMain.prompt.md) shows. The classes of the shell are in [`style.md`](./style.md#the-column-the-page-sits-in), and the active id comes from your router as [`ArenaSideNav.prompt.md`](../../../frameworks/react/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) shows.

## What does the skeleton look like in Angular?

The pieces and their order are the same, written as `arena-*` elements. The active id comes from a signal over the router, which the side-nav prompt calls the `NavigationEnd` bridge.

```ts
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  ArenaAppBar, ArenaAppLogo, ArenaBrand, ArenaMain, ArenaSideNav, ArenaSideNavItem, ArenaSkipLink,
} from '@dravensoft/arena-angular';

const DESTINATIONS = [{ id: 'orders', href: '/orders' }, { id: 'cash', href: '/cash' }];

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet, ArenaSkipLink, ArenaAppBar, ArenaBrand, ArenaAppLogo, ArenaSideNav, ArenaSideNavItem, ArenaMain],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  readonly url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  readonly active = computed(() => {
    const url = this.url().split(/[?#]/)[0];
    const isAt = (href: string) => href === '/' ? url === '/' : url === href || url.startsWith(`${href}/`);
    return DESTINATIONS.find((d) => isAt(d.href))?.id;
  });

  go(id: string) { this.router.navigateByUrl(DESTINATIONS.find((d) => d.id === id)!.href); }
}
```

```html
<div class="arena-shell">
  <arena-skip-link label="Skip to content" />
  <arena-app-bar>
    <a brand routerLink="/" aria-label="Andina, home"><arena-app-logo name="Andina" class="arena-size-sm" /></a>
  </arena-app-bar>
  <div class="arena-shell__main app-frame">
    <arena-side-nav ariaLabel="Primary" [active]="active()" (nav)="go($event)">
      <arena-side-nav-item id="orders" icon="ph-bold ph-package" label="Orders" href="/orders" />
      <arena-side-nav-item id="cash" icon="ph-bold ph-coins" label="Cash" href="/cash" />
    </arena-side-nav>
    <arena-main>
      <router-outlet />
    </arena-main>
  </div>
  <footer>© 2026 Andina</footer>
</div>
```

The `.app-frame` rule is the one in the React section, written in the global stylesheet. The `brand` marker is the `ArenaBrand` directive, and a template that leaves it out of `imports` drops the slot without a report. `routerLink` goes on the anchor of the brand slot and never on `arena-side-nav-item`, which navigates through `(nav)`. [`ArenaSideNav.prompt.md`](../../../frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) says why.

## Which landmark is each piece?

| Piece | Element it renders | Landmark | What to know |
|---|---|---|---|
| `ArenaSkipLink` | an anchor | none | Goes first in the shell, above everything it skips. The link points at `ArenaMain` by an id Arena writes on both sides, so a page without `ArenaMain` has a link to nowhere. |
| `ArenaAppBar` | a `<header>` | banner | One per page. The `nav` slot is yours, so the `<nav aria-label>` you put there is a second navigation landmark beside the rail's. |
| `ArenaSideNav` | a `<nav>` in React, and in Angular the host with `role="navigation"` | navigation | Requires `ariaLabel`, and the name stays unique on the page. Do not wrap it in a `<nav>` of your own. |
| `ArenaMain` | a `<main>` | main | One per page and unnamed. The `<main>` takes programmatic focus, which is what lets the skip link move the reader. |
| `ArenaSiteFooter` | a `<footer>` | contentinfo | One per page. A `<footer>` nested inside a section is not this landmark. |

The footer in the samples is your own element, and `ArenaSiteFooter` draws columns and a note when the page needs them. Write one header and one footer at the top level of the page. A second banner or a second footer makes the landmark useless to a reader who navigates by it.

## Where does focus go after a route change?

**After a navigation, focus `ArenaMain` through `ARENA_MAIN_ID`, and pass `preventScroll: true`.** Both snippets assume a router that restores the scroll position, so drop `preventScroll` when yours does not. The first load is not a navigation, so the effect skips it.

```tsx
// React: a component inside the router, keyed on the pathname
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { ARENA_MAIN_ID } from '@dravensoft/arena-react';

export function FocusMainOnNavigation() {
  const { pathname } = useLocation();
  const last = useRef(pathname);
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    document.getElementById(ARENA_MAIN_ID)?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
```

React Router is allowed and untested: no Arena test exercises a router. In Next.js the same effect keys on `usePathname()` from `next/navigation`.

```ts
// Angular: add to the skeleton's App class, keyed on the path
import { inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, skip } from 'rxjs';
import { ARENA_MAIN_ID } from '@dravensoft/arena-angular';

export class App {
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0]),
      distinctUntilChanged(),
      skip(1),
    ).subscribe(() => {
      document.getElementById(ARENA_MAIN_ID)?.focus({ preventScroll: true });
    });
  }
}
```

**What a screen reader hears after that move.** `ArenaMain` renders a `<main>` with `tabindex="-1"` and the id `ARENA_MAIN_ID`, in both layers, and gives it no `aria-label` or `aria-labelledby`. The landmark is announced by its role, with no name of its own. The document title is set by your framework in React and by the route's `title` in Angular, which `provideArenaMetadata` composes with its suffix, as [`seo.md`](./seo.md) says. Arena writes no live region for a route change. A project that wants the new page announced adds an element of its own with `role="status"` and `arena-sr-only`, then sets its text to the page title after each navigation.

## How wide is the rail?

The collapsed rail sizes itself. The width is a control's height plus a step of padding on each side, and it holds in an `auto` column and in a definite one alike.

The expanded rail fills the column it is given. In a column of `auto` it takes the width of its content, so its labels decide the width. In a definite column it fills that column to the pixel. Arena names no rail width, so the project gives the column its width in the grid of its own row, as `grid-template-columns: <width> minmax(0, 1fr)`. The column in the samples above is `calc(var(--sp-1) * 64)`, a width of the project's choosing.

Use `auto` when the rail should be as wide as its longest label, or when one rule must serve both states. Use a definite width when the content column must not move as labels change.

## When does the rail become a drawer?

At the `md` breakpoint, and the viewport decides it. Put `max-md:hidden` on an element of your own around the rail and `md:hidden` on one around the drawer, which is right at the first paint and in a server's HTML. A class on the rail itself is not in the vocabulary. Both exist in the page, so branch on the viewport helper instead when the drawer is heavy. The helper is `useArenaViewportBelow('md')` in React and `arenaViewportBelow('md')` in Angular, both in [`exports.md`](./exports.md). The next section covers the drawer and its button, and [the one after it](#how-much-air-sits-inside-arenamain) covers the column around the page. [React](../../../frameworks/react/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) and [Angular](../../../frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) show both ways under "As a rail".

## What goes in the drawer?

**Arena ships `ArenaSheet` for it, and the button that opens it is yours.** The sheet is a panel on one edge that takes no focus, draws no scrim and locks no scroll. `arena-placement-start` puts it on the start edge, `title` names it, and Escape inside it reports through `onClose`. Put the rail inside it as an `ArenaSideNav`.

The opener is a `<button type="button">` of your own. The button carries `aria-expanded`, the state of the drawer, and `aria-controls`, the id of an element of yours around the sheet. The sheet draws nothing while closed, so that element is empty until it opens. Wrap the pair in `md:hidden`, as the section above says.

```tsx
import { useState } from 'react';
import { ArenaSheet, ArenaSideNav, ArenaSideNavItem } from '@dravensoft/arena-react';

export function NavDrawer({ active, onNav }: { active?: string; onNav: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" className="arena-interactive arena-focus" aria-expanded={open} aria-controls="nav-drawer"
        onClick={() => setOpen(!open)}>Menu</button>
      <div id="nav-drawer">
        <ArenaSheet open={open} title="Menu" className="arena-placement-start" dismissible onClose={() => setOpen(false)}>
          <ArenaSideNav ariaLabel="Primary" active={active} onNav={(id) => { onNav(id); setOpen(false); }}>
            <ArenaSideNavItem id="orders" icon="ph-bold ph-package" label="Orders" href="/orders" />
            <ArenaSideNavItem id="cash" icon="ph-bold ph-coins" label="Cash" href="/cash" />
          </ArenaSideNav>
        </ArenaSheet>
      </div>
    </div>
  );
}
```

The Angular drawer is the same pair written as elements, with the open state in a signal.

```ts
import { Component, input, output, signal } from '@angular/core';
import { ArenaSheet, ArenaSideNav, ArenaSideNavItem } from '@dravensoft/arena-angular';

@Component({
  selector: 'app-nav-drawer',
  imports: [ArenaSheet, ArenaSideNav, ArenaSideNavItem],
  template: `
    <div class="md:hidden">
      <button type="button" class="arena-interactive arena-focus" [attr.aria-expanded]="open()" aria-controls="nav-drawer"
        (click)="open.set(!open())">Menu</button>
      <div id="nav-drawer">
        <arena-sheet [open]="open()" title="Menu" class="arena-placement-start" dismissible (close)="open.set(false)">
          <arena-side-nav ariaLabel="Primary" [active]="active()" (nav)="go($event)">
            <arena-side-nav-item id="orders" icon="ph-bold ph-package" label="Orders" href="/orders" />
            <arena-side-nav-item id="cash" icon="ph-bold ph-coins" label="Cash" href="/cash" />
          </arena-side-nav>
        </arena-sheet>
      </div>
    </div>`,
})
export class NavDrawer {
  readonly active = input<string>();
  readonly navigate = output<string>();
  protected readonly open = signal(false);

  protected go(id: string) {
    this.navigate.emit(id);
    this.open.set(false);
  }
}
```

The sheet moves no focus on open or on close, so the opener keeps focus until the reader tabs into the panel.

## How much air sits inside ArenaMain?

**None.** `ArenaMain` draws `display: block` and nothing else, so no padding or width comes from it. The column a page sits in is `.arena-band` on an element of yours inside it, which carries the width and the gutter and no block air. The space above and below the content is a `padding-block` of yours on the `--sp-*` scale.

```tsx
import { ArenaMain } from '@dravensoft/arena-react';
import { Outlet } from 'react-router';

export function AppMain() {
  return (
    <ArenaMain>
      <div className="arena-band app-page">
        <Outlet />
      </div>
    </ArenaMain>
  );
}
```

```css
.app-page {
  padding-block: var(--sp-8);
}
```

In Angular the same `div` goes inside `<arena-main>` around the `<router-outlet />`, and the rule goes in the global stylesheet. [`style.md`](./style.md#the-column-the-page-sits-in) names the band and the scale.

## How does the document title follow the route?

Each layer answers on its own. Angular's `title` on a route keeps its meaning when `provideArenaMetadata` is installed, and gains the suffix and the description beside it. Arena ships no head writer for React, so the title comes from your framework, or from a `<title>` rendered in the route on React 19. [`seo.md`](./seo.md) holds both, with the exports.
