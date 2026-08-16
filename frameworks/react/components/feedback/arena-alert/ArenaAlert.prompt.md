Persistent message on the page (status notice, system condition, context). Stays until the condition is resolved, unlike `ArenaToast`, which is ephemeral.

```tsx
<ArenaAlert tone="warning" title="Staging environment"
  actionLabel="Go to production" onAction={goProd}>
  Changes here don't affect real users.
</ArenaAlert>

<ArenaAlert tone="danger" title="Certificate expired" dismissible onClose={hide}>
  Renew the TLS within 48 h to avoid outages.
</ArenaAlert>
```

<!-- @api GENERATED from contracts/api/components/ArenaAlert.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `tone` | enum | `ArenaAlertTone` | `"info"` | The severity: colour, default icon, and (for danger) the alert role. |
| `title` | primitive | `string` |  | An optional bold lead line above the message. |
| `children` | slot |  |  | The message body. |
| `icon` | primitive | `string` |  | A Phosphor class name overriding the tone's default glyph. Arena draws it. |
| `actionLabel` | primitive | `string` |  | The label of a single inline action button. Absent renders no action. |
| `onAction` | event |  |  | The inline action button was activated. |
| `dismissible` | primitive | `boolean` | `false` | Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. |
| `onClose` | event |  |  | The × was activated. |

<!-- @api end -->

**Do / Don't**
- ArenaAlert = persistent and inline; ArenaToast = ephemeral and floating. Don't swap them.
- If dismissible, the close is the standard `ph-x` icon (H4). `dismissible` gates the
  ×, pass it explicitly; `onClose` alone (with `dismissible` absent) renders no ×.
- Reserve `danger` for blocking conditions; for full-page errors use `ArenaErrorState`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
