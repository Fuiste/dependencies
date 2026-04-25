export * as Context from './context.js'
export * as Dependency from './dependency.js'
export * as Result from './result.js'
export * as Scope from './scope.js'

export type { Context as ContextValue, Tag as ContextTag } from './context.js'
export type {
  Dependency as DependencyValue,
  BuildOptions,
} from './dependency.js'
export type { BuildError } from './errors.js'
export type { Result as ResultValue } from './result.js'
export type { Scope as ScopeValue, Finalizer } from './scope.js'

export { TagTypeId, ContextTypeId } from './context.js'
export { DependencyTypeId } from './dependency.js'
export { ScopeTypeId } from './scope.js'

export {
  Tag,
  empty,
  of,
  add,
  has,
  get,
  unsafeGet,
  merge as mergeContext,
} from './context.js'

export {
  succeed,
  sync,
  asyncDependency as async,
  scoped,
  fromContext,
  compose,
  merge,
  provide,
  override,
  build,
  use,
  isDependency,
} from './dependency.js'

export {
  ok,
  err,
  isOk,
  isErr,
  isResult,
  map,
  mapError,
  match,
} from './result.js'
export { make, addFinalizer, close, isScope } from './scope.js'
