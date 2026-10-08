# A static artifact

A slide, a mock or a throwaway prototype is one HTML file. The file links Arena's stylesheet and
Phosphor's two glyph sheets, and the file writes its own markup. Nothing here is a package. **This
page is the document to start from.** Read this when you build a slide, a mock or a throwaway prototype as one HTML file.

## The document

Every URL below is served by `https://arena.dravensoft.org`, so the file works on a machine with no clone.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Release review</title>
  <link rel="stylesheet" href="https://arena.dravensoft.org/intro/styles.css">
  <link rel="stylesheet" href="https://arena.dravensoft.org/node_modules/@phosphor-icons/web/src/bold/style.css">
  <link rel="stylesheet" href="https://arena.dravensoft.org/node_modules/@phosphor-icons/web/src/fill/style.css">
  <style>
    body { margin: 0; background: var(--fill-page); color: var(--ink-body); font-family: var(--font-body); }
    main { max-width: var(--measure-prose); margin: 0 auto; padding: var(--sp-10) var(--sp-6); }
    h1 { font-family: var(--font-display); font-weight: var(--fw-black); font-size: var(--fs-h2);
         color: var(--ink-heading); letter-spacing: var(--ls-tight); margin: 0 0 var(--sp-4); }
    p { color: color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent);
        line-height: var(--lh-body); }
    .card { background: var(--fill-surface); border: var(--bw-surface) solid var(--edge-surface);
            border-radius: var(--r-surface); padding: var(--sp-4); }
    .card i { color: var(--accent-primary-ink); }
  </style>
</head>
<body>
  <main>
    <h1><i class="ph-bold ph-rocket-launch"></i> Release review</h1>
    <p>Three changes ship this week.</p>
    <div class="card"><i class="ph-fill ph-star"></i> Pinned by the team</div>
  </main>
</body>
</html>
```

The page is dark. Put `class="arena-light"` on `<html>` for the light palette.

## What the stylesheet carries

`intro/styles.css` carries tokens, the default style plugin and a reset, and no component class and no
vocabulary class. The page above uses the roles [`page.md`](./page.md) teaches. The floor is
`--fill-page`, a card is `--fill-surface` with `--edge-surface`, `--bw-surface` and `--r-surface`, and
the text takes `--ink-heading`, `--ink-body` and `--ink-muted`. `--measure-prose` is the column's width,
and `--accent-primary-ink` colours the icon. The type roles are `--font-display` and `--font-body`
with `--fs-*`, `--fw-*`, `--ls-*` and `--lh-*`, and the spacing steps are `--sp-*`. The reset makes
every box `border-box`. A class such as `arena-stack` is an Arena vocabulary class. The package ships
it in its `css/vocabulary/` sheets and `intro/styles.css` does not import those, so a static page
writes its own rule from the tokens instead. Every colour, length and font in the page comes from a
token and never from a literal.

## The stylesheet does not travel alone

**`intro/styles.css` is a list of `@import` lines that climb out of its folder.** Each one starts
with `../`. The reset, the font, palette, colour, type, spacing, effect, contrast and environment sheets come from
`contracts/`, and so do the default and complete style plugin sheets.
The density sheet comes from
`frameworks/tailwind/consume/`, and `complete/plugin.css` from `plugin-style-store/`.

Those paths resolve in two places only. The site has the folders beside `intro/`, and so does a clone. **Copy the file on its own and every import fails, and the page paints
with the browser's defaults and no error.** To work offline, copy the whole clone, or link the site
URL as above.

Serve the page over HTTP. Opened from `file://`, a page that links the site still loads, and one that links local copies of these sheets does not.
