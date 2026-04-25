---
title: Getting Started
description: Install the package and build your first dependency graph.
section: Guides
navTitle: Getting Started
order: 20
---

# Getting Started

Start by creating tags. A tag is both a runtime key and a compile-time witness for the service stored under that key.

```ts
import { Context, Dependency, Result, build } from '@fuiste/dependencies'

const Config = Context.Tag<{ prefix: string }>('getting-started/config')
const Logger = Context.Tag<{ log: (message: string) => string }>('getting-started/logger')

const config = Dependency.succeed(Config, { prefix: 'demo' })

const logger = Dependency.sync(Logger, [Config], (context) => ({
  log: (message) => `[${Context.get(context, Config).prefix}] ${message}`,
}))
```

## Compose The Graph

Use `compose(left, right)` when `right` needs services built by `left`.

```ts
import { compose } from '@fuiste/dependencies'

const graph = compose(config, logger)
const built = await build(graph)

if (Result.isOk(built)) {
  Context.get(built.value, Logger).log('ready')
}
```

The type of `graph` knows that `Config` has satisfied `Logger`'s requirement. No container mutation, no decorator metadata, no haunted singleton.

## Run With `use`

`use` builds a graph, passes the resulting context to your function, and closes any scoped resources afterward.

```ts
import { use } from '@fuiste/dependencies'

const result = await use(graph, (context) => {
  return Context.get(context, Logger).log('hello')
})
```

Use `build` when you want to manage the resulting context yourself. Use `use` when you want acquisition and cleanup around a single program.

## Handle Failure

`build` and `use` return `Result` values.

```ts
if (Result.isErr(result)) {
  console.error(result.error._tag)
}
```

Build failures are normalized into `BuildError` variants, so missing services, duplicate outputs, cycles, and construction failures all have explicit shapes.
