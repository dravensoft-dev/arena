Indeterminate wait indicator, for the waits with no known percentage. Respects `prefers-reduced-motion` by slowing down rather than stopping, because a frozen spinner reads as a hung process.

```tsx
<ArenaSpinner label="Loading projects" />
<ArenaSpinner size="sm" tone="on-accent" />        {/* inside a filled button */}
<ArenaSpinner size="lg" tone="neutral" label="Connecting to the build server" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSpinner.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `size` | enum | `ArenaControlSize` | `"md"` | Diameter. 'sm' is --icon-sm exactly, so a spinner at that size sits inline with control text. |
| `tone` | enum | `ArenaSpinnerTone` | `"accent"` | Colour of the ring. 'on-accent' inside a filled button; 'accent' on a page surface. |
| `label` | primitive | `string` | `"Loading"` | Accessible name, announced by the status role. Say what is loading when you can. |

<!-- @api end -->

**Do**
- Reach for `ArenaProgressBar` first. A spinner is the fallback for when no real percentage exists; a determinate bar communicates remaining time and a spinner cannot.
- Give `label` the real subject ("Loading projects"), because it is the accessible name, and "Loading" alone tells a screen-reader user nothing.
- Use `tone="on-accent"` on a filled crimson surface so the ring stays legible.

**Don't**
- Don't use a spinner for a process whose progress you know: that degrades visibility (H1).
- Don't expect `success`/`warning`/`danger` tones: they don't exist here, on purpose. A wait has no state to report, and a spinner tinted `--danger` would announce a failure that hasn't happened. Report the outcome with an `ArenaToast` or an `ArenaAlert`.
- Don't stack a spinner on top of an `ArenaSkeleton`. Pick one: the skeleton reserves the layout, the spinner marks an unsized wait.
- Don't pass `style` or stray DOM attributes. ArenaSpinner declares three members and renders nothing else; wrap it in your own element if you need to position it.

**On the tone vocabulary.** `ArenaProgressBar` ships `accent | gold | success | danger | info`; `ArenaSpinner` ships `accent | gold | neutral | on-accent`. The overlap (`accent`, `gold`) resolves to the same tokens, so the two read as one family. The divergence is deliberate in both directions; see Don't, above.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
