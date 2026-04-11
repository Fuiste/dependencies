import type * as Context from './context.js'
import * as Context_ from './context.js'
import type { BuildError } from './errors.js'
import * as BuildError_ from './errors.js'
import type { Result as ResultType } from './result.js'
import * as Result from './result.js'
import type * as Scope from './scope.js'
import * as Scope_ from './scope.js'

type AnyTag = Context.Tag.Any

type RequirementList = readonly AnyTag[]

type MaybeResult<A, E> = A | ResultType<A, E>

type MaybePromise<A> = A | Promise<A>

type ScopedValue<A> = {
  readonly service: A
  readonly release: Scope.Finalizer
}

const missingRequirement = Symbol('missing_requirement')

export const DependencyTypeId: unique symbol = Symbol.for('@fuiste/dependencies/Dependency') as typeof DependencyTypeId

export type DependencyTypeId = typeof DependencyTypeId

const dependencyVariance = {
  _Provides: undefined,
  _Error: undefined,
  _Requires: undefined,
}

export interface Dependency<Provides extends AnyTag = never, Error = never, Requires extends AnyTag = never> {
  readonly [DependencyTypeId]: {
    readonly _Provides: Provides
    readonly _Error: Error
    readonly _Requires: Requires
  }
  readonly _tag:
    | 'succeed'
    | 'sync'
    | 'async'
    | 'scoped'
    | 'fromContext'
    | 'compose'
    | 'merge'
    | 'provide'
    | 'override'
  readonly provides: readonly AnyTag[]
  readonly requires: readonly AnyTag[]
  readonly label: string
}

export declare namespace Dependency {
  export type Any = Dependency<AnyTag, any, AnyTag>
  export type Provides<T extends Any> = T extends Dependency<infer Out, any, any> ? Out : never
  export type Error<T extends Any> = T extends Dependency<any, infer Err, any> ? Err : never
  export type Requires<T extends Any> = T extends Dependency<any, any, infer In> ? In : never
}

export type Provides<T extends Dependency.Any> = Dependency.Provides<T>
export type Error<T extends Dependency.Any> = Dependency.Error<T>
export type Requires<T extends Dependency.Any> = Dependency.Requires<T>

type SucceedDependency<TTag extends AnyTag> = Dependency<TTag, never, never> & {
  readonly _tag: 'succeed'
  readonly serviceTag: TTag
  readonly service: Context.Context.Service<TTag>
}

type SyncDependency<TTag extends AnyTag, Err, Req extends AnyTag> = Dependency<TTag, Err, Req> & {
  readonly _tag: 'sync'
  readonly serviceTag: TTag
  readonly evaluate: (context: Context.Context<Req>) => MaybeResult<Context.Context.Service<TTag>, Err>
}

type AsyncDependency<TTag extends AnyTag, Err, Req extends AnyTag> = Dependency<TTag, Err, Req> & {
  readonly _tag: 'async'
  readonly serviceTag: TTag
  readonly evaluate: (context: Context.Context<Req>) => MaybePromise<MaybeResult<Context.Context.Service<TTag>, Err>>
}

type ScopedDependency<TTag extends AnyTag, Err, Req extends AnyTag> = Dependency<TTag, Err, Req> & {
  readonly _tag: 'scoped'
  readonly serviceTag: TTag
  readonly acquire: (context: Context.Context<Req>) => MaybePromise<MaybeResult<ScopedValue<Context.Context.Service<TTag>>, Err>>
}

type FromContextDependency<Provides extends AnyTag> = Dependency<Provides, never, never> & {
  readonly _tag: 'fromContext'
  readonly context: Context.Context<Provides>
}

type ComposeDependency<Left extends Dependency.Any, Right extends Dependency.Any> = Dependency<
  Dependency.Provides<Left> | Dependency.Provides<Right>,
  Dependency.Error<Left> | Dependency.Error<Right>,
  Dependency.Requires<Left> | Exclude<Dependency.Requires<Right>, Dependency.Provides<Left>>
