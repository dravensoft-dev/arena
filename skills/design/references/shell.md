# Assembling a page

How do I put a skip link, an app bar, a side nav, the main region and a footer on one page? Which landmark is each piece? How wide is the side rail, and when does it become a drawer? How does the document title follow the route? Read this when you write the frame that every screen of the application sits in. The composition inside the frame stays yours, and [`page.md`](./page.md) holds the pieces and the paint for it.

## What does the skeleton look like in React?

The `.arena-shell` holds the skip link, the app bar, a row that holds the rail and the main region, and a footer of your own. The row is the shell's one child that takes the slack, so it carries `.arena-shell__main`.

```tsx
<div className="arena-shell">
  <ArenaSkipLink label="Skip to content" />
  <ArenaAppBar
    brand={<Link to="/" aria-label="Andina, home"><ArenaAppLogo name="Andina" className="arena-size-sm" /></Link>}
    actions={<ArenaIconButton icon="ph-bold ph-magnifying-glass" label="Search" onClick={openSearch} />} />
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
```

```css
.app-frame {
  display: grid;
  grid-template-columns: calc(var(--sp-1) * 64) minmax(0, 1fr);
}
```

`.app-frame` is a class of your own on markup you wrote, so the vocabulary rules for Arena components do not reach it. A page without a rail puts `.arena-shell__main` on a `<div>` around `ArenaMain`, as [`ArenaMain.prompt.md`](../../../frameworks/react/components/layout/arena-main/ArenaMain.prompt.md) shows. The classes of the shell are in [`style.md`](./style.md#the-column-the-page-sits-in), and the active id comes from your router as [`ArenaSideNav.prompt.md`](../../../frameworks/react/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) shows.

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

## How wide is the rail?

The collapsed rail sizes itself. The width is a control's height plus a step of padding on each side, and it holds in an `auto` column and in a definite one alike.

The expanded rail fills the column it is given. In a column of `auto` it takes the width of its content, so its labels decide the width. In a definite column it fills that column to the pixel. Arena names no rail width, so the project gives the column its width in the grid of its own row, as `grid-template-columns: <width> minmax(0, 1fr)`. The column in the samples above is `calc(var(--sp-1) * 64)`, a width of the project's choosing.

Use `auto` when the rail should be as wide as its longest label, or when one rule must serve both states. Use a definite width when the content column must not move as labels change.

## When does the rail become a drawer?

At the `md` breakpoint, and the viewport decides it. Put `max-md:hidden` on an element of your own around the rail and `md:hidden` on one around the drawer, which is right at the first paint and in a server's HTML. A class on the rail itself is not in the vocabulary. Both exist in the page, so branch on the viewport helper instead when the drawer is heavy. The helper is `useArenaViewportBelow('md')` in React and `arenaViewportBelow('md')` in Angular, both in [`exports.md`](./exports.md). The drawer, the button that opens it and the page column around it are yours. [React](../../../frameworks/react/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) and [Angular](../../../frameworks/angular/components/navigation/arena-side-nav/ArenaSideNav.prompt.md) show both ways under "As a rail".

## How does the document title follow the route?

Each layer answers on its own. Angular's `title` on a route keeps its meaning when `provideArenaMetadata` is installed, and gains the suffix and the description beside it. Arena ships no head writer for React, so the title comes from your framework, or from a `<title>` rendered in the route on React 19. [`seo.md`](./seo.md) holds both, with the exports.
