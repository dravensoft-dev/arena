# `arena-pagination`

Jumps between pages of a large set, the companion to a table or a long list. It renders a
*window* over the pages, never all of them, and elides the rest with a single `…`.

```html
<arena-pagination ariaLabel="Deployments" [page]="page()" [pageCount]="12"
                  (change)="page.set($event)" />
```

<!-- @api GENERATED from contracts/api/components/ArenaPagination.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `page*` | primitive | `number` |  | The current page, 1-based. |
| `pageCount*` | primitive | `number` |  | How many pages there are. Required, and guarded at runtime: an ArenaPagination with no page count renders a window over nothing. |
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: two paginated tables in one dashboard is a routine layout, and a shared constant name leaves them indistinguishable while satisfying the requirement mechanically. It was optional with a "ArenaPagination" default for one batch, which narrowed the gap rather than closing it: a name the caller omits is still the constant. Say what is being paged: "Deployments", not "Pages". |
| `change` | event | `number` |  | A page was chosen; carries the new 1-based page. Never fires for the current page, nor for a page outside 1..pageCount. |

<!-- @api end -->

`page`, `pageCount` and `ariaLabel` are all required, and the last two are **guarded at
runtime** rather than defaulted. `input.required` only proves something was bound:
`[ariaLabel]="row.title"` with an empty title, or `[pageCount]="0"`, both satisfy it and
neither is a pagination. So the component throws on each, a whitespace-only name, and a page
count that is not a whole number of at least one.

`ariaLabel` names the landmark, and nothing can derive it. Two paginated tables in one
dashboard is a routine layout, and a shared constant name leaves them indistinguishable while
satisfying `roles.label` mechanically. Say what is being paged, as in `"Deployments"`, not
`"Pages"`.

`change` carries the new 1-based page. It never fires for the page already shown, nor for a
page outside `1..pageCount`, so a handler can set its signal without re-checking either.

How wide the window is comes from the design layer, not from this component:
`--limit-pagination-siblings` says how many pages flank the current one, and the total width is
derived from it at the point of use. Both layers read the same token.

**Do / Don't**
- Place it under the table or list, aligned right or centred.
- For continuous feeds use "load more" or infinite scroll, not `arena-pagination`.
- Don't wrap it to add margin: the host is `display: contents`, so put the margin on a real
  element of your own around it.
- Don't hide the arrows at the ends. They are disabled there, which keeps the strip's width
  from changing as a consumer pages through it.

**By hand, in real Chromium**: `frameworks/angular/components/navigation/arena-pagination/ArenaPagination.demo.generated.html`,
served with `bun run demos`:
- Walk the 20-page strip to the middle and watch the window elide on **both** sides, then to
  each end and watch it elide on one side only.
- Tab through the strip. Every page and both arrows take focus in reading order, and each shows
  the browser's own focus ring; this component adds none of its own.
- At page 1 and at page 20 the outward arrow is dimmed and does not respond to a click, and the
  strip does not change width.
- The current page must be tellable from the others with the page desaturated, not by colour
  alone: it is the only filled surface in the row.
- With a screen reader, move by landmark: the two strips on the card announce as *Environments*
  and *Deployments*, never as two identical ones.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