> & {
  readonly _tag: 'compose'
  readonly left: Left
  readonly right: Right
}

type MergeDependency<TDependencies extends readonly [Dependency.Any, ...Dependency.Any[]]> = Dependency<
  Dependency.Provides<TDependencies[number]>,
  Dependency.Error<TDependencies[number]>,
  Dependency.Requires<TDependencies[number]>
> & {
  readonly _tag: 'merge'
  readonly dependencies: TDependencies
}

type ProvideDependency<Self extends Dependency.Any, Source extends Dependency.Any | Context.Context<any>> =
  Dependency<
    Dependency.Provides<Self>,
    Source extends Dependency.Any ? Dependency.Error<Self> | Dependency.Error<Source> : Dependency.Error<Self>,
    Source extends Dependency.Any
      ? Exclude<Dependency.Requires<Self>, Dependency.Provides<Source>> | Dependency.Requires<Source>
      : Exclude<Dependency.Requires<Self>, Source extends Context.Context<infer Services> ? Services : never>
  > & {
    readonly _tag: 'provide'
    readonly self: Self
    readonly source: Source
  }

type OverrideDependency<Live extends Dependency.Any, Test extends Dependency.Any> = Dependency<
  Dependency.Provides<Live> | Dependency.Provides<Test>,
  Dependency.Error<Live> | Dependency.Error<Test>,
  Dependency.Requires<Test> | Exclude<Dependency.Requires<Live>, Dependency.Provides<Test>>
> & {
  readonly _tag: 'override'
  readonly live: Live
  readonly test: Test
}

type RuntimeDependency =
  | SucceedDependency<any>
  | SyncDependency<any, any, any>
  | AsyncDependency<any, any, any>
  | ScopedDependency<any, any, any>
  | FromContextDependency<any>
  | ComposeDependency<any, any>
  | MergeDependency<readonly [Dependency.Any, ...Dependency.Any[]]>
  | ProvideDependency<any, any>
  | OverrideDependency<any, any>

type BuildContextResult<E> = ResultType<Context.Context<any>, BuildError<E>>

export type BuildOptions = {
  readonly scope?: Scope.Scope
}

type MemoEntry = {
  readonly envKey: readonly unknown[]
  promise: Promise<BuildContextResult<any>>
}

type BuildState = {
  readonly memo: Map<RuntimeDependency, MemoEntry[]>
  readonly scope?: Scope.Scope
}

const makeBase = <Provides extends AnyTag, Error, Requires extends AnyTag>(
  fields: Omit<Dependency<Provides, Error, Requires>, typeof DependencyTypeId>,
): Dependency<Provides, Error, Requires> =>
  ({
    [DependencyTypeId]: dependencyVariance as unknown as Dependency<Provides, Error, Requires>[typeof DependencyTypeId],
    ...fields,
  }) as Dependency<Provides, Error, Requires>

const sameTag = (left: AnyTag, right: AnyTag): boolean => left.id === right.id

const uniqueTags = (tags: readonly AnyTag[]): readonly AnyTag[] => {
  const seen = new Set<symbol>()
  const next: AnyTag[] = []

  for (const tag of tags) {
    if (seen.has(tag.id)) continue
    seen.add(tag.id)
    next.push(tag)
  }

  return next
}

const subtractTags = (tags: readonly AnyTag[], remove: readonly AnyTag[]): readonly AnyTag[] => {
  if (remove.length === 0) return uniqueTags(tags)
  return uniqueTags(tags.filter((tag) => !remove.some((candidate) => sameTag(candidate, tag))))
}

const normalizeValue = <A, E>(value: MaybeResult<A, E>): ResultType<A, E> =>
  Result.isResult(value) ? (value as ResultType<A, E>) : Result.ok(value)

const isDuplicateDefinitionError = (error: unknown): error is Context_.DuplicateServiceDefinitionError =>
  error instanceof Context_.DuplicateServiceDefinitionError

const dependencyLabel = (kind: string, tag: AnyTag): string => `${kind}(${tag.key})`

