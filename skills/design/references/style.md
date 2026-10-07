# Where each style decision is made

**Arena decides how its components look in five places, and you write in two of them.** Read this
before you reach for a class, a member or a stylesheet of your own to change one.

| You want to change | Where it is decided | What you do |
|---|---|---|
| A value: a colour, a step, a duration | Arena's tokens | read it through its custom property, as `var(--sp-4)`; you never set one |
| What a whole project looks like | your style plugin and your palette | answer the roles in your plugin and your colours in `arena.config.json` ([`style-kernel.md`](./style-kernel.md)) |
| How a region of the page reads | a context family | write its class on a container of yours; it reaches every component inside |
| How one component sits in its box: how wide, how large, how quiet | a box family | write its class on the component, or on a container whose components should all take it |
| A value no step names | the family's property, `--arena-<family>` | set it on a container of yours with a token or a derivation of tokens, as `--arena-grid-gap: calc(var(--rhythm-group) / 2)` |
| What a component does: its state, data, events, accessibility | the component's members | the members table in the component's prompt |

**Every class of the vocabulary is on [the vocabulary page](../../../frameworks/VOCABULARY.md)**, with
the components that answer it. **The class nearest the component wins**, so `arena-fill` on a
button beats `arena-fit` on the container holding it, whatever order your stylesheets load in.
**A box family stops at the content a component projects**: `arena-fill` on a container reaches a button
beside the card and not the button inside the card's body. The trigger of a tooltip or a menu is
the exception: a class on the tooltip reaches the control it wraps. **A surface a layer renders in an overlay leaves the subtree its trigger sits in**, so no class
above the trigger reaches it. The Angular overlay does this. In React a menu panel renders
inside its root, and a class above the trigger reaches it.

**A step class on the component beats the property.** `--arena-grid-min` on a container sets
the cell width of every grid inside it, and `arena-grid-min-lg` on one grid keeps that grid at
`lg`. **A box family's property stops at the content a component projects, as its class does.**
A column of a table is keyed rather than stepped: give the column a `key`, say `key: 'name'`,
then set `--arena-column-name-width: calc(var(--sp-1) * 40)` and `--arena-column-name-align: right`
on the table or a container of yours. A column with no key, or a key with no property set, keeps
the table's own layout. A table nested in a cell reads the outer property under the same key, so
it takes another key.

**Put no other class on an Arena component.** A class that is not in the vocabulary does nothing,
and `arena-to-prod --audit` reports it. A member that does not exist on a component is a type error
in React and a template compile error in Angular.

## The column the page sits in

Four classes answer the page's column, and each goes on markup you wrote. Each family's sheet is `css/vocabulary/<family>.css`.

- **`.arena-shell`** fills the window, so a short page's footer sits at the bottom rather than
  floating halfway up.
- **`.arena-shell__main`** goes on the one child of the shell that should take the slack. The class exists rather than a rule the shell applies,
  because a shell with a header, a main and a footer has exactly one child that should grow. No
  rule can know which one. **If the child that
  should grow is an Arena component, wrap it in a `<div>` of your own and put the class on the
  div.** Refusing to put a class on an Arena element is right, and stopping there is not. A
  component's own element may declare `display: contents` and carry no box. A shell whose growing
  child is a component with no wrapper distributes its slack to nothing. The footer then floats
  halfway up the page, which is the same failure the shell exists to prevent.
- **`.arena-band`** centres its contents at the page width with a gutter either side. Put it
  inside anything that spans the viewport so the contents line up with the page above and below.
- **`.arena-prose`** holds a reading column to a measure in `ch` rather than a pixel width. The column
  tracks the font size the way a measure has to. Put it on an article or a section you wrote.

**All three lengths are roles**: `container-max`, `gutter` and `measure-prose`. A style plugin
written for reading narrows the column, and every page you already shipped follows without an
edit. Narrowing the column while keeping the gutter says the page is a document; widening both
says it is a console. Every option is on [the vocabulary page](../../../frameworks/VOCABULARY.md).

**The band carries the width and the gutter and no block air.** The space above and below a page's
content is yours, and it is a `padding-block` on a container of your own spent on the `--sp-*`
scale in [`page.md`](./page.md). Block air is not a rhythm step. The classes in the next section answer the gap between two
siblings. Block air is the padding of the box that holds them, which is a different question with
a different answer.

**The gutter is a ceiling and not a fixed inset.** At or above the page width the band stands off
by the whole of it. Below that width the band stands off by the same share of the space it has. A
length answered for a page at its full width is the wrong length on a phone. A fixed inset either
side leaves the content narrower than the air around it. A class that works at one width only is
a class a screen has to override. Nothing on your side answers this: the band already does it, and
what you write is the same one class at every width.

**Two more classes are for markup rather than components.** `.arena-num`
puts a figure on the mono face, with tabular figures and no colour. A column of them aligns by
digit and does not jitter as it counts. `.arena-sr-only` is a label a
screen reader announces and nothing paints, which is where the name of an icon-only control you
drew yourself goes.

## The air between two components

**Arena draws no outer margin on anything**, so the space between one component and the next is
always yours to place. The `.arena-stack` and `.arena-row` classes are that half, as three named steps rather than a number
you pick.

| the class | the step | when |
|---|---|---|
| `.arena-stack` | `--rhythm-component` | a column of peers: a card and the next card, a chart and the table under it |
| `.arena-stack--group` | `--rhythm-group` | a column of things that read as one unit: a label and its field, a card's own stacked children |
| `.arena-stack--section` | `--rhythm-section` | between two sections of a page, which answer different questions |
| `.arena-row` | `--rhythm-group` | two or more things side by side that read as one unit: a mark beside a name, a label beside its badge |
| `.arena-row--component` | `--rhythm-component` | things side by side that are separate things: a bar's links, a toolbar's buttons |

