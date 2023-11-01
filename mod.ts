/**
 * A Web Route for `Deno.serve`.
 *
 * ```ts
 * import Route from 'https://deno.land/x/nextrj_route/mod.ts'
 * const route = new Route()
 *   .post('/', async (req) => new Response(await req.text()))
 *   .get('/', () => new Response('Hello World!'))
 *   .get('/:id', (_req, { id }) => new Response(id))
 *   // request `static/m1/index.html`, pathParams[0]=m1/index.html
 *   .get('/static/*', (_req, pathParams) => new Response(pathParams[0]))
 *
 * Deno.serve((req) => route.handle(req))
 * ```
 * @module
 */

/** Supported http methods */
export enum Method {
  GET = 'GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  TRACE = 'TRACE',
  PATCH = 'PATCH',
}

/** The context for Handler or Filter */
export type Context = {
  client?: { host?: string }
  [key: string]: unknown
}

export type SyncFilter = (
  request: Request,
  context?: Context,
) => void | Record<string, unknown>
export type AsyncFilter = (
  request: Request,
  context?: Context,
) => Promise<void> | Promise<Record<string, unknown>>
/** The Filter for Route or Handler */
export type Filter = SyncFilter | AsyncFilter

/** Synchronous Route Handler */
export type SyncHandler = (
  request: Request,
  context?: Context,
) => Response

/** Asynchronous Route Handler */
export type AsyncHandler = (
  request: Request,
  context?: Context,
) => Promise<Response>

/** The Handler */
export type Handler = SyncHandler | AsyncHandler
export type HandlerMatcher = { pattern: URLPattern; handler: Handler; filters?: Filter[]; path?: string }

export type ErrorMapper = (
  error: Error,
  request?: Request,
) => Response | undefined
export const DEFAULT_ERROR_MAPPER: ErrorMapper = (err, _req) => new Response(err.message, { status: 500 })

/** Execute each filter and merge return data to the context */
async function executeFilters(req: Request, ctx?: Context, filters?: Filter[]): Promise<Record<string, unknown>> {
  const r: Record<string, unknown> = {}
  // invoke filter and merge return data to context
  if (filters?.length) {
    for await (const filter of filters) {
      const data = await filter(req, ctx)
      if (typeof data === 'object' && ctx) Object.assign(ctx, data)
    }
  }
  return r
}

export class FilterError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'FilterError'
  }
}

/** Auto add prefix '/' to path */
function autoSlashPrefix(path?: string): string | undefined {
  // not slash for falsy value, such as ''
  return path ? (path.startsWith('/') ? path : `/${path}`) : path
}

/** Join all path exclude falsy value and avoid duplicate slash '//' */
function joinUrlPath(...paths: (string | undefined)[]): string | undefined {
  return paths.length
    ? (paths.filter((p) => p) as string[]).reduce((p, c) => {
      if (p.length === 0 || !p[0].endsWith('/')) p.push(c)
      return p
    }, [] as string[]).join('')
    : undefined
}