const parseRequirements = <Req extends RequirementList, Value>(
  requiresOrEvaluate: readonly [...Req] | Value,
  maybeEvaluate: Value | undefined,
): { readonly requires: readonly AnyTag[]; readonly evaluate: Value } => {
  if (Array.isArray(requiresOrEvaluate)) {
    if (maybeEvaluate === undefined) {
      throw new Error('Expected an evaluation function when requirements are provided')
    }

    return {
      requires: uniqueTags(requiresOrEvaluate),
      evaluate: maybeEvaluate,
    }
  }

  return {
    requires: [],
    evaluate: requiresOrEvaluate as Value,
  }
}

export const isDependency = (value: unknown): value is Dependency.Any =>
  typeof value === 'object' && value !== null && DependencyTypeId in value

export const succeed = <TTag extends AnyTag>(
  tag: TTag,
  service: Context.Context.Service<TTag>,
): Dependency<TTag, never, never> =>
  ({
    ...makeBase<TTag, never, never>({
      _tag: 'succeed',
      provides: [tag],
      requires: [],
      label: dependencyLabel('succeed', tag),
    }),
    serviceTag: tag,
    service,
  }) as SucceedDependency<TTag>

export function sync<TTag extends AnyTag>(
  tag: TTag,
  evaluate: (context: Context.Context<never>) => Context.Context.Service<TTag>,
): Dependency<TTag, never, never>
export function sync<TTag extends AnyTag, Req extends RequirementList>(
  tag: TTag,
  requires: readonly [...Req],
  evaluate: (context: Context.Context<Req[number]>) => Context.Context.Service<TTag>,
): Dependency<TTag, never, Req[number]>
export function sync<TTag extends AnyTag, Err = never>(
  tag: TTag,
  evaluate: (context: Context.Context<never>) => MaybeResult<Context.Context.Service<TTag>, Err>,
): Dependency<TTag, Err, never>
export function sync<TTag extends AnyTag, Req extends RequirementList, Err>(
  tag: TTag,
  requires: readonly [...Req],
  evaluate: (context: Context.Context<Req[number]>) => MaybeResult<Context.Context.Service<TTag>, Err>,
): Dependency<TTag, Err, Req[number]>
export function sync<TTag extends AnyTag, Err = never>(
  tag: TTag,
  requiresOrEvaluate:
    | RequirementList
    | ((context: Context.Context<any>) => MaybeResult<Context.Context.Service<TTag>, Err>),
  maybeEvaluate?: (context: Context.Context<any>) => MaybeResult<Context.Context.Service<TTag>, Err>,
): any {
  const resolved = parseRequirements(requiresOrEvaluate, maybeEvaluate)

  return {
    ...makeBase<TTag, Err, AnyTag>({
      _tag: 'sync',
      provides: [tag],
      requires: resolved.requires,
      label: dependencyLabel('sync', tag),
    }),
    serviceTag: tag,
    evaluate: resolved.evaluate,
  } as SyncDependency<TTag, Err, AnyTag>
}

