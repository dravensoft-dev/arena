Brief tooltip over icons/actions.

```tsx
<ArenaTooltip label="Roll back to the previous build"><ArenaIconButton label="Roll back" icon="ph-bold ph-arrow-counter-clockwise" /></ArenaTooltip>
```

<!-- @api GENERATED from contracts/api/components/ArenaTooltip.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | The bubble's text. Arena draws the bubble; the consumer names it. |
| `children*` | slot |  |  | The element the tooltip describes and attaches to. |

<!-- @api end -->

`label` is the bubble's text and is required; Arena draws the bubble, the consumer
names it. It is a plain string, so markup inside a tooltip is not possible; a bubble
is a short label, not a paragraph. The children are the element the tooltip describes
and attaches to.

The tooltip is a deferred affordance: it waits for the pointer to rest, and does not
appear for a pointer merely passing over it. A focus reveals it immediately instead,
a keyboard user has already paid to reach the control.

**Escape dismisses it from anywhere**, whether a pointer or a focus revealed it, for
as long as the bubble is up. That is WCAG 1.4.13: content shown on hover must be
dismissible without moving the pointer, and a hover leaves focus wherever it already
was, so the key is listened for on the document rather than on the trigger.

**Don't** wrap a control whose only label is its tooltip. A bubble that only
appears on hover or focus, and only after `--delay-open` for a pointer, is a
poor substitute for a name on the control itself.

**Do** hand `ArenaTooltip` a single element that accepts props, because that is where
`aria-describedby` lands, added only while the bubble is shown. A description of
your own on that element is **kept**, not replaced: `aria-describedby` is a
space-separated id list, so an input keeps its password rules and gains the bubble
beside them.

```tsx
<ArenaTooltip label="Roll back to the previous build"><ArenaIconButton label="Roll back" icon="ph-bold ph-arrow-counter-clockwise" /></ArenaTooltip>
```

**Don't** wrap the trigger in a fragment, hand it a bare string, or wrap it in
a component that swallows its props. The tooltip still shows on hover or
focus, but the description never reaches anyone.

```tsx
<ArenaTooltip label="Roll back to the previous build">
  <>
    <ArenaIconButton label="Roll back" icon="ph-bold ph-arrow-counter-clockwise" />
  </>
</ArenaTooltip>
```

**How `aria-describedby` reaches the trigger, and the one shape it still cannot.** The attribute
is written twice on purpose: `cloneElement` puts it in the server-rendered HTML before hydration,
and an effect writes it onto the **resolved node** afterwards. The effect is what covers a child
that accepts the prop and drops it, invisible to a clone, and perfectly visible in the DOM.
Arena's own components forward the props they *declare* and drop the rest, so every suite
assertion using a raw `<button>` proved a case the demo pages did not have. Two failing shapes now
throw outright: a bare string, and a **fragment**: the trap, because `React.isValidElement` is
true for one, so the clone succeeded and the attribute reached nothing at all, in silence.
**Unpromised:** a child rendering no DOM node of its own at the wrapper's first position, or one
that re-parents its content, is outside what an effect reading `firstElementChild` can reach.

**The bubble is in flow, so an ancestor with `overflow: hidden` clips it** and it cannot leave a
scroll container. Nothing in `contracts/behaviour/tooltip.json` requires it to escape one, so this
is a bounded capability limit rather than a defect: fixing it means a portal or a popover, which is
a new capability. Place a tooltip where its trigger is not inside a clipping ancestor.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