**The three lengths are also custom properties**: `--rhythm-group`, `--rhythm-component` and
`--rhythm-section`. So a grid of your own, or a rule the classes do not cover, spends the same
step rather than a fresh number. Reach for the class first: it carries the display and the direction
with the gap, and a `gap` you write yourself is a rule that can drift off the step. With the
Tailwind theme sheet imported, the steps are utilities too: `gap-group`, `gap-component` and
`gap-section`. Every option is on [the vocabulary page](../../../frameworks/VOCABULARY.md).

**The miss this replaces has one shape, and it is small enough to look like nothing.** A column of your own carries `display: flex`, `flex-direction: column` and a `gap`. The column
holds a title over its identifier inside a table cell, or a label over the value under it.
Somebody wrote it inline because reaching for a class felt like more than two lines were worth. `.arena-stack--group` is exactly that block,
and the step a group is spent at is the same step wherever it is spent.

**The row is missed the same way and more often, because a short strip does not look like a
layout.** A mark and the product's name in an app bar. Two links beside each other. An icon and the word
after it. A status label next to the badge it describes. Each of those is a row. Each is usually
written as a `display: flex` with a gap somebody chose. Each is a step off the scale that no gate
on your side reports. `.arena-row` is the horizontal half of the three steps above
and it answers all of them, whatever the line holds and however short it is. That it wraps when
the line runs out is a property it has, never the test for whether it applies: two elements side
by side are already a row.

**Five modifiers carry no length and line the items up instead**: `.arena-stack--start`,
`.arena-stack--end`, `.arena-row--start`, `.arena-row--baseline` and `.arena-row--between`. The five answer a question about your content, such as a
trailing figure against a wrapping name. The five sit here rather than in the kernel for that reason.

**These classes go on an element you wrote, and they are useless on an Arena element.** A component's own element may declare `display: contents` and carry no box. One component renders
no element at all. So an Arena element is never a layout target. **When the element you need to lay out is a component, the answer is a `<div>` of your own around
it.** Refusing the class and writing no wrapper leaves the
layout unstated, which reads on the screen as a bug.

**The air inside a component is not this.** `gap-control`, `gap-inline`, `gap-items`,
`pad-surface`, `pad-control-x` and `pad-control-y` are kernel roles. The option roles of those are `size-<option>-control-pad-x` and `elevation-<option>-shadow`. Move them by answering them in your style plugin, never by a rule against a component. The cut is whole:
between is yours and comes from here, inside is the kernel's and comes from [`style-kernel.md`](./style-kernel.md).

## Where does my spacing and sizing go?

**Put your spacing and sizing on an element you wrote, and let the Arena element be its child.** Arena draws no outer margin on anything. A component takes a vocabulary class and no `style`. The only route into an Arena element's own box is a decision the vocabulary names.

Write the rule the same way in both layers. A component's own element is Arena's, and what it renders is free to change. A component that wraps, or that renders none, owes you no warning.

### What does that mean in React?

React renders the real element in almost every case, so a `.row > * { ... }` rule of yours does reach it. `ArenaTabs` is the exception that makes the rule worth stating. The component returns a fragment and puts no element of its own in the DOM. A rule written against it matches the tablist and the panels separately, or nothing. Wrap it, as you wrap anything else whose layout is yours.

### What does that mean in Angular?

`<arena-button>`, `<arena-card>` and `<arena-tabs>` take their host out of layout with `display: contents`. Each has a real root that must be a `<button>`, an `<a>` or a `<div role="tablist">`. That host carries no box. A `margin`, a `flex`, a `min-width` or a `.row > * { ... }` rule aimed at one of them is discarded and nothing reports it. The rule parses and the selector matches. No box exists for the declaration to land on.

Which components do this moves between releases. Write the rule above everywhere and do not check it component by component.

**Your own routed components need the same declaration, for the mirror-image reason.** Angular puts your component's element between `<router-outlet>` and your content. A `gap` on the container around the outlet reaches that one element and stops there.

```ts
@Component({
  selector: 'app-overview',
  host: { style: 'display: contents' },   // without this, the parent's gap stops here
  template: `<arena-page-head ... /><arena-grid ... />`,
})
export class Overview {}
```

With it, your sections are children of the container again and the gap reaches each of them. Carrying the layout class on the host works as well. Either beats finding out as a page whose spacing collapsed everywhere at once with nothing in the stylesheet to blame.

**`<router-outlet>` is a flex item too, and it draws nothing.** The routed component is inserted as its sibling. The outlet is an empty box that still takes a slot in your stack and spends one whole gap of it. Every page is pushed down by one step. `router-outlet { display: none }` in your global stylesheet ends it.

### What do I do when I wrap a component to size it?

Give the wrapper a display. The wrapper is the flex or grid item now, so it is what stretches. A component inside it as a plain block does not grow with it. The width lands and the height does not. `display: grid` on a wrapper with one child passes the full cell to that child.

## Density

**`.arena-compact` and `.arena-comfortable` are the density family on the vocabulary page, `frameworks/VOCABULARY.md`.** The first re-densifies the controls. The second grows them to a 48px touch target. A container wearing both gets `.arena-comfortable`, as the vocabulary page states. Each re-answers the control and row sizes and nothing else. The rhythm above does not re-densify, so the air between two components stays where you spent it.
