# @dravensoft/arena-mcp

Arena over the Model Context Protocol. It serves the router, the references and every component
document of Arena to an agent in your editor, as MCP resources and as tools.

**It carries the language, and the component packages carry the components.**
`@dravensoft/arena-react` and `@dravensoft/arena-angular` ship the code, the stylesheets and the
contracts markup of your own answers to, and none of the prose that says how to write a screen with
them. That prose is here, both layers of it, and this server hands you the half your project
installed.

## Install

```bash
npm i -D @dravensoft/arena-mcp        # or: bun add -d / pnpm add -D
```

`@dravensoft/arena-react` or `@dravensoft/arena-angular` in the project is what tells the server
which layer to serve. It resolves whichever it finds above the working directory. With neither
installed, `--layer react` or `--layer angular` names the half you want.

## Point your editor at it

The configuration file differs per editor and the command does not.

```json
{
  "mcpServers": {
    "arena": { "command": "npx", "args": ["-y", "@dravensoft/arena-mcp"] }
  }
}
```

`--layer react|angular` names the half to serve, for a project holding neither package or holding
both. `--payload <dir>` serves a corpus from somewhere else entirely, for a build of Arena that is
not installed anywhere.

## What it serves

| Tool | What it answers |
|---|---|
| `arena_start` | What is installed, and the one document to read before writing a screen. Call it first |
| `arena_list` | Every Arena document, as addressable URIs |
| `arena_find` | Which documents answer a question, by words in their name and their opening |
| `arena_read` | One document by its URI, for a client that calls tools and does not read resources |

Every one of those documents is also offered as an MCP resource, under an `arena://` URI: the
router, one per reference, the component indexes, one per component, the style roles and the
support record. **Read the router first.** It carries the rules of the language and routes every
other question, and the route past it is one component at a time rather than a corpus read whole.

**A corpus can disagree with the components beside it**, which is the price of carrying it here
rather than inside the package it describes. `arena_start` reads the version of the Arena package
your project installed, compares it with this one, and says so when they differ. Where they do, the
components are right and the text is old.

## What it is not

**It is not a second way to install Arena.** The components, the stylesheets and the command that
turns your palette into CSS are in the framework package, and its own page is where those are
documented.

**It is not the only way to reach the language.** The Claude Code plugin carries the same route, so
does a clone of the repository read from `skills/design/SKILL.md`, and so does the site over HTTP
from `https://arena.dravensoft.org/llms.txt`. Take this one when your editor speaks MCP and you
would rather configure a server once than keep a checkout.
