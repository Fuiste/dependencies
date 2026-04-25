---
title: App Wiring
description: A practical pattern for composing configuration, infrastructure, and application services.
section: Recipes
navTitle: App Wiring
order: 310
---

# App Wiring

Keep dependency definitions near the services they construct, then compose a small root graph at the edge of the program.

```ts
const Config = Context.Tag<{ databaseUrl: string }>('app/config')
const Database = Context.Tag<{ query: (sql: string) => Promise<unknown> }>(
  'app/database',
)
const App = Context.Tag<{ start: () => Promise<void> }>('app')

const config = Dependency.succeed(Config, {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://localhost/app',
})

const database = Dependency.scoped(Database, [Config], async (context) => {
  const client = await connect(Context.get(context, Config).databaseUrl)

  return {
    service: { query: (sql) => client.query(sql) },
    release: () => client.close(),
  }
})

const app = Dependency.sync(App, [Database], (context) => ({
  start: async () => {
    await Context.get(context, Database).query('select 1')
  },
}))

export const live = compose(config, compose(database, app))
```

At the executable boundary:

```ts
const result = await use(live, (context) => Context.get(context, App).start())
```

This keeps construction at the edge and normal code as boring service calls. Boring service calls are good. We have suffered enough.
