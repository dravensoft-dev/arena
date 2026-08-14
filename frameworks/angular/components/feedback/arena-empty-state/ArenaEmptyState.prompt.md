Arena empty state, a section or screen with nothing in it yet, and one clear way
forward. The action is projected, so the empty state places a control the consumer wrote
rather than carrying a second button implementation. The dashed border is what distinguishes it from
`arena-error-state`: nothing is wrong here, there is simply nothing yet. The action
wrapper only renders when an action is actually projected, an empty state with no
action ships no dead space for one.

`title` is required (`input.required<string>()`, per `contracts/api/components/ArenaEmptyState.json`),
say what is empty. `icon` is optional and, like `arena-stat-card`'s, a Phosphor class name
Arena draws itself, not projected content.

```html
<arena-empty-state icon="ph-bold ph-folder-open"
                   title="No projects yet"
                   message="A project groups deployments, logs and artifacts for one client.">
  <arena-button action (click)="create()">Create a project</arena-button>
</arena-empty-state>
```

<!-- @api GENERATED from contracts/api/components/ArenaEmptyState.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `icon` | primitive | `string` |  | A Phosphor class name for the glyph Arena draws, muted. |
| `title*` | primitive | `string` |  | The headline: what is empty. |
| `message` | primitive | `string` |  | A sentence of guidance under the title. |
| `action` | slot |  |  | A single call-to-action control, centred under the message. |

<!-- @api end -->

Import `ArenaAction` from `@dravensoft/arena-angular` alongside `ArenaEmptyState` in the
host component's `imports`,
`action` is a directive, not a plain attribute, because it is how the empty
state detects that an action was projected at all. `ArenaAction` is shared: every
primitive that projects a single action through `[action]` (`ArenaEmptyState`,
`ArenaErrorState`) imports the same directive rather than declaring its own.

**Do / Don't**
- Say what the thing *is* in the message, not just that there are none of it. An empty
  state is often the first time someone reads a definition.
- Give exactly one action. Two competing actions in an empty state is a decision the
  user has no information to make.
- Don't use an empty state for a failed load: that is `arena-error-state`, and the
  difference matters: one invites, the other apologises and offers a retry.
- Don't forget to import `ArenaAction` when projecting an action. Without it, the
  `action` attribute is inert and the action silently fails to render.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
