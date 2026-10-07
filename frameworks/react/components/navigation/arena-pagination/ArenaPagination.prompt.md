Jumps between pages of a large set (accompanies `ArenaTable` or long lists). Collapses with "…" when there are many pages.

```tsx
<ArenaPagination page={p} pageCount={12} ariaLabel="Deployments" onChange={setP} />
```

<!-- @api GENERATED from contracts/api/components/ArenaPagination.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `page*` | primitive | `number` |  | The current page, 1-based. |
| `pageCount*` | primitive | `number` |  | How many pages there are. Required, and guarded at runtime: an ArenaPagination with no page count renders a window over nothing. |
| `ariaLabel*` | primitive | `string` |  | Names this navigation landmark. Required, and guarded at runtime: two paginated tables in one dashboard is a routine layout, and a shared constant name leaves them indistinguishable while satisfying the requirement mechanically. It was optional with a "ArenaPagination" default for one batch, which narrowed the gap rather than closing it: a name the caller omits is still the constant. Say what is being paged: "Deployments", not "Pages". |
| `onChange` | event | `number` |  | A page was chosen; carries the new 1-based page. Never fires for the current page, nor for a page outside 1..pageCount. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys.** This component binds [`navigation`](../../../../../contracts/behaviour/navigation.json), which names no key.

<!-- @keys end -->

`page` and `pageCount` are both required and both throw when absent. Neither has
a default worth having, since an `ArenaPagination` that assumes page 1 of 1 draws a
one-page control over a set whose size nobody told it.

`ariaLabel` names the landmark and is **required**, throwing when absent, in the
same shape as `ArenaTable.label` and `ArenaSegmentedControl.ariaLabel`. A `"ArenaPagination"` default narrows the gap rather than closing it. Two paginated tables in one dashboard is a routine layout, and a caller who omits the name still leaves two landmarks called "Pagination" that a screen-reader user cannot tell apart.
Nothing can derive it, so nothing
defaults it. Name what is being paged ("Deployments"), never the widget
("Pages").

**Do / Don't**
- Place it under the table/list, aligned to the right or centered.
- For continuous feeds use "load more" or infinite scroll, not ArenaPagination.
- Don't reach for `style` to place it. The component takes none. Wrap it in a `<div>` that owns the margin.

**Words.** `paginationPrevious` and `paginationNext` name the arrows. The landmark's name is `ariaLabel` and is always yours.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
