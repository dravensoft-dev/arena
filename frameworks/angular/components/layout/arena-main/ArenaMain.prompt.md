Arena main, the page's principal landmark and nothing else. Standalone, `OnPush`. The host is
taken out of layout with `display: contents`, so the `<main>` inside it is what a parent lays out
and `<arena-main>` itself occupies nothing.

```html
<arena-skip-link label="Skip to content" />
<app-header />
<arena-main>
  <router-outlet />
</arena-main>
```

<!-- @api GENERATED from contracts/api/components/ArenaMain.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content` | slot |  |  | What the page is for, once the furniture around it is taken away. It is optional and unguarded rather than required: a router that has not resolved its route yet renders nothing, and a landmark that threw during that frame would fail on the ordinary case rather than on a mistake. |

<!-- @api end -->

**It draws no box, and that is the whole design.** The recipe carries one declaration, `display:
block`, which is what a `<main>` already is. No width, no padding, no grid, no maximum: a page
whose main landmark is swapped for a plain `<div>` looks identical. Where things go stays the
container you own, which is what `PACKAGE.md` says and what this deliberately does not reopen.
What it says is only what the region IS.

**One per page.** A landmark that appears twice is two answers to "where does the content start",
and a reader jumping by landmark gets the first one. It carries no name for the same reason
`arena-app-bar` carries none and `arena-side-nav` requires one: a page has one main and a reader
reaches it by its role, while a page has several navs and each needs saying which.

**It is focusable programmatically, and that is not decoration.** The `<main>` takes
`tabindex="-1"`, which keeps it out of the tab order and lets focus be sent to it. An anchor
pointing at a container the platform will not focus scrolls the page and leaves focus exactly
where it was, so the next Tab continues from the nav the reader was trying to escape. That is the
failure that makes most skip links look like they work, and it is why the requirement sits on the
landmark rather than on the link.

**Its id is a constant Arena writes, `arena-main`.** Nothing is coordinated at the call site
because a page has one main: `arena-skip-link` points at that id and this writes it. Write your
own anchor against the same id if you need a second route in.

**Do / Don't**
- **Do** put it around the routed content, not around the shell. A `<main>` that contains the
  header and the nav names the whole page, which names nothing.
- **Do** give it the layout it needs from the container around it, or from an `arena-grid` inside.
- **Don't** reach for it as a wrapper for a section of a page. That is `arena-section`, which
  names a region and draws the heading for it.
- **Don't** write a second one for a route that renders inside another. The landmark is the
  shell's, once.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-main/ArenaMain.demo.generated.html`:
- The page looks the same with the component and with a plain `<div>` in its place.
- The accessibility pane shows one `main` landmark.
- Clicking a link to `#arena-main` moves focus into the region, which the focus ring on the next
  Tab is what proves: focus continues from inside the main rather than from the nav.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
