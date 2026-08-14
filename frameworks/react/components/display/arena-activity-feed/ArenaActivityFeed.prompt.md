An event feed. The component knows the grammar: someone did something to something,
then, and gives each part its own ink: `actor` in `--bone`, `action` in `--bone-dim`,
`target` in mono `--gold`, `time` in mono `--mute` pushed right. A tone dot leads
each row.

```tsx
<ArenaActivityFeed label="Deployment activity" items={[
  { id: '1', actor: 'ana@',   action: 'approved the release', target: 'build #4821', time: '2h ago' },
  { id: '2', actor: 'diego@', action: 'opened incident',      target: 'checkout latency', time: '3h ago', tone: 'danger' },
]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaActivityFeed.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the feed for assistive technology. Required, and guarded at runtime: nothing can derive it, and a feed is a landmark a reader navigates BY, so say what the events are about ("Deployment activity"), never "Activity feed". |
| `items*` | array | `readonly ArenaActivityItem[]` |  | The events, newest first by convention. Each row is drawn by Arena; there is no per-item projection. |
| `busy` | primitive | `boolean` | `false` | Whether a multi-step update to the feed is in progress, reflected as `aria-busy`. Set it while rows are being loaded or replaced and clear it once they settle, so a screen reader announces the settled feed rather than each intermediate state. It is an input rather than something Arena infers: only the host knows when its own loading has finished. |

<!-- @api end -->

`tone` is ArenaBadge's vocabulary: `neutral · accent · gold · success · warning · danger ·
info`, and defaults to `accent`.

**There is no row escape hatch.** There is no `renderItem`, because per-item projection has
no expression every framework Arena ships for can offer, and Arena declares only what all of
them can implement. A consumer places no markup of their own inside one row: the event must fit `actor` / `action` / `target` / `time` / `tone`,
or it does not belong in this component.

## Do / Don't

- **Do** put it inside an `ArenaCard` when it is a panel's content. It renders no surface of
  its own; the first row has no top rule for exactly that reason.
- **Do** give each item a stable `id`. Index keys reorder badly on a feed that prepends.
- **Don't** use `tone` decoratively. It is the event's status, and status colours mean
  what they mean everywhere else in the system.
- **Don't** put an action button in the row. A feed reports; it does not operate. If a
  row needs an affordance: that is an `ArenaTable`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
