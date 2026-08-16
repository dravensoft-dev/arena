A list of terms and the values against them, with an optional summed row ruled off at the bottom:
a basket summary, an order, an invoice, a panel of facts about a resource.

```tsx
<ArenaKeyValue
  rows={[
    { term: 'Delivering to', value: `${recipient}, ${city}` },
    { term: 'Subtotal', value: money(subtotalCents), numeric: true },
    { term: 'Delivery', value: shippingCents === 0 ? 'Free' : money(shippingCents), numeric: true },
  ]}
  total={{ term: 'Total', value: money(totalCents), numeric: true }} />
```

<!-- @api GENERATED from contracts/api/components/ArenaKeyValue.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `rows*` | array | `readonly ArenaKeyValueRow[]` |  | The rows, in the order they are given. An empty array renders an empty list rather than throwing, because a summary with nothing to adjust is a state a basket reaches on its way to being filled and not a mistake in the markup. |
| `total` | object | `ArenaKeyValueRow` |  | The row the others add up to, drawn last, ruled off above and set in the heading register. It is a member rather than the last element of rows because the rule and the register are what say a total is a total, and deriving that from position would make the last adjustment in a list look like one. |

<!-- @api end -->

**It renders a real `<dl>`**, so the association between a term and its value is the platform's
rather than a class name's. Each row is a `<dt>` and a `<dd>` in a wrapper, which is the shape a
definition list takes when the pair has to sit on one line.

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
- **Don't** reach for it for a table. Two columns of data with a header row are an `ArenaTable`,
  and a `<dl>` there would announce pairs where a reader expects a grid.
- **Don't** put a control in a value. Every value is text; a row that has to be acted on belongs in
  a list you wrote.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
