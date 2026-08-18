Arena loading placeholder. It reserves the layout the real content will occupy, so a
table or a dashboard fills in rather than jumping. `variant="text"` with `lines`
renders a stack whose last line is short, the way a paragraph ends; `line`, `block`
and `circle` are single shapes. `width`, `height` and `radius` are CSS strings that
override the per-variant defaults; each applies only where the shape has
something to override; see the table below.

```html
<arena-skeleton variant="text" [lines]="3" />
<arena-skeleton variant="circle" />
<arena-skeleton variant="block" />
<arena-skeleton variant="block" width="12rem" height="72px" radius="var(--r-lg)" />
<arena-skeleton variant="circle" width="40px" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSkeleton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `variant` | enum | `ArenaSkeletonVariant` | `"block"` | The shape the placeholder reserves. |
| `width` | primitive | `string` |  | CSS width, e.g. "100%" or "12rem". Defaults to full width. |
| `height` | primitive | `string` |  | CSS height. Defaults per variant. For the `circle` variant a single diameter is what is wanted, so `height` wins over `width` when both are set. |
| `lines` | primitive | `number` | `3` | Number of rows when variant="text". The last runs short. |
| `radius` | primitive | `string` |  | CSS border radius. Defaults to a small token radius. |

<!-- @api end -->

| variant | `width`        | `height`       | `radius`             |
|---------|----------------|----------------|-----------------------|
| `text`  | applies (stack)| no (rows fixed)| no (rows fixed)      |
| `line`  | applies        | applies        | no (fixed radius)    |
| `block` | applies        | applies        | applies                |
| `circle`| diameter (`height` wins if both are set) | same diameter | no (always a circle) |

**Do / Don't**
- Match the placeholder to the shape of what is loading, a circle for an avatar, a
  block for a card. A placeholder that does not match the content is a layout jump
  with extra steps.
- `radius` only affects `variant="block"`. Passing it to `circle`, `line` or `text`
  has no effect, a circle is always a perfect circle, and the rows stay a fixed
  small radius.
- Don't animate a skeleton that will be on screen for more than a moment or two: the
  shimmer stops entirely under `prefers-reduced-motion`, and it is decoration, not a
  progress report. Use `<arena-progress-bar>` when there is real progress to report.
- Don't wrap a single `<arena-skeleton>` in a live region of your own, because it already
  carries `role="status"`. A set of several is a different case: see below.

**A set of siblings is several announcements, on purpose.** Every variant carries its
own `role="status"`/`aria-label="Loading"` host bindings, with no exception for `circle`,
so a circle beside a text stack is two announcements and twenty rows of the same pair are
forty, each placeholder announces its own pending replacement, and the component has no
way to know where a set of them begins and ends. That repetition is between sibling
`<arena-skeleton>` elements only: a `variant="text"` stack already renders as one row per
line inside a single host, so its `lines` never repeat the announcement among themselves.
When several skeletons stand for one block of content, wrap the set yourself in a single
labelled region and hide the individual placeholders from the accessibility tree:

```html
<div role="status" aria-label="Loading profile">
  <div style="display:flex;gap:var(--sp-3)" aria-hidden="true">
    <arena-skeleton variant="circle" width="40px" />
    <arena-skeleton variant="text" [lines]="2" width="220px" />
  </div>
</div>
```

That turns two announcements into one and gives a screen-reader user a name for *what* is
loading rather than only that something is. Nothing about it is particular to this layer:
it is a composition decision you make per set.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
