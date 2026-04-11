# `@fuiste/dependencies`

Type-safe, functional dependency composition for TypeScript.

This library is inspired by Effect's `Layer`, but keeps the surface area small and focused around two ideas:

- `Context`: an immutable collection of services addressed by typed tags.
- `Dependency`: a recipe for building one or more tagged services, possibly from other tagged services.

The goal is to make application wiring feel like the rest of your functional code: explicit, composable, typed, and easy to test.

## Installation

```bash
pnpm add @fuiste/dependencies
```

## Core Ideas

- `Context.Tag<Service>('name')` creates a typed service identifier.
- `Context` stores concrete services.
- `Dependency.succeed`, `Dependency.sync`, `Dependency.async`, and `Dependency.scoped` create dependency recipes.
- `compose(left, right)` feeds `left` outputs into `right` requirements and keeps both outputs.
- `merge(a, b)` builds independent dependencies concurrently.
- `provide(dep, source)` satisfies requirements without exposing the source outputs.
- `override(live, test)` swaps or supplements services for tests and local customization.
- `build(dep)` builds a graph into a `Result` containing a `Context`.
- `use(dep, fn)` is the simplest way to acquire dependencies, run some code, and automatically close scoped resources.

## Quick Start

```ts
import { Context, Dependency, Result, compose, use } from '@fuiste/dependencies'

const Config = Context.Tag<{ appName: string }>('readme/quick/config')
const Greeter = Context.Tag<{ greet: () => string }>('readme/quick/greeter')

const config = Dependency.succeed(Config, { appName: 'Dependencies' })
const greeter = Dependency.sync(Greeter, [Config], (context) => ({
  greet: () => `hello from ${Context.get(context, Config).appName}`,
}))

const result = await use(compose(config, greeter), (context) => {
  return Context.get(context, Greeter).greet()
})

if (Result.isOk(result)) {
  console.log(result.value)
}
```

## Composition

A realistic graph usually reads like a pipeline.

```ts
import { Context, Dependency, Result, build, compose } from '@fuiste/dependencies'

const Config = Context.Tag<{ prefix: string }>('readme/compose/config')
const Logger = Context.Tag<{ log: (message: string) => string }>('readme/compose/logger')
const Database = Context.Tag<{ query: (sql: string) => string }>('readme/compose/database')
const App = Context.Tag<{ start: () => string }>('readme/compose/app')

const config = Dependency.succeed(Config, { prefix: 'demo' })

const logger = Dependency.sync(Logger, [Config], (context) => ({
  log: (message: string) => `[${Context.get(context, Config).prefix}] ${message}`,
}))

const database = Dependency.sync(Database, [Logger], (context) => ({
  query: (sql: string) => Context.get(context, Logger).log(`query:${sql}`),
}))

const app = Dependency.sync(App, [Database], (context) => ({
  start: () => Context.get(context, Database).query('select 1'),
}))

const program = compose(config, compose(logger, compose(database, app)))
const built = await build(program)

if (Result.isOk(built)) {
  console.log(Context.get(built.value, App).start())
}
```

A few useful rules of thumb:

- Use `compose` when the right-hand dependency needs outputs from the left.
- Use `merge` when the branches are independent and can be built in parallel.
- Use `provide` when you want to satisfy requirements without carrying the provider's outputs forward.

## Scoped Resources

`Dependency.scoped` is for resources that must be released. You can either manage the scope yourself with `build`, or let `use` do it for you.

### Manual Scope

```ts
import { Context, Dependency, Result, Scope, build } from '@fuiste/dependencies'

const Database = Context.Tag<{ query: () => string }>('readme/scope/database')

const database = Dependency.scoped(Database, () => ({
  service: { query: () => 'ok' },
  release: () => {
    console.log('closing database')
  },
}))

const scope = Scope.make()
const built = await build(database, { scope })

if (Result.isOk(built)) {
  console.log(Context.get(built.value, Database).query())
}

await Scope.close(scope)
```

### Automatic Scope With `use`

```ts
import { Context, Dependency, use } from '@fuiste/dependencies'

const Connection = Context.Tag<{ id: string }>('scope/use-connection')

const connection = Dependency.scoped(Connection, () => ({
  service: { id: 'conn-2' },
  release: () => {
    console.log('released')
  },
}))

await use(connection, async (context) => {
  console.log(Context.get(context, Connection).id)
})
```

## Testing And Overrides

Because dependencies are plain values, testing is usually just graph substitution.

```ts
import { Context, Dependency, Result, build, override } from '@fuiste/dependencies'

const Repository = Context.Tag<{ source: string }>('readme/override/repository')
const App = Context.Tag<{ source: () => string }>('readme/override/app')

const app = Dependency.sync(App, [Repository], (context) => ({
  source: () => Context.get(context, Repository).source,
}))

const inMemoryRepository = Dependency.succeed(Repository, { source: 'memory' })
const built = await build(override(app, inMemoryRepository))

if (Result.isOk(built)) {
  console.log(Context.get(built.value, App).source())
}
```

`override` is especially useful when you want a test dependency to satisfy requirements and win over a live service with the same tag.

## Result Shape

`build` and `use` return a small `Result` value:

```ts
type Result<A, E> =
  | { _tag: 'ok'; value: A }
  | { _tag: 'err'; error: E }
```

Build failures use a normalized `BuildError` shape:

- `missing_service`
- `duplicate_service`
- `circular_dependency`
- `construction_failed`

`construction_failed` distinguishes between typed errors returned as `Result.err(...)` and unexpected defects such as thrown exceptions.

## API Sketch

### Context

```ts
const tag = Context.Tag<Service>('service/name')
const empty = Context.empty()
const single = Context.of(tag, service)
const next = Context.add(single, otherTag, otherService)
const hasTag = Context.has(next, tag)
const service = Context.get(next, tag)
const merged = Context.merge(left, right)
```

### Dependency

```ts
const live = Dependency.succeed(tag, value)
const syncDep = Dependency.sync(tag, [OtherTag], (context) => service)
const asyncDep = Dependency.async(tag, [OtherTag], async (context) => service)
const scopedDep = Dependency.scoped(tag, [OtherTag], async (context) => ({
  service,
  release: async () => {},
}))

const graph = compose(a, b)
const parallel = merge(a, b)
const provided = provide(graph, source)
const swapped = override(live, test)

const built = await build(graph)
const result = await use(graph, (context) => run(context))
```

## Notes

- Tags are stable by key, so `Context.Tag<Service>('logger')` always refers to the same runtime tag for that key.
- Ordinary context merges and ordinary dependency composition reject duplicate output services.
- `override` is the explicit escape hatch when one service should win over another.
- Scoped dependencies require an explicit scope when you call `build`. If you do not want to manage that yourself, use `use`.
