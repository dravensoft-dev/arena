Arena key value, a list of terms and the values against them with an optional summed row ruled off
at the bottom. Standalone, `OnPush`, signal I/O. The host takes itself out of layout with
`display: contents` and the real `<dl>` is inside, because the association between a term and its
value has to be the platform's.

```html
<arena-key-value [rows]="summaryRows()" [total]="{ term: 'Total', value: money(totalCents), numeric: true }" />
```

<!-- @api GENERATED from contracts/api/components/ArenaKeyValue.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `rows*` | array | `readonly ArenaKeyValueRow[]` |  | The rows, in the order they are given. An empty array renders an empty list rather than throwing, because a summary with nothing to adjust is a state a basket reaches on its way to being filled and not a mistake in the markup. |
| `total` | object | `ArenaKeyValueRow` |  | The row the others add up to, drawn last, ruled off above and set in the heading register. It is a member rather than the last element of rows because the rule and the register are what say a total is a total, and deriving that from position would make the last adjustment in a list look like one. |

<!-- @api end -->

**Each row is a `<dt>` and a `<dd>` in a wrapper**, which is the shape a definition list takes when
the pair has to sit on one line.

**`numeric` is what keeps a money column from jittering.** It sets the value in the mono face with
tabular numerals, so a column of figures aligns by digit as it changes. It is per row because a
summary mixes an address with a price and only one of them is a figure.

**`total` is a member and not the last row.** The rule above it and the heading register are what
say a total is a total; deriving that from position would make the last adjustment in a list look
like one.

**Do / Don't**
- **Do** format the value before you pass it. Every value is a string, which is what a summary row
  actually holds: a price, a method, an address, a count.
- **Do** leave `rows` empty when there is nothing to adjust yet. An empty list is a state a basket
  reaches on its way to being filled.
- **Don't** reach for it for a table. Two columns of data with a header row are an `arena-table`.
- **Don't** put a control in a value. Every value is text; a row that has to be acted on belongs in
  a list you wrote.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/display/arena-key-value/ArenaKeyValue.demo.generated.html`:
- The figures align by digit down the column, and stay aligned as the values change.
- The total is ruled off above and reads a register heavier than the rows over it.
- With a screen reader running, each value is announced with the term it belongs to.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
