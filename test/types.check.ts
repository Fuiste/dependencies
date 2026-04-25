import { Context, Dependency, build, compose, override, provide } from '../src'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false

type Expect<T extends true> = T

const Config = Context.Tag<{ prefix: string }>('types/config')
const Logger = Context.Tag<{ log: (message: string) => string }>('types/logger')
const Database = Context.Tag<{ query: () => string }>('types/database')
const App = Context.Tag<{ start: () => string }>('types/app')

const config = Dependency.succeed(Config, { prefix: 'demo' })
const logger = Dependency.sync(Logger, [Config], (context) => ({
  log: (message: string) => `${Context.get(context, Config).prefix}:${message}`,
}))
const database = Dependency.sync(Database, [Logger], (context) => ({
  query: () => Context.get(context, Logger).log('query'),
}))
const app = Dependency.sync(App, [Database], (context) => ({
  start: () => Context.get(context, Database).query(),
}))

type LoggerRequires = Dependency.Requires<typeof logger>
type LoggerProvides = Dependency.Provides<typeof logger>
type LoggerError = Dependency.Error<typeof logger>
type _LoggerRequires = Expect<Equal<LoggerRequires, typeof Config>>
type _LoggerProvides = Expect<Equal<LoggerProvides, typeof Logger>>
type _LoggerError = Expect<Equal<LoggerError, never>>

const withLogger = compose(config, logger)
type WithLoggerRequires = Dependency.Requires<typeof withLogger>
type _WithLoggerRequires = Expect<Equal<WithLoggerRequires, never>>

const withDatabase = compose(withLogger, database)
type WithDatabaseRequires = Dependency.Requires<typeof withDatabase>
type _WithDatabaseRequires = Expect<Equal<WithDatabaseRequires, never>>

const _providedApp = provide(app, database)
type ProvidedAppRequires = Dependency.Requires<typeof _providedApp>
type _ProvidedAppRequires = Expect<Equal<ProvidedAppRequires, typeof Logger>>

const _overriddenApp = override(
  app,
  Dependency.succeed(Database, { query: () => 'test' }),
)
type OverriddenRequires = Dependency.Requires<typeof _overriddenApp>
type _OverriddenRequires = Expect<Equal<OverriddenRequires, never>>

async function verifyBuildInference(): Promise<void> {
  const built = await build(compose(withDatabase, app))

  if (built._tag === 'ok') {
    const appService = Context.get(built.value, App)
    appService.start()

    // @ts-expect-error Missing service should not be available in the built app context.
    Context.get(built.value, Context.Tag<number>('types/missing'))
  }
}

void verifyBuildInference()