export function asyncDependency<TTag extends AnyTag>(
  tag: TTag,
  evaluate: (context: Context.Context<never>) => MaybePromise<Context.Context.Service<TTag>>,
): Dependency<TTag, never, never>
export function asyncDependency<TTag extends AnyTag, Req extends RequirementList>(
  tag: TTag,
  requires: readonly [...Req],
  evaluate: (context: Context.Context<Req[number]>) => MaybePromise<Context.Context.Service<TTag>>,
): Dependency<TTag, never, Req[number]>
export function asyncDependency<TTag extends AnyTag, Err = never>(
  tag: TTag,
  evaluate: (context: Context.Context<never>) => MaybePromise<MaybeResult<Context.Context.Service<TTag>, Err>>,
): Dependency<TTag, Err, never>
export function asyncDependency<TTag extends AnyTag, Req extends RequirementList, Err>(
  tag: TTag,
  requires: readonly [...Req],
  evaluate: (context: Context.Context<Req[number]>) => MaybePromise<MaybeResult<Context.Context.Service<TTag>, Err>>,
): Dependency<TTag, Err, Req[number]>
export function asyncDependency<TTag extends AnyTag, Err = never>(
  tag: TTag,
  requiresOrEvaluate:
    | RequirementList
    | ((context: Context.Context<any>) => MaybePromise<MaybeResult<Context.Context.Service<TTag>, Err>>),
  maybeEvaluate?: (context: Context.Context<any>) => MaybePromise<MaybeResult<Context.Context.Service<TTag>, Err>>,
): any {
  const resolved = parseRequirements(requiresOrEvaluate, maybeEvaluate)

  return {
    ...makeBase<TTag, Err, AnyTag>({
      _tag: 'async',
      provides: [tag],
      requires: resolved.requires,
      label: dependencyLabel('async', tag),
    }),
    serviceTag: tag,
    evaluate: resolved.evaluate,
  } as AsyncDependency<TTag, Err, AnyTag>
}

export function scoped<TTag extends AnyTag>(
  tag: TTag,
  acquire: (context: Context.Context<never>) => MaybePromise<ScopedValue<Context.Context.Service<TTag>>>,
): Dependency<TTag, never, never>
export function scoped<TTag extends AnyTag, Req extends RequirementList>(
  tag: TTag,
  requires: readonly [...Req],
  acquire: (context: Context.Context<Req[number]>) => MaybePromise<ScopedValue<Context.Context.Service<TTag>>>,
): Dependency<TTag, never, Req[number]>
export function scoped<TTag extends AnyTag, Err = never>(
  tag: TTag,
  acquire: (context: Context.Context<never>) => MaybePromise<MaybeResult<ScopedValue<Context.Context.Service<TTag>>, Err>>,
): Dependency<TTag, Err, never>
export function scoped<TTag extends AnyTag, Req extends RequirementList, Err>(
  tag: TTag,
  requires: readonly [...Req],
  acquire: (context: Context.Context<Req[number]>) => MaybePromise<MaybeResult<ScopedValue<Context.Context.Service<TTag>>, Err>>,
): Dependency<TTag, Err, Req[number]>
export function scoped<TTag extends AnyTag, Err = never>(
  tag: TTag,
  requiresOrAcquire:
    | RequirementList
    | ((context: Context.Context<any>) => MaybePromise<MaybeResult<ScopedValue<Context.Context.Service<TTag>>, Err>>),
  maybeAcquire?: (context: Context.Context<any>) => MaybePromise<MaybeResult<ScopedValue<Context.Context.Service<TTag>>, Err>>,
): any {
  const resolved = parseRequirements(requiresOrAcquire, maybeAcquire)

  return {
    ...makeBase<TTag, Err, AnyTag>({
      _tag: 'scoped',
      provides: [tag],
      requires: resolved.requires,
      label: dependencyLabel('scoped', tag),
    }),
    serviceTag: tag,
    acquire: resolved.evaluate,
  } as ScopedDependency<TTag, Err, AnyTag>
}

export const fromContext = <Provides extends AnyTag>(context: Context.Context<Provides>): Dependency<Provides, never, never> => {
  const providedTags = Context_.tags(context)

  return {
    ...makeBase<Provides, never, never>({
      _tag: 'fromContext',
      provides: providedTags,
      requires: [],
      label: `fromContext(${providedTags.map((tag) => tag.key).join(', ') || 'empty'})`,
    }),
    context,
  } as FromContextDependency<Provides>
}

export const compose = <Left extends Dependency.Any, Right extends Dependency.Any>(
  left: Left,
  right: Right,
): ComposeDependency<Left, Right> =>
  ({
    ...makeBase<
      Dependency.Provides<Left> | Dependency.Provides<Right>,
      Dependency.Error<Left> | Dependency.Error<Right>,
      Dependency.Requires<Left> | Exclude<Dependency.Requires<Right>, Dependency.Provides<Left>>
    >({
      _tag: 'compose',
      provides: uniqueTags([...left.provides, ...right.provides]),
      requires: uniqueTags([...left.requires, ...subtractTags(right.requires, left.provides)]),
      label: 'compose',
    }),
    left,
    right,
  }) as ComposeDependency<Left, Right>

