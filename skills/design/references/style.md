# Where each style decision is made

**Arena decides how its components look in five places, and you write in two of them.** Read this
before you reach for a class, a member or a stylesheet of your own to change one.

| You want to change | Where it is decided | What you do |
|---|---|---|
| A value: a colour, a step, a duration | Arena's tokens | read it through its custom property, as `var(--sp-4)`; you never set one |
| What a whole project looks like | your style plugin and your palette | answer the roles in your plugin and your colours in `arena.config.json` ([`style-kernel.md`](./style-kernel.md)) |
| How a region of the page reads | a context family | write its class on a container of yours; it reaches every component inside |
| How one component sits in its box: how wide, how large, how quiet | a box family | write its class on the component, or on a container whose components should all take it |
| What a component does: its state, data, events, accessibility | the component's members | the members table in the component's prompt |

**Every class of the vocabulary is on [the vocabulary page](../../../frameworks/VOCABULARY.md)**, with
the components that answer it. **The class nearest the component wins**, so `arena-fill` on a
button beats `arena-fit` on the container holding it, whatever order your stylesheets load in.
**A box family stops at the content a component projects**: `arena-fill` on a container reaches the
card inside it and not the button inside the card's body. The trigger of a tooltip or a menu is
the exception: a class on the tooltip reaches the control it wraps. **A dialog, a sheet, a menu
panel or a toast opens outside the page's own subtree**, so no class written above its trigger
reaches it.

**Put no other class on an Arena component.** A class that is not in the vocabulary does nothing,
and `arena-to-prod --audit` reports it, as it reports a member that names appearance with the class
that says it instead.
