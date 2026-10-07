# Serving Arena to your editor over MCP

How do I install `@dravensoft/arena-mcp`? How do I configure it in my editor? What do `--layer` and `--payload` do? Which tools and `arena://` resources does it serve? What does `arena_check` read? What does it do when its version and my installed package differ? Read this when your editor speaks MCP.

Arena over the Model Context Protocol serves the router, the references and every component document of Arena to an agent in your editor. The server offers them as MCP resources and as tools.

**The server carries the language, and the component packages carry the components.** `@dravensoft/arena-react` and `@dravensoft/arena-angular` ship the code, the stylesheets and the contracts that markup of your own answers to. The packages carry none of the prose that says how to write a screen. That prose is in this server, both layers of it, and the server hands you the half your project installed.

## How do I install the server?

```bash
npm i -D @dravensoft/arena-mcp        # or: bun add -d / pnpm add -D / yarn add -D
```

The server serves the layer your project installed. `@dravensoft/arena-react` or `@dravensoft/arena-angular` in the project tells the server which layer that is. The server resolves whichever it finds above the working directory. With neither
installed, `--layer react` or `--layer angular` names the half you want.

## How do I point my editor at the server?

The configuration file differs per editor and the command does not.

```json
{
  "mcpServers": {
    "arena": { "command": "npx", "args": ["-y", "@dravensoft/arena-mcp"] }
  }
}
```

## What do `--layer` and `--payload` do?

`--layer react|angular` names the half to serve, for a project holding neither package or holding
both. `--payload <dir>` serves a corpus from somewhere else entirely, for a build of Arena that is
not installed anywhere.

## Which tools does the server offer?

| Tool | What it answers |
|---|---|
| `arena_start` | What is installed, and the one document to read before writing a screen. Call it first |
| `arena_list` | Every Arena document, as addressable URIs |
| `arena_find` | Which documents answer a question, by words in their name and their opening |
| `arena_read` | One document by its URI, for a client that calls tools and does not read resources |
| `arena_check` | The code you just wrote, against the rules of the language, before you save it |

## Which arena:// resources does the server offer?

Every document is also offered as an MCP resource under an `arena://` URI. The resources are the router, one per reference, the component indexes, one per component, the style roles, the rules of the language and the support record.

Read the router first. The router carries the rules of the language and routes every other question. The route past it is one component at a time, and never a corpus read whole.

## What does arena_check read?

**`arena_check` is the half that reads your code rather than Arena's.** Pass the tool the source text. The tool reports what the rules of the language say about that text.

The tool reports a class of your own on a component, a raw value where a token belongs, and a gradient. The tool also reports a filled danger surface and a second primary action. The tool also reports an icon as an element, an emoji, and a component wrapped in a link of your own. The last rule is a heading outline with a rung missing.

The tool reads text and not files. A screen that is still in the conversation can be checked before it is written down.

`arena://rules` names every rule of the language and says which ones the tool reports. For each of the rest, the resource says why a source text cannot show the rule.

A style plugin of your own is judged by `arena-to-prod --audit` in the framework package. That command reads your config and knows which directories are plugins.

## What if the server and my package differ in version?

A corpus can disagree with the components beside it. Carrying the corpus here and not inside the package it describes has that price. `arena_start` reads the version of the Arena package your project installed and compares it with the server's own version. The tool says so when they differ. Where they differ, the components are right and the text is old.

## What is the server not?

**The server is not a second way to install Arena.** The components, the stylesheets and the command that turns your palette into CSS are in the framework package. [`install.md`](./install.md) covers the install.

**The server is not the only way to reach the language.** The Claude Code plugin carries the same route. A clone of the repository, read from `skills/design/SKILL.md`, carries it too. So does the site over HTTP, from `https://arena.dravensoft.org/llms.txt`.

Take the server when your editor speaks MCP and you would rather configure a server once than keep a checkout.