export const merge = <TDependencies extends readonly [Dependency.Any, ...Dependency.Any[]]>(
  ...dependencies: TDependencies
): MergeDependency<TDependencies> =>
  ({
    ...makeBase<
      Dependency.Provides<TDependencies[number]>,
      Dependency.Error<TDependencies[number]>,
      Dependency.Requires<TDependencies[number]>
    >({
      _tag: 'merge',
      provides: uniqueTags(dependencies.flatMap((dependency) => dependency.provides)),
      requires: uniqueTags(dependencies.flatMap((dependency) => dependency.requires)),
      label: 'merge',
    }),
    dependencies,
  }) as MergeDependency<TDependencies>

export function provide<Self extends Dependency.Any, Services extends AnyTag>(
  self: Self,
  source: Context.Context<Services>,
): Dependency<Dependency.Provides<Self>, Dependency.Error<Self>, Exclude<Dependency.Requires<Self>, Services>>
export function provide<Self extends Dependency.Any, Source extends Dependency.Any>(
  self: Self,
  source: Source,
): Dependency<
  Dependency.Provides<Self>,
  Dependency.Error<Self> | Dependency.Error<Source>,
  Exclude<Dependency.Requires<Self>, Dependency.Provides<Source>> | Dependency.Requires<Source>
>
export function provide<Self extends Dependency.Any>(
  self: Self,
  source: Context.Context<any> | Dependency.Any,
): any {
  const providedTags = Context_.isContext(source) ? Context_.tags(source) : source.provides
  const requiredBySource = Context_.isContext(source) ? [] : source.requires

  return {
    ...makeBase<any, any, any>({
      _tag: 'provide',
      provides: self.provides,
      requires: uniqueTags([...subtractTags(self.requires, providedTags), ...requiredBySource]),
      label: 'provide',
    }),
    self,
    source,
  } as ProvideDependency<Self, Context.Context<any> | Dependency.Any>
}

export const override = <Live extends Dependency.Any, Test extends Dependency.Any>(
  live: Live,
  test: Test,
): OverrideDependency<Live, Test> =>
  ({
    ...makeBase<
      Dependency.Provides<Live> | Dependency.Provides<Test>,
      Dependency.Error<Live> | Dependency.Error<Test>,
      Dependency.Requires<Test> | Exclude<Dependency.Requires<Live>, Dependency.Provides<Test>>
    >({
      _tag: 'override',
      provides: uniqueTags([...live.provides, ...test.provides]),
      requires: uniqueTags([...test.requires, ...subtractTags(live.requires, test.provides)]),
      label: 'override',
    }),
    live,
    test,
  }) as OverrideDependency<Live, Test>

const sameEnvKey = (left: readonly unknown[], right: readonly unknown[]): boolean => {
  if (left.length !== right.length) return false

  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) return false
  }

  return true
}

const environmentKey = (dependency: RuntimeDependency, environment: Context.Context<any>): readonly unknown[] =>
  dependency.requires.map((tag) => (Context_.has(environment, tag) ? Context_.unsafeGet(environment, tag) : missingRequirement))

const ensureRequirements = <E>(
  dependency: RuntimeDependency,
  environment: Context.Context<any>,
  path: readonly string[],
): ResultType<void, BuildError<E>> => {
  for (const tag of dependency.requires) {
    if (!Context_.has(environment, tag)) {
      return Result.err(BuildError_.missingService(tag, path))
    }
  }

  return Result.ok(undefined)
}

const mergeStrictly = <E>(
  left: Context.Context<any>,
  right: Context.Context<any>,
  path: readonly string[],
): BuildContextResult<E> => {
  try {
    return Result.ok(Context_.merge(left, right))
  } catch (error) {
    if (isDuplicateDefinitionError(error)) {
      return Result.err(BuildError_.duplicateService(error.tag, path))
    }

    throw error
  }
}

