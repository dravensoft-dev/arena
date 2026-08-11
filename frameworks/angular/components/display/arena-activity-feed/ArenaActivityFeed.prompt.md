Arena event feed. Each item is an actor, an action, an optional target and an optional
time; `tone` colours the leading dot from ArenaBadge's vocabulary.

```html
<arena-activity-feed [items]="[
  { id: '1', actor: 'Marta', action: 'deployed', target: 'billing@2.4.1', time: '2m', tone: 'success' },
  { id: '2', actor: 'Ivan', action: 'opened an incident on', target: 'auth', time: '18m', tone: 'danger' },
  { id: '3', actor: 'Rae', action: 'approved the rollback', time: '1h' }
]" />
```

<!-- @api GENERATED from contracts/api/components/ArenaActivityFeed.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the feed for assistive technology. Required, and guarded at runtime: nothing can derive it, and a feed is a landmark a reader navigates BY, so say what the events are about ("Deployment activity"), never "Activity feed". |
| `items*` | array | `readonly ArenaActivityItem[]` |  | The events, newest first by convention. Each row is drawn by Arena; there is no per-item projection. |
| `busy` | primitive | `boolean` | `false` | Whether a multi-step update to the feed is in progress, reflected as `aria-busy`. Set it while rows are being loaded or replaced and clear it once they settle, so a screen reader announces the settled feed rather than each intermediate state. It is an input rather than something Arena infers: only the host knows when its own loading has finished. |

<!-- @api end -->

**Do / Don't**
- Keep the grammar. The actor is bold, the action is prose, the target is mono, a feed
  whose rows each read differently is a list, not a feed.
- Use `tone` for what the event *means*, not for variety. Seven tones cycling by row is
  decoration, and it makes the one row that matters invisible.
- Don't put controls in a row. A feed reports; an action on an event belongs on the thing
  itself.
- The dot is filled (`bg-current`, coloured by `tone`) even for `tone="danger"`, though
  danger is outline everywhere else, a tone dot is an identity mark, the same family as
  `ArenaTag`'s own dot and `ArenaAvatar`'s presence dot, not a danger surface.

**No row escape hatch**, on either layer. The API contract declares no per-item renderer,
because Angular has no binding for per-item projection, that would need a structural
directive and `ngTemplateOutlet`, which Arena does not ask a consumer to write. A consumer
needing a different row imports the exported `arenaActivityFeedStyles` and composes the slots
themselves.