/** Route class */
export default class Route {
  #errorMapper?: ErrorMapper
  #path?: string
  filters?: Filter[]
  // Init empty array for each Method
  #handlers: Record<Method, HandlerMatcher[]> = {
    [Method.GET]: [],
    [Method.HEAD]: [],
    [Method.POST]: [],
    [Method.PUT]: [],
    [Method.DELETE]: [],
    [Method.OPTIONS]: [],
    [Method.TRACE]: [],
    [Method.PATCH]: [],
  }

  /** Init a Route instance with specific root path */
  constructor(path?: string, ...filter: Filter[]) {
    this.#path = autoSlashPrefix(path)
    this.filters = filter
    // this.#errorMapper = DEFAULT_ERROR_MAPPER
  }

  /** Handle request */
  async handle(req: Request, info?: Deno.ServeHandlerInfo): Promise<Response> {
    try {
      // first find match handler
      const { route, matcher } = this.findMatchHandler(req) ?? {}
      // find and invoke match handler
      if (matcher) {
        // init context
        const ctx: Context = { client: info ? { host: info?.remoteAddr?.hostname } : undefined }

        // resolve path parameters from the url and merge to context
        const pathParams = (matcher.pattern.exec(req.url)?.pathname?.groups || {}) as Record<string, string>
        Object.assign(ctx, pathParams)

        // invoke all ancestor route filters and local route filters
        // and merge filter data to context
        const filters = route?.getAllFilters()
        if (filters?.length) await executeFilters(req, ctx, filters)

        // invoke handler's filter and merge filter data to context
        if (matcher.filters?.length) await executeFilters(req, ctx, matcher.filters)

        // invoke handler
        return await matcher.handler(req, ctx)
      }

      // no handler matches, return 404
      return new Response(null, { status: 404 })
    } catch (err) {
      return this.mapError(err, req)
    }
  }

  /** Get all ancestor filters */
  getAllFilters(): Filter[] | undefined {
    return [this.#parent?.route?.getAllFilters(), this.filters].filter((t) => t).flat() as Filter[]
  }

  mapError(err: Error, req: Request): Response {
    return this.#errorMapper?.(err, req) ??
      this.#parent?.route?.mapError(err, req) ??
      DEFAULT_ERROR_MAPPER(err, req) as Response
  }

  /** Find the first handler match the request */
  findMatchHandler(req: Request): { route: Route; matcher: HandlerMatcher } | undefined {
    const matcher = this.#handlers[req.method as Method].find(({ pattern }) => pattern.test(req.url))
    if (matcher) return { route: this, matcher }
    else return this.#findMatchSubRoute(req)
  }

  /** Find the first sub route match the request */
  #findMatchSubRoute(req: Request): { route: Route; matcher: HandlerMatcher } | undefined {
    let matcher
    const s = this.#children?.find((s) => {
      matcher = s.route.getHandlers()[req.method as Method].find(({ pattern }) => pattern.test(req.url))
      return matcher
    })
    return s ? { route: s.route, matcher: matcher as unknown as HandlerMatcher } : undefined
  }

  getHandlers(): Record<Method, HandlerMatcher[]> {
    return this.#handlers
  }

  /** Set filters */
  filter(...filters: Filter[]) {
    this.filters = filters
    return this
  }

  /** Set error mapper */
  errorMapper(mapper: ErrorMapper) {
    this.#errorMapper = mapper
    return this
  }

  /** Add path handler */
  private add(method: Method, path: string, handler: Handler, ...filters: Filter[]) {
    path = autoSlashPrefix(path) as string
    const ancestorPath = this.#parent?.route?.getFullPath()
    const subPath = this.#parent?.path
    const pathname = joinUrlPath(ancestorPath, subPath, this.#path, path)
    // console.log(
    //   `method=${method}, pathname=${pathname}, ancestorPath=${ancestorPath}, subPath=${subPath}, #path=${this.#path}, path=${path}`,
    // )
    this.#handlers[method].push({
      pattern: new URLPattern({ pathname, search: '*', hash: '*' }),
      handler,
      filters,
      path,
    })
    return this
  }
  /** Add get method path handler */
  get(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.GET, path, handler, ...filters)
  }
  /** Add head method path handler */
  head(path: string, handler: Handler, ...filters: Filter[]) {
    this.add(Method.HEAD, path, handler, ...filters)
  }
  /** Add post method path handler */
  post(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.POST, path, handler, ...filters)
  }
  /** Add put method path handler */
  put(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.PUT, path, handler, ...filters)
  }
  /** Add delete method path handler */
  delete(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.DELETE, path, handler, ...filters)
  }
  /** Add options method path handler */
  options(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.OPTIONS, path, handler, ...filters)
  }
  /** Add trace method path handler */
  trace(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.TRACE, path, handler, ...filters)
  }
  /** Add patch method path handler */
  patch(path: string, handler: Handler, ...filters: Filter[]) {
    return this.add(Method.PATCH, path, handler, ...filters)
  }

  #parent?: { route: Route; path?: string }
  #children?: { route: Route; path?: string }[]
  /** Add sub route */
  sub(route: Route, path?: string) {
    path = autoSlashPrefix(path)
    ;(this.#children ??= []).push({ route, path })
    route.#setParent(this, path)
    return this
  }

  /** Get the full path from ancestor */
  getFullPath(): string | undefined {
    return joinUrlPath(this.#parent?.route?.getFullPath(), this.#path)
  }

  /** Set a route as this route's parent route */
  #setParent(route: Route, path?: string): Route {
    this.#parent = { route, path }
    this.#resetHandlerMatcher()
    return this
  }

  #resetHandlerMatcher() {
    const ancestorPath = this.#parent?.route?.getFullPath()
    const subPath = this.#parent?.path
    for (const [_, matchers] of Object.entries(this.#handlers)) {
      matchers.forEach((m) =>
        m.pattern = new URLPattern({ pathname: joinUrlPath(ancestorPath, subPath, this.#path, m.path) })
      )
    }
  }
}
