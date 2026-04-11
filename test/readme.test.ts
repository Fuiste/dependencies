import { describe, expect, it } from 'vitest'
import { Context, Dependency, Result, Scope, build, compose, override, use } from '../src'

describe('README examples', () => {
  it('quick start example works', async () => {
    const Config = Context.Tag<{ appName: string }>('readme/quick/config')
    const Greeter = Context.Tag<{ greet: () => string }>('readme/quick/greeter')

    const config = Dependency.succeed(Config, { appName: 'Dependencies' })
    const greeter = Dependency.sync(Greeter, [Config], (context) => ({
      greet: () => `hello from ${Context.get(context, Config).appName}`,
    }))

    const result = await use(compose(config, greeter), (context) => Context.get(context, Greeter).greet())
    expect(result).toEqual(Result.ok('hello from Dependencies'))
  })

  it('composition example works', async () => {
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

    const built = await build(compose(config, compose(logger, compose(database, app))))

    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, App).start()).toBe('[demo] query:select 1')
  })

  it('scoped resources example works', async () => {
    const Database = Context.Tag<{ query: () => string }>('readme/scope/database')
    const events: string[] = []

    const database = Dependency.scoped(Database, () => ({
      service: { query: () => 'ok' },
      release: () => {
        events.push('closed')
      },
    }))

    const scope = Scope.make()
    const built = await build(database, { scope })

    expect(Result.isOk(built)).toBe(true)
    await Scope.close(scope)
    expect(events).toEqual(['closed'])
  })

  it('testing and override example works', async () => {
    const Repository = Context.Tag<{ source: string }>('readme/override/repository')
    const App = Context.Tag<{ source: () => string }>('readme/override/app')

    const app = Dependency.sync(App, [Repository], (context) => ({
      source: () => Context.get(context, Repository).source,
    }))
    const inMemoryRepository = Dependency.succeed(Repository, { source: 'memory' })

    const built = await build(override(app, inMemoryRepository))
    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, App).source()).toBe('memory')
  })
})
