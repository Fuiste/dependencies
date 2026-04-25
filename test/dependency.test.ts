import { describe, expect, it } from 'vitest'
import {
  Context,
  Dependency,
  Result,
  Scope,
  build,
  compose,
  merge,
  override,
  provide,
  use,
} from '../src'

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

describe('Dependency', () => {
  it('builds pure dependencies', async () => {
    const Name = Context.Tag<string>('pure/name')
    const dependency = Dependency.succeed(Name, 'Ada')
    const built = await build(dependency)

    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, Name)).toBe('Ada')
  })

  it('builds async dependencies', async () => {
    const Value = Context.Tag<number>('async/value')
    const dependency = Dependency.async(Value, async () => {
      await sleep(10)
      return 42
    })

    const built = await build(dependency)
    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, Value)).toBe(42)
  })

  it('supports compose and requirement elimination', async () => {
    const Config = Context.Tag<{ prefix: string }>('compose/config')
    const Logger = Context.Tag<{ log: (message: string) => string }>(
      'compose/logger',
    )
    const Message = Context.Tag<string>('compose/message')

    const config = Dependency.succeed(Config, { prefix: 'hello' })
    const logger = Dependency.sync(Logger, [Config], (context) => {
      const { prefix } = Context.get(context, Config)
      return { log: (message: string) => `${prefix}:${message}` }
    })
    const message = Dependency.sync(Message, [Logger], (context) =>
      Context.get(context, Logger).log('world'),
    )

    const built = await build(compose(config, compose(logger, message)))
    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, Message)).toBe('hello:world')
  })

  it('builds merge branches concurrently', async () => {
    const A = Context.Tag<number>('merge/a')
    const B = Context.Tag<number>('merge/b')

    const left = Dependency.async(A, async () => {
      await sleep(60)
      return 1
    })
    const right = Dependency.async(B, async () => {
      await sleep(60)
      return 2
    })

    const startedAt = Date.now()
    const built = await build(merge(left, right))
    const elapsed = Date.now() - startedAt

    expect(Result.isOk(built)).toBe(true)
    expect(elapsed).toBeLessThan(110)
  })

  it('memoizes reused dependencies within a build', async () => {
    const Shared = Context.Tag<{ value: number }>('memo/shared')
    const Left = Context.Tag<number>('memo/left')
    const Right = Context.Tag<number>('memo/right')

    let builds = 0

    const shared = Dependency.async(Shared, async () => {
      builds += 1
      await sleep(20)
      return { value: 7 }
    })

    const left = Dependency.sync(
      Left,
      [Shared],
      (context) => Context.get(context, Shared).value,
    )
    const right = Dependency.sync(
      Right,
      [Shared],
      (context) => Context.get(context, Shared).value * 2,
    )

    const graph = merge(provide(left, shared), provide(right, shared))
    const built = await build(graph)

    expect(Result.isOk(built)).toBe(true)
    expect(builds).toBe(1)
  })

  it('supports scoped resources with manual scope closing', async () => {
    const Connection = Context.Tag<{ id: string }>('scope/connection')
    const events: string[] = []

    const connection = Dependency.scoped(Connection, async () => {
      events.push('acquire')
      return {
        service: { id: 'conn-1' },
        release: async () => {
          events.push('release')
        },
      }
    })

    const scope = Scope.make()
    const built = await build(connection, { scope })

    expect(Result.isOk(built)).toBe(true)
    expect(events).toEqual(['acquire'])

    await Scope.close(scope)
    expect(events).toEqual(['acquire', 'release'])
  })

  it('supports use for scoped resources', async () => {
    const Connection = Context.Tag<{ id: string }>('scope/use-connection')
    const events: string[] = []

    const connection = Dependency.scoped(Connection, () => ({
      service: { id: 'conn-2' },
      release: () => {
        events.push('release')
      },
    }))

    const result = await use(connection, async (context) => {
      events.push(`using:${Context.get(context, Connection).id}`)
      return 'done'
    })

    expect(Result.isOk(result)).toBe(true)
    expect(events).toEqual(['using:conn-2', 'release'])
  })

  it('reports missing services', async () => {
    const Config = Context.Tag<{ host: string }>('error/config')
    const Logger = Context.Tag<string>('error/logger')

    const logger = Dependency.sync(
      Logger,
      [Config],
      (context) => Context.get(context, Config).host,
    )
    const built = await build(logger)

    expect(Result.isErr(built)).toBe(true)
    if (Result.isOk(built)) throw new Error('expected failure')
    expect(built.error._tag).toBe('missing_service')
    if (built.error._tag === 'missing_service') {
      expect(built.error.tag.key).toBe('error/config')
    }
  })

  it('reports duplicate output services', async () => {
    const Value = Context.Tag<number>('error/duplicate')
    const left = Dependency.succeed(Value, 1)
    const right = Dependency.succeed(Value, 2)

    const built = await build(merge(left, right))
    expect(Result.isErr(built)).toBe(true)
    if (Result.isOk(built)) throw new Error('expected failure')
    expect(built.error._tag).toBe('duplicate_service')
  })

  it('detects circular dependencies', async () => {
    const Value = Context.Tag<number>('error/cycle')
    const base = Dependency.succeed(Value, 1)
    const loop = provide(base, Context.empty()) as ReturnType<
      typeof provide<typeof base, Context.Context<any>>
    > & {
      source: any
    }

    loop.source = loop

    const built = await build(loop)
    expect(Result.isErr(built)).toBe(true)
    if (Result.isOk(built)) throw new Error('expected failure')
    expect(built.error._tag).toBe('circular_dependency')
  })

  it('supports overrides for testing', async () => {
    const Database = Context.Tag<{ kind: string }>('override/database')
    const App = Context.Tag<{ run: () => string }>('override/app')

    const app = Dependency.sync(App, [Database], (context) => ({
      run: () => `db:${Context.get(context, Database).kind}`,
    }))

    const testDatabase = Dependency.succeed(Database, { kind: 'test' })
    const built = await build(override(app, testDatabase))

    expect(Result.isOk(built)).toBe(true)
    if (Result.isErr(built)) throw new Error('expected success')
    expect(Context.get(built.value, App).run()).toBe('db:test')
    expect(Context.get(built.value, Database).kind).toBe('test')
  })
})
