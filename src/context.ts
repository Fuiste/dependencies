export const TagTypeId: unique symbol = Symbol.for(
  '@fuiste/dependencies/Tag',
) as typeof TagTypeId

export type TagTypeId = typeof TagTypeId

export interface Tag<Key extends string = string, Service = unknown> {
  readonly [TagTypeId]: TagTypeId
  readonly key: Key
  readonly id: symbol
  readonly Key: Key
  readonly Service: Service
}

export declare namespace Tag {
  export type Any = Tag<string, any>
  export type Key<T extends Any> = T['Key']
  export type Service<T extends Any> = T['Service']
}

const tagRegistry = new Map<string, Tag.Any>()

export function Tag<Service, Key extends string = string>(
  key: Key,
): Tag<Key, Service> {
  const existing = tagRegistry.get(key)

  if (existing) {
    return existing as Tag<Key, Service>
  }

  const tag = {
    [TagTypeId]: TagTypeId,
    key,
    id: Symbol.for(`@fuiste/dependencies/tag/${key}`),
  } as Tag<Key, Service>

  tagRegistry.set(key, tag)
  return tag
}

export const ContextTypeId: unique symbol = Symbol.for(
  '@fuiste/dependencies/Context',
) as typeof ContextTypeId

export type ContextTypeId = typeof ContextTypeId

type ContextEntry = {
  readonly tag: Tag.Any
  readonly service: unknown
}

export interface Context<_Services extends Tag.Any = never> {
  readonly [ContextTypeId]: ContextTypeId
  readonly unsafeMap: ReadonlyMap<symbol, ContextEntry>
}

export declare namespace Context {
  export type Any = Context<Tag.Any>
  export type Service<T extends Tag.Any> = Tag.Service<T>
}

export class MissingServiceLookupError extends Error {
  readonly tag: Tag.Any

  constructor(tag: Tag.Any) {
    super(`Missing service for tag '${tag.key}'`)
    this.name = 'MissingServiceLookupError'
    this.tag = tag
  }
}

export class DuplicateServiceDefinitionError extends Error {
  readonly tag: Tag.Any

  constructor(tag: Tag.Any) {
    super(`Duplicate service for tag '${tag.key}'`)
    this.name = 'DuplicateServiceDefinitionError'
    this.tag = tag
  }
}

const makeContext = <Services extends Tag.Any>(
  unsafeMap: ReadonlyMap<symbol, ContextEntry>,
): Context<Services> =>
  ({
    [ContextTypeId]: ContextTypeId,
    unsafeMap,
  }) as Context<Services>

export const isTag = (value: unknown): value is Tag.Any =>
  typeof value === 'object' && value !== null && TagTypeId in value

export const isContext = (value: unknown): value is Context<never> =>
  typeof value === 'object' && value !== null && ContextTypeId in value

export const empty = (): Context<never> => makeContext(new Map())

export const entries = (context: Context<any>): ReadonlyArray<ContextEntry> =>
  Array.from(context.unsafeMap.values())

export const tags = <Services extends Tag.Any>(
  context: Context<Services>,
): ReadonlyArray<Services> =>
  entries(context).map((entry) => entry.tag as Services)

export const of = <TTag extends Tag.Any>(
  tag: TTag,
  service: Context.Service<TTag>,
): Context<TTag> => makeContext(new Map([[tag.id, { tag, service }]]))

export const has = <Services extends Tag.Any>(
  context: Context<Services>,
  tag: Tag.Any,
): boolean => context.unsafeMap.has(tag.id)

export const unsafeGet = <TTag extends Tag.Any>(
  context: Context<any>,
  tag: TTag,
): Context.Service<TTag> => {
  const entry = context.unsafeMap.get(tag.id)

  if (!entry) {
    throw new MissingServiceLookupError(tag)
  }

  return entry.service as Context.Service<TTag>
}

export const get = <Services extends Tag.Any, TTag extends Services>(
  context: Context<Services>,
  tag: TTag,
): Context.Service<TTag> => unsafeGet(context, tag)

export const add = <Services extends Tag.Any, TTag extends Tag.Any>(
  context: Context<Services>,
  tag: TTag,
  service: Context.Service<TTag>,
): Context<Services | TTag> => {
  if (has(context, tag)) {
    throw new DuplicateServiceDefinitionError(tag)
  }

  const next = new Map(context.unsafeMap)
  next.set(tag.id, { tag, service })
  return makeContext(next)
}

export const merge = <Left extends Tag.Any, Right extends Tag.Any>(
  left: Context<Left>,
  right: Context<Right>,
): Context<Left | Right> => {
  const next = new Map(left.unsafeMap)

  for (const entry of right.unsafeMap.values()) {
    if (next.has(entry.tag.id)) {
      throw new DuplicateServiceDefinitionError(entry.tag)
    }

    next.set(entry.tag.id, entry)
  }

  return makeContext(next)
}

export const override = <Left extends Tag.Any, Right extends Tag.Any>(
  left: Context<Left>,
  right: Context<Right>,
): Context<Left | Right> => {
  const next = new Map(left.unsafeMap)

  for (const entry of right.unsafeMap.values()) {
    next.set(entry.tag.id, entry)
  }

  return makeContext(next)
}
