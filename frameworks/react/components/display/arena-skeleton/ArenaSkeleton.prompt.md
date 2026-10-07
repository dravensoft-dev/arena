Loading placeholder for asynchronous data (H1). Use it in tables and dashboards while the response arrives; respect `prefers-reduced-motion`. With `lines` absent it is one box in the shape its class names: `arena-skeleton-block` (the default), `arena-skeleton-line` or `arena-skeleton-circle`. With `lines` given it is a stack of that many text lines whatever its class, the last running short when there is more than one. The size is the properties `--arena-skeleton-width`, `--arena-skeleton-height` and `--arena-skeleton-radius`, set on a container of yours.

```tsx
{loading
  ? <ArenaSkeleton lines={4} />
  : <Article data={data} />}

<div role="status" aria-label="Loading profile">
  <div style={{display:'flex',gap:'var(--sp-3)','--arena-skeleton-height':'calc(var(--sp-1) * 10)','--arena-skeleton-width':'calc(var(--sp-1) * 55)'}} aria-hidden="true">
    <ArenaSkeleton className="arena-skeleton-circle" />
    <ArenaSkeleton lines={2} />
  </div>
</div>
```

<!-- @api GENERATED from contracts/api/components/ArenaSkeleton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `lines` | primitive | `number` |  | How many lines of text the placeholder stands in for. Absent, it is one box in the shape its class names; given, it is a stack of that many lines, the last running short when there is more than one. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`skeleton`](../../../../VOCABULARY.md#skeleton): `arena-skeleton-block` (default), `arena-skeleton-circle`, `arena-skeleton-line`. Write one as `className="arena-skeleton-circle"` on the component, or on a container whose components should all take it. Property: `--arena-skeleton-width` (and `--arena-skeleton-height`, `--arena-skeleton-radius`), set on a container of yours for a value no option names.

<!-- @answers end -->

**Do / Don't**
- Reproduce the shape of the real content (same approximate height/width) to avoid layout shift on load.
- The size properties take a length or a token expression, not a bare number; write `calc(var(--sp-1) * 10)`, not `40`.
- `--arena-skeleton-radius` only affects `arena-skeleton-block`. A circle is always a perfect circle and a line or a stack keeps
  a fixed small radius, so setting it for either has no effect.
- A circle's diameter is `--arena-skeleton-height`, else `--arena-skeleton-width`. A stack reads only the width.
- A stack given `lines` is one `<ArenaSkeleton>` and one announcement no matter how many `lines` it
  renders: the first example above (`lines={4}`) is a single `role="status"`, not four. The
  repetition below is between sibling `<ArenaSkeleton>` elements, never within one stack.
- Don't wrap a *single* `<ArenaSkeleton>` in a live region of your own. The placeholder already carries `role="status"`, so a wrapper adds a second announcement of the same wait. The wrapper in
  the example above is for a **set** of siblings, which is the different case below.
- Every `<ArenaSkeleton>` announces itself, through `role="status"` and `aria-label="Loading"`. Several siblings are that many announcements, whether they are a circle beside a text stack or several independent skeletons in a list. The component cannot know where one set of placeholders begins and ends. A set standing for one block of content should be announced once, by you. Wrap it in a single `role="status" aria-label="…"` naming *what* is loading. Mark the container holding the individual skeletons `aria-hidden="true"`, so their own announcements never reach the accessibility tree.
- Don't leave it up indefinitely: if the load fails, replace it with `ArenaErrorState`, not an eternal skeleton.

**Words.** `skeletonLabel` is the name every placeholder announces.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
