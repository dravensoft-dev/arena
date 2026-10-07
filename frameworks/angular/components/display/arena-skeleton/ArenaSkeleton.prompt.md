Arena loading placeholder. The placeholder reserves the layout the real content will occupy, so a table or a dashboard fills in rather than jumping. With `lines` absent it is one box in the shape its class names: `arena-skeleton-block` (the default), `arena-skeleton-line` or `arena-skeleton-circle`. With `lines` given it is a stack of that many text lines whatever its class, the last running short when there is more than one. The size is the properties `--arena-skeleton-width`, `--arena-skeleton-height` and `--arena-skeleton-radius`, set on a container of yours: write a length or a token expression, never a bare number. Each applies only where the shape has
something to override; see the table below.

```html
<arena-skeleton [lines]="3" />
<arena-skeleton class="arena-skeleton-circle" />
<arena-skeleton />
<div style="--arena-skeleton-width: calc(var(--sp-1) * 48); --arena-skeleton-height: calc(var(--sp-1) * 18); --arena-skeleton-radius: var(--r-lg)">
  <arena-skeleton />
</div>
```

<!-- @api GENERATED from contracts/api/components/ArenaSkeleton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `lines` | primitive | `number` |  | How many lines of text the placeholder stands in for. Absent, it is one box in the shape its class names; given, it is a stack of that many lines, the last running short when there is more than one. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`skeleton`](../../../../VOCABULARY.md#skeleton): `arena-skeleton-block` (default), `arena-skeleton-circle`, `arena-skeleton-line`. Write one as `class="arena-skeleton-circle"` on the component, or on a container whose components should all take it. Property: `--arena-skeleton-width` (and `--arena-skeleton-height`, `--arena-skeleton-radius`), set on a container of yours for a value no option names.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

| shape | `--arena-skeleton-width` | `--arena-skeleton-height` | `--arena-skeleton-radius` |
|---------|----------------|----------------|-----------------------|
| `lines` given (a stack) | applies | no (rows fixed) | no (rows fixed) |
| `arena-skeleton-line`   | applies | applies | no (fixed radius) |
| `arena-skeleton-block`  | applies | applies | applies |
| `arena-skeleton-circle` | the diameter when the height is not set | the diameter, and it wins over the width | no (always a circle) |

**Do / Don't**
- Match the placeholder to the shape of what is loading, a circle for an avatar, a
  block for a card. A placeholder that does not match the content is a layout jump
  with extra steps.
- `--arena-skeleton-radius` only affects `arena-skeleton-block`. Setting it for a circle, a line or a stack
  has no effect: a circle is always a perfect circle, and the rows stay a fixed
  small radius. A circle is one diameter, so its height wins over its width.
- Don't animate a skeleton that will be on screen for more than a moment or two. The shimmer stops entirely under `prefers-reduced-motion`, and it is decoration rather than a progress report. Use `<arena-progress-bar>` when there is real progress to report.
- Don't wrap a single `<arena-skeleton>` in a live region of your own, because it already
  carries `role="status"`. A set of several is a different case: see below.

**A set of siblings is several announcements, on purpose.** Every placeholder carries its own `role="status"` and `aria-label="Loading"` host bindings, with no exception for `circle`. A circle beside a text stack is two announcements, and twenty rows of the same pair are forty. Each placeholder announces its own pending replacement, and the component has no way to know where a set of them begins and ends. That repetition is between sibling `<arena-skeleton>` elements only. A stack given `lines` already renders as one row per line inside a single host, so its `lines` never repeat the announcement among themselves.
When several skeletons stand for one block of content, wrap the set yourself in a single
labelled region and hide the individual placeholders from the accessibility tree:

```html
<div role="status" aria-label="Loading profile">
  <div style="display:flex;gap:var(--sp-3);--arena-skeleton-height:calc(var(--sp-1) * 10);--arena-skeleton-width:calc(var(--sp-1) * 55)" aria-hidden="true">
    <arena-skeleton class="arena-skeleton-circle" />
    <arena-skeleton [lines]="2" />
  </div>
</div>
```

That turns two announcements into one and gives a screen-reader user a name for *what* is
loading rather than only that something is. Nothing about it is particular to this layer:
it is a composition decision you make per set.

**Words.** `skeletonLabel` is the name every placeholder announces.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
