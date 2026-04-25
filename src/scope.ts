export const ScopeTypeId: unique symbol = Symbol.for(
  '@fuiste/dependencies/Scope',
) as typeof ScopeTypeId

export type ScopeTypeId = typeof ScopeTypeId

export type Finalizer = () => void | Promise<void>

export interface Scope {
  readonly [ScopeTypeId]: ScopeTypeId
}

type ScopeState = {
  closed: boolean
  finalizers: Finalizer[]
}

const states = new WeakMap<Scope, ScopeState>()

const getState = (scope: Scope): ScopeState => {
  const state = states.get(scope)

  if (!state) {
    throw new Error('Unknown scope')
  }

  return state
}

export const isScope = (value: unknown): value is Scope =>
  typeof value === 'object' && value !== null && ScopeTypeId in value

export const make = (): Scope => {
  const scope = { [ScopeTypeId]: ScopeTypeId } as Scope
  states.set(scope, { closed: false, finalizers: [] })
  return scope
}

export const addFinalizer = (scope: Scope, finalizer: Finalizer): void => {
  const state = getState(scope)

  if (state.closed) {
    throw new Error('Cannot add a finalizer to a closed scope')
  }

  state.finalizers.push(finalizer)
}

export const close = async (scope: Scope): Promise<void> => {
  const state = getState(scope)

  if (state.closed) return

  state.closed = true

  const errors: unknown[] = []

  for (let index = state.finalizers.length - 1; index >= 0; index -= 1) {
    const finalizer = state.finalizers[index]

    if (!finalizer) continue

    try {
      await finalizer()
    } catch (error) {
      errors.push(error)
    }
  }

  state.finalizers = []

  if (errors.length === 1) {
    throw errors[0]
  }

  if (errors.length > 1) {
    const aggregate = new Error(
      'One or more scope finalizers failed',
    ) as Error & { errors?: unknown[] }
    aggregate.errors = errors
    throw aggregate
  }
}
