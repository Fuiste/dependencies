export type Ok<A> = {
  readonly _tag: 'ok'
  readonly value: A
}

export type Err<E> = {
  readonly _tag: 'err'
  readonly error: E
}

export type Result<A, E = never> = Ok<A> | Err<E>

export const ok = <A>(value: A): Result<A, never> => ({
  _tag: 'ok',
  value,
})

export const err = <E>(error: E): Result<never, E> => ({
  _tag: 'err',
  error,
})

export const isOk = <A, E>(result: Result<A, E>): result is Ok<A> => result._tag === 'ok'

export const isErr = <A, E>(result: Result<A, E>): result is Err<E> => result._tag === 'err'

export const isResult = (value: unknown): value is Result<unknown, unknown> => {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as { _tag?: unknown }
  return candidate._tag === 'ok' || candidate._tag === 'err'
}

export const map = <A, E, B>(result: Result<A, E>, f: (value: A) => B): Result<B, E> =>
  isOk(result) ? ok(f(result.value)) : result

export const mapError = <A, E, B>(result: Result<A, E>, f: (error: E) => B): Result<A, B> =>
  isErr(result) ? err(f(result.error)) : result

export const match = <A, E, B>(
  result: Result<A, E>,
  branches: { readonly ok: (value: A) => B; readonly err: (error: E) => B },
): B => (isOk(result) ? branches.ok(result.value) : branches.err(result.error))
