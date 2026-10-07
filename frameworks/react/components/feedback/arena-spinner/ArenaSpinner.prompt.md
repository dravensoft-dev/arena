Indeterminate wait indicator, for the waits with no known percentage. Respects `prefers-reduced-motion` by slowing down rather than stopping, because a frozen spinner reads as a hung process.

```tsx
<ArenaSpinner label="Loading projects" />
<ArenaSpinner className="arena-size-sm arena-accent-ink" />        {/* inside a filled button */}
<ArenaSpinner label="Connecting to the build server" className="arena-size-lg arena-accent-muted" />
```

<!-- @api GENERATED from contracts/api/components/ArenaSpinner.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label` | primitive | `string` |  | Accessible name, announced by the status role. Say what is loading when you can. Absent, the provided locale's spinnerLabel answers it, which reads Loading by default. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

**Answers** [`accent`](../../../../VOCABULARY.md#accent): `arena-accent-gold`, `arena-accent-ink`, `arena-accent-muted`, `arena-accent-primary` (default). Write one as `className="arena-accent-gold"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

**Do**
- Reach for `ArenaProgressBar` first. A spinner is the fallback for when no real percentage exists; a determinate bar communicates remaining time and a spinner cannot.
- Give `label` the real subject ("Loading projects"), because it is the accessible name, and "Loading" alone tells a screen-reader user nothing.
- Use `className="arena-accent-ink"` on a filled crimson surface so the ring stays legible.

**Don't**
- Don't use a spinner for a process whose progress you know: that degrades visibility (H1).
- Don't expect a `success`, `warning` or `danger` colour: none exists here, on purpose. A wait has no state to report, and a spinner tinted `--danger` would announce a failure that hasn't happened. Report the outcome with an `ArenaToast` or an `ArenaAlert`.
- Don't stack a spinner on top of an `ArenaSkeleton`. Pick one: the skeleton reserves the layout, the spinner marks an unsized wait.
- Don't pass `style` or stray DOM attributes. ArenaSpinner declares three members and renders nothing else; wrap it in your own element if you need to position it.

**On the colour vocabulary.** `ArenaProgressBar` answers `arena-accent-primary` and `arena-accent-gold`, and takes a `tone` of success, danger or info. `ArenaSpinner` answers `arena-accent-primary`, `arena-accent-gold`, `arena-accent-ink` and `arena-accent-muted`. The shared accents resolve to the same tokens, so the two read as one family. The divergence is deliberate in both directions; see Don't, above.

**Words.** `label` names the spinner, and when it is absent the locale's `spinnerLabel` does.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
