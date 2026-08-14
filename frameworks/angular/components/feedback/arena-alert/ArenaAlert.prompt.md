Arena in-page message. Unlike a snackbar it is persistent: it belongs where the
condition it reports lives, and it stays until that condition is resolved. `tone`
carries the severity and picks the Phosphor Fill icon; `actionLabel` adds one
uppercase mono action; `dismissible` adds the single `ph-x` close control.

```html
<arena-alert tone="warning" title="Deploy window closes in 20 minutes">
  Merge or park the release before 18:00 UTC.
</arena-alert>

<arena-alert tone="danger" title="Sync failed" actionLabel="Retry" [dismissible]="true"
             (action)="retry()" (close)="hide()">
  Three records could not be written.
</arena-alert>
```

<!-- @api GENERATED from contracts/api/components/ArenaAlert.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `tone` | enum | `ArenaAlertTone` | `"info"` | The severity: colour, default icon, and (for danger) the alert role. |
| `title` | primitive | `string` |  | An optional bold lead line above the message. |
| `content` | slot |  |  | The message body. |
| `icon` | primitive | `string` |  | A Phosphor class name overriding the tone's default glyph. Arena draws it. |
| `actionLabel` | primitive | `string` |  | The label of a single inline action button. Absent renders no action. |
| `action` | event |  |  | The inline action button was activated. |
| `dismissible` | primitive | `boolean` | `false` | Whether the × is shown. Every layer gates the × on this member and never on whether anything listens for `close`, because Arena never derives what it draws from what a consumer listens for. |
| `close` | event |  |  | The × was activated. |

<!-- @api end -->

**Do / Don't**
- Use `tone="danger"` only for a condition the user must act on. It renders
  `role="alert"`, which interrupts a screen reader; every other tone renders
  `role="status"`, which does not.
- Don't use an alert for something transient: that is `MatSnackBar` wearing Arena.
- Don't stack more than one alert in the same region. Two competing alerts read as
  one broken page; summarise instead.
- Don't express a condition as an attribute string. `dismissible` carries the
  `booleanAttribute` transform, so a bare `dismissible` and `[dismissible]="true"` both
  mean true, and the one literal string `"false"` means false. Every *other* string is
  true, `"0"`, `"off"` and `"no"` all suppress nothing. Bind the expression
  (`[dismissible]="canDismiss"`) and keep the bare attribute for a constant true.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
