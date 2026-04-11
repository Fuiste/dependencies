import type * as Context from './context.js'

export type MissingServiceError = {
  readonly _tag: 'missing_service'
  readonly tag: Context.Tag.Any
  readonly path: readonly string[]
}

export type DuplicateServiceError = {
  readonly _tag: 'duplicate_service'
  readonly tag: Context.Tag.Any
  readonly path: readonly string[]
}

export type CircularDependencyError = {
  readonly _tag: 'circular_dependency'
  readonly dependency: string
  readonly path: readonly string[]
}

export type ConstructionFailedError<E> = {
  readonly _tag: 'construction_failed'
  readonly dependency: string
  readonly path: readonly string[]
  readonly cause: 'error' | 'defect'
  readonly error?: E
  readonly defect?: unknown
}

export type BuildError<E> =
  | MissingServiceError
  | DuplicateServiceError
  | CircularDependencyError
  | ConstructionFailedError<E>

export const missingService = <E = never>(tag: Context.Tag.Any, path: readonly string[]): BuildError<E> => ({
  _tag: 'missing_service',
  tag,
  path,
})

export const duplicateService = <E = never>(tag: Context.Tag.Any, path: readonly string[]): BuildError<E> => ({
  _tag: 'duplicate_service',
  tag,
  path,
})

export const circularDependency = <E = never>(dependency: string, path: readonly string[]): BuildError<E> => ({
  _tag: 'circular_dependency',
  dependency,
  path,
})

export const constructionError = <E>(dependency: string, path: readonly string[], error: E): BuildError<E> => ({
  _tag: 'construction_failed',
  dependency,
  path,
  cause: 'error',
  error,
})

export const constructionDefect = <E = never>(
  dependency: string,
  path: readonly string[],
  defect: unknown,
): BuildError<E> => ({
  _tag: 'construction_failed',
  dependency,
  path,
  cause: 'defect',
  defect,
})