const evaluateProviderSource = async (
  source: Context.Context<any> | RuntimeDependency,
  environment: Context.Context<any>,
  state: BuildState,
  path: readonly string[],
  active: ReadonlySet<MemoEntry>,
): Promise<BuildContextResult<any>> => {
  if (Context_.isContext(source)) {
    return Result.ok(source)
  }

  return evaluate(source, environment, state, path, active)
}

const runSyncLike = async <E>(
  dependency: SyncDependency<any, E, any> | AsyncDependency<any, E, any>,
  environment: Context.Context<any>,
  path: readonly string[],
): Promise<BuildContextResult<E>> => {
  const validated = ensureRequirements<E>(dependency, environment, path)
  if (Result.isErr(validated)) return validated

  try {
    const resolved = normalizeValue(await dependency.evaluate(environment as Context.Context<any>))

    if (Result.isErr(resolved)) {
      return Result.err(BuildError_.constructionError<E>(dependency.label, path, resolved.error as E))
    }

    return Result.ok(Context_.of(dependency.serviceTag, resolved.value))
  } catch (defect) {
    return Result.err(BuildError_.constructionDefect<E>(dependency.label, path, defect))
  }
}

const runScoped = async <E>(
  dependency: ScopedDependency<any, E, any>,
  environment: Context.Context<any>,
  state: BuildState,
  path: readonly string[],
): Promise<BuildContextResult<E>> => {
  const validated = ensureRequirements<E>(dependency, environment, path)
  if (Result.isErr(validated)) return validated

  if (!state.scope) {
    return Result.err(
      BuildError_.constructionDefect(
        dependency.label,
        path,
        new Error('Scoped dependencies require an explicit scope. Pass { scope } to build or use use().'),
      ),
    )
  }

  try {
    const resolved = normalizeValue(await dependency.acquire(environment as Context.Context<any>))

    if (Result.isErr(resolved)) {
      return Result.err(BuildError_.constructionError<E>(dependency.label, path, resolved.error as E))
    }

    Scope_.addFinalizer(state.scope, resolved.value.release)
    return Result.ok(Context_.of(dependency.serviceTag, resolved.value.service))
  } catch (defect) {
    return Result.err(BuildError_.constructionDefect<E>(dependency.label, path, defect))
  }
}

const evaluateFresh = async (
  dependency: RuntimeDependency,
  environment: Context.Context<any>,
  state: BuildState,
  path: readonly string[],
  active: ReadonlySet<MemoEntry>,
): Promise<BuildContextResult<any>> => {
  switch (dependency._tag) {
    case 'succeed':
      return Result.ok(Context_.of(dependency.serviceTag, dependency.service))

    case 'fromContext':
      return Result.ok(dependency.context)

    case 'sync':
    case 'async':
      return runSyncLike(dependency, environment, path)

    case 'scoped':
      return runScoped(dependency, environment, state, path)

    case 'compose': {
      const leftResult = await evaluate(dependency.left as RuntimeDependency, environment, state, path, active)
      if (Result.isErr(leftResult)) return leftResult

      const environmentWithLeft = Context_.override(environment, leftResult.value)
      const rightResult = await evaluate(dependency.right as RuntimeDependency, environmentWithLeft, state, path, active)
      if (Result.isErr(rightResult)) return rightResult

      return mergeStrictly(leftResult.value, rightResult.value, path)
    }

    case 'merge': {
      const results = await Promise.all(
        dependency.dependencies.map((child) => evaluate(child as RuntimeDependency, environment, state, path, active)),
      )

      for (const result of results) {
        if (Result.isErr(result)) return result as BuildContextResult<any>
      }

      let combined = Context_.empty()

      for (const result of results) {
        const value = (result as Result.Ok<Context.Context<any>>).value
        const merged = mergeStrictly(combined, value, path)
        if (Result.isErr(merged)) return merged
        combined = merged.value
      }

      return Result.ok(combined)
    }

    case 'provide': {
      const sourceResult = await evaluateProviderSource(dependency.source as Context.Context<any> | RuntimeDependency, environment, state, path, active)
      if (Result.isErr(sourceResult)) return sourceResult

      const providedEnvironment = Context_.override(environment, sourceResult.value)
      return evaluate(dependency.self as RuntimeDependency, providedEnvironment, state, path, active)
    }

    case 'override': {
      const testResult = await evaluate(dependency.test as RuntimeDependency, environment, state, path, active)
      if (Result.isErr(testResult)) return testResult

      const environmentWithTest = Context_.override(environment, testResult.value)
      const liveResult = await evaluate(dependency.live as RuntimeDependency, environmentWithTest, state, path, active)
      if (Result.isErr(liveResult)) return liveResult

      return Result.ok(Context_.override(liveResult.value, testResult.value))
    }
  }
}

