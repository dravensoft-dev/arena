Guided empty state (H9/H10). Always give an exit action. `title` is required; `icon` is a
Phosphor class name Arena draws (not a node); absent renders no glyph at all.

```tsx
<ArenaEmptyState icon="ph-duotone ph-folder-open" title="No projects yet"
  message="Create your first project to start deploying." action={<ArenaButton>New project</ArenaButton>} />
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

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
