# The arena-to-prod command and its flags

What does `arena-to-prod` write? Which flags does it take? What does `--audit` report? What does `--strict` hold? Does the command refuse or only report? How do I run it before every build in React and in Angular? Read this once per project, when you wire the build.

```bash
npx arena-to-prod                    # or: bunx / pnpm exec / yarn dlx
```

The command takes no required argument. The command reads `arena.config.json`, your `src` tree and every style plugin directory that the config declares, wherever those sit. [`config.md`](./config.md) covers the file. [`install.md`](./install.md) covers importing what the command writes.

## What does the command write?

The command writes two files into `src`, and a third when a style plugin needs one.

**`arena.generated.css`** holds your palettes and your `@font-face` rules. The file leads with an `@import` of the package's own stylesheet. Every colour comes from this file. The package declares no `--color-*` of its own, only the rules that read them. The config and this command are how Arena gets a palette at all.

The font roles are the half that is an override. The package declares them. Your file comes later at equal specificity in `:root` and wins.

**`icons.generated.css`** holds the class rules, in `woff2` alone, for every glyph your sources draw and every glyph Arena draws for you. Phosphor's own stylesheet declares a rule for every icon in every format. A screen draws a handful. That stylesheet is the largest one an Arena project would send that nothing on it reads.

The font binary is not cut down. The `@font-face` the command writes points at the weight Phosphor ships, and a bundler copies that whole file. Host a subset of your own if the bytes matter. The glyph list in this file is what to cut it to.

Counting what Arena draws is the part you cannot do by hand. A component renders icons you never wrote. Leaving those out is an empty box in a menu you did not know had one.

The two halves are answered differently. Your sources are read as text, since there is nothing else to read them by. Arena's half is a list. The package ships `icons.json`, computed at build time from the renders themselves. A search over the package cannot tell a render from a sentence about one.

Every glyph you name also reaches the filled weight, whichever weight you wrote beside it. A navigation item draws its active destination filled and asks for a rule you never wrote. Name the glyph the way its member documents it, `icon="ph-bold ph-receipt"`, and the sheet has both.

**`plugin.generated.css`** is written when a style plugin carries a `plugin.css`. The file holds that CSS wrapped in the reserved cascade layer. The sheet leads with the layer order itself. Where a bundler places it among your other stylesheets cannot change what wins.

Ignore all generated files in version control, as you ignore the rest of your build.

## Which flags does it take?

| flag | what it does |
| --- | --- |
| `--help`, `-h` | Print the usage and exit. |
| `--audit` | Report where your own sources break a rule of the language. That covers a class of yours on a component Arena draws, a stylesheet rule reaching an `arena-` slot, and one reaching a `data-arena-part` hook from outside a style plugin. The audit covers an Arena component wrapped in your router's own link. The audit covers a raw colour, a bare pixel length or a gradient where a token belongs. Raw means a hex, channels or a name. The audit covers an icon passed as an element, and an emoji. **Every rule is read in a scope.** Inside a directory your `stylePlugins` declares, a part hook is what you are meant to select and a gradient is yours to paint. Neither is reported there. The compiled `arena-` class name and a raw value are reported in both scopes, because the hook is the contract and the class is output. The run also names the parts your plugins paint. The evidence for promoting one into a role comes from that list. **Nothing reads your application**, so this is the only automatic signal there is. The audit is a report and never a failure until you pass `--strict`. The audit decides only what source text shows. The audit never claims to have checked one primary per view, or a filled danger surface. **A comment is prose** and declares nothing, so a note about a value costs no allowance. Exempt a line it is wrong about with an `arena-audit allow` comment on that line. The command reports the allowance once nothing is left on the line to exempt. |
| `--undrawn` | Name the components the package ships that your sources draw nowhere. The flag answers "which of them have I not used yet". The flag walks your sources a second time, the only one here that costs a pass of its own. A component Arena draws on your behalf counts as undrawn, because you never wrote it. |
| `--strict` | Exit 1 on a report instead of writing anyway. Bare, it holds every kind. `--strict=contrast,audit` holds the kinds you name, out of `components`, `contrast`, `ramp`, `weight`, `glyph`, `markers`, `audit`, `environment` and `restated`. **Name them when one of them is a decision you already made.** A brand under 4.5:1 is measured and deliberate. One switch over all of them would make it the price of holding the rest in CI. `environment` says the run is outside an Arena package, so Arena's own icons went uncounted. `weight` says a role asks for a weight the face you loaded does not carry, so the browser draws it by smearing the nearest one. `restated` says a plugin rule restates the value that part's slot already paints, so it changes nothing. `wash` is the one kind `--strict` never holds. A token on a wash of its own colour clears AA at no percentage, and a build nobody can fix is not a gate. |
| `--no-import` | Omit the `@import` of the package stylesheet. Use it when you would rather import `@dravensoft/arena-react/arena.css` or `@dravensoft/arena-angular/arena.css` yourself. |
| `--config` | The config file. The default is `arena.config.json`. |
| `--src` | A tree of your own to scan. The default is `src`. Repeat the flag for more trees. A style plugin is not one of your trees. A directory your `stylePlugins` declares is resolved from the config and walked wherever it lives. Every scope rule in the `--audit` row reaches it, under `src` or not. A plugin in `design/` costs nothing to remember. |
| `-o`, `--out` | The directory the generated files go to. The default is `src`. |

## Does the command report or refuse?

The command reports. These cases print on stderr and write the files anyway. A text colour sits under 4.5:1. Two ramp slots are too close to tell apart with a common colour vision deficiency. A glyph is one Phosphor does not have. Your brand is yours, and the command tells you what it costs.

A malformed config always fails and names the key. A name in a `stylesheet` list that the package does not ship fails too. An unknown flag exits with status 2 and prints the usage.

## How do I run it before every build in React?

Wire the command once as a `pre` script. Both bun and npm run a `pre<name>` script ahead of the script it names. The two generated files then never go stale.

```json
{
  "scripts": {
    "prebuild": "arena-to-prod",
    "predev": "arena-to-prod",
    "arena:audit": "arena-to-prod --audit --strict=audit,restated,markers,glyph"
  }
}
```

## How do I run it before every build in Angular?

The wiring is the same, with `prestart` in place of `predev`.

```json
{
  "scripts": {
    "prebuild": "arena-to-prod",
    "prestart": "arena-to-prod",
    "arena:audit": "arena-to-prod --audit --strict=audit,restated,markers,glyph"
  }
}
```

## Why does the audit script exist?

`arena-to-prod` writes the stylesheets whatever it finds, because a build has to run. The `arena:audit` script adds the report. `--strict` turns the kinds you name into a non-zero exit.

The kinds named in that script are the ones a project decides nothing about. One is a rule of the language broken in your markup. One is a style plugin restating what a shipped slot already paints. One is a projection marker written without the directive that binds it. One is a glyph Phosphor does not draw.

`contrast` and `ramp` are left out on purpose. A brand measured under 4.5:1 is a decision its owner made. Run the audit script in the same job that runs your tests.

## What does the audit read in each layer?

In React the audit reads your TypeScript and your stylesheets.

In Angular the audit reads your templates the same way it reads your TypeScript. The command also reports on every pass, with no flag, a projection marker you write and do not import. A slot such as `[footer]` or `[actions]` is gated on a query for its directive. A template that writes the attribute without listing `ArenaFooter` in its own `imports` renders nothing there. Neither the build nor `ngc --strictTemplates` says a word. The command names the marker on stderr. That silent miss is the one defect a component cannot report about itself. [`exports.md`](./exports.md) lists every marker.