const evaluate = async (
  dependency: RuntimeDependency,
  environment: Context.Context<any>,
  state: BuildState,
  path: readonly string[],
  active: ReadonlySet<MemoEntry>,
): Promise<BuildContextResult<any>> => {
  const currentPath = [...path, dependency.label]
  const envKey = environmentKey(dependency, environment)
  const existingEntries = state.memo.get(dependency)
  const existing = existingEntries?.find((entry) => sameEnvKey(entry.envKey, envKey))

  if (existing) {
    if (active.has(existing)) {
      return Result.err(BuildError_.circularDependency(dependency.label, currentPath))
    }

    return existing.promise
  }

  const entry: MemoEntry = {
    envKey,
    promise: Promise.resolve(Result.err(BuildError_.circularDependency(dependency.label, currentPath)) as BuildContextResult<any>),
  }

  const nextEntries = existingEntries ? [...existingEntries, entry] : [entry]
  state.memo.set(dependency, nextEntries)

  const nextActive = new Set(active)
  nextActive.add(entry)

  entry.promise = evaluateFresh(dependency, environment, state, currentPath, nextActive)
  return entry.promise
}

export const build = async <Provides extends AnyTag, Err, Requires extends AnyTag>(
  dependency: Dependency<Provides, Err, Requires>,
  options: BuildOptions = {},
): Promise<ResultType<Context.Context<Provides>, BuildError<Err>>> => {
  const state: BuildState = options.scope ? { memo: new Map(), scope: options.scope } : { memo: new Map() }

  try {
    return (await evaluate(dependency as RuntimeDependency, Context_.empty(), state, [], new Set())) as ResultType<
      Context.Context<Provides>,
      BuildError<Err>
    >
  } catch (defect) {
    return Result.err(BuildError_.constructionDefect('build', ['build'], defect))
  }
}

const closeScopeSafely = async (scope: Scope.Scope): Promise<ResultType<void, BuildError<never>>> => {
  try {
    await Scope_.close(scope)
    return Result.ok(undefined)
  } catch (defect) {
    return Result.err(BuildError_.constructionDefect('Scope.close', ['use', 'Scope.close'], defect))
  }
}

export const use = async <Provides extends AnyTag, Err, A>(
  dependency: Dependency<Provides, Err, any>,
  consume: (context: Context.Context<Provides>) => MaybePromise<A>,
): Promise<ResultType<A, BuildError<Err>>> => {
  const scope = Scope_.make()
  const built = await build(dependency, { scope })

  if (Result.isErr(built)) {
    await closeScopeSafely(scope)
    return built
  }

  try {
    const value = await consume(built.value)
    const closed = await closeScopeSafely(scope)

    if (Result.isErr(closed)) {
      return closed as ResultType<A, BuildError<Err>>
    }

    return Result.ok(value)
  } catch (defect) {
    const closed = await closeScopeSafely(scope)

    if (Result.isErr(closed)) {
      return closed as ResultType<A, BuildError<Err>>
    }

    return Result.err(BuildError_.constructionDefect('use', ['use'], defect))
  }
}

export { asyncDependency as async }
