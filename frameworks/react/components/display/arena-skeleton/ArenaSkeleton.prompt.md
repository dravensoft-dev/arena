Loading placeholder for asynchronous data (H1). Use it in tables and dashboards while the response arrives; respect `prefers-reduced-motion`.

```tsx
{loading
  ? <ArenaSkeleton variant="text" lines={4} />
  : <Article data={data} />}

<div role="status" aria-label="Loading profile">
  <div style={{display:'flex',gap:'var(--sp-3)'}} aria-hidden="true">
    <ArenaSkeleton variant="circle" height="40px" />
    <ArenaSkeleton variant="text" lines={2} width="220px" />
  </div>
</div>
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

**Do / Don't**
- Reproduce the shape of the real content (same approximate height/width) to avoid layout shift on load.
- `width`/`height`/`radius` are CSS strings, not numbers; write `width="40px"`, not `width={40}`.
- `radius` only affects `variant="block"`: a circle is always a perfect circle and text/line rows keep
  a fixed small radius, so passing `radius` to either has no effect.
- A `variant="text"` stack is one `<ArenaSkeleton>` and one announcement no matter how many `lines` it
  renders: the first example above (`lines={4}`) is a single `role="status"`, not four. The
  repetition below is between sibling `<ArenaSkeleton>` elements, never within one stack.
- Don't wrap a *single* `<ArenaSkeleton>` in a live region of your own, because it already carries
  `role="status"`, so a wrapper adds a second announcement of the same wait. The wrapper in
  the example above is for a **set** of siblings, which is the different case below.
- Every `<ArenaSkeleton>` announces itself (`role="status"`, `aria-label="Loading"`), so several
  siblings, a circle beside a text stack, several independent skeletons in a list, are that
  many announcements, because the component cannot know where one set of placeholders begins
  and ends. A set standing for one block of content should be announced once, by you: wrap it in
  a single `role="status" aria-label="…"` naming *what* is loading, and mark the container holding
  the individual skeletons `aria-hidden="true"` so their own announcements never reach the
  accessibility tree.
- Don't leave it up indefinitely: if the load fails, replace it with `ArenaErrorState`, not an eternal skeleton.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
