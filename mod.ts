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
export type HandlerMatcher = {
  pattern: URLPattern
  handler: Handler
  filters?: Filter[]
  path?: string
  /** All path from top route to the sub route handler */
  middlePath?: string
  /** All filters from top route to the sub route handler */
  middleFilters?: Filter[]
}

export type ErrorMapper = (
  error: Error,
  request?: Request,
) => Response | undefined
export const DEFAULT_ERROR_MAPPER: ErrorMapper = (err, _req) => new Response(err.message, { status: 500 })

/** Execute each filter and merge filter data to the context */
async function executeFilters(req: Request, ctx: Context = {}, filters: Filter[]): Promise<void> {
  if (filters.length) {
    for await (const filter of filters) {
      const data = await filter(req, ctx)
      if (typeof data === 'object') Object.assign(ctx, data)
    }
  }
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
  /** for add, sub method to log out path pattern */
  #debug?: boolean
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

  setDebug(debug: boolean): Route {
    this.#debug = debug
    return this
  }

  /** Handle request */
  async handle(req: Request, info?: Deno.ServeHandlerInfo): Promise<Response> {
    try {
      // first find match handler
      const matcher = this.findMatchHandler(req)
      // find and invoke match handler
      if (matcher) {
        // init context
        const ctx: Context = { client: info ? { host: info?.remoteAddr?.hostname } : undefined }

        // resolve path parameters from the url and merge to context
        const pathParams = (matcher.pattern.exec(req.url)?.pathname?.groups || {}) as Record<string, string>
        Object.assign(ctx, pathParams)

        // invoke all filters and merge filter data to context
        // = routeFilters + handlerSubFilters + handlerFilters
        const filters: Filter[] = []
        if (this.filters) filters.push(...this.filters)
        if (matcher.middleFilters) filters.push(...matcher.middleFilters)
        if (matcher.filters) filters.push(...matcher.filters)
        if (filters.length) await executeFilters(req, ctx, filters)

        // invoke handler
        return await matcher?.handler(req, ctx)
      }

      // no handler matches, return 404
      return new Response(null, { status: 404 })
    } catch (err) {
      return this.mapError(err, req)
    }
  }

  mapError(err: Error, req: Request): Response {
    return this.#errorMapper?.(err, req) ??
      this.#parent?.mapError(err, req) ??
      DEFAULT_ERROR_MAPPER(err, req) as Response
  }

  /** Find the first handler match the request */
  findMatchHandler(req: Request): HandlerMatcher | undefined {
    return this.#handlers[req.method as Method].find(({ pattern }) => pattern.test(req.url))
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
    // path pattern relative to parent root
    // = routePath + handlerPath
    const pathPattern = joinUrlPath(this.#path, path) as string
    if (this.#debug) {
      console.log(`add: method=${method}, pattern=${pathPattern}, routePath=${this.#path}, handlerPath=${path}`)
    }
    this.#handlers[method].push({
      pattern: new URLPattern({ pathname: pathPattern, search: '*', hash: '*' }),
      handler,
      filters,
      path,
    })
    return this
  }

  /** Add head method path handler */
  head(handler: Handler, ...filters: Filter[]): Route
  head(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  head(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.GET, arg1, arg2, ...arg3)
    else return this.add(Method.HEAD, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add options method path handler */
  options(handler: Handler, ...filters: Filter[]): Route
  options(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  options(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.OPTIONS, arg1, arg2, ...arg3)
    else return this.add(Method.OPTIONS, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add get method path handler */
  get(handler: Handler, ...filters: Filter[]): Route
  get(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  get(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.GET, arg1, arg2, ...arg3)
    else return this.add(Method.GET, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add post method path handler */
  post(handler: Handler, ...filters: Filter[]): Route
  post(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  post(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.POST, arg1, arg2, ...arg3)
    else return this.add(Method.POST, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add put method path handler */
  put(handler: Handler, ...filters: Filter[]): Route
  put(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  put(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.PUT, arg1, arg2, ...arg3)
    else return this.add(Method.PUT, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add patch method path handler */
  patch(handler: Handler, ...filters: Filter[]): Route
  patch(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  patch(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.PATCH, arg1, arg2, ...arg3)
    else return this.add(Method.PATCH, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add delete method path handler */
  delete(handler: Handler, ...filters: Filter[]): Route
  delete(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  delete(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.DELETE, arg1, arg2, ...arg3)
    else return this.add(Method.DELETE, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  /** Add trace method path handler */
  trace(handler: Handler, ...filters: Filter[]): Route
  trace(path: string, handler: Handler, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  trace(arg1: any, arg2: any, ...arg3: any[]): Route {
    if (typeof arg1 === 'string') return this.add(Method.TRACE, arg1, arg2, ...arg3)
    else return this.add(Method.TRACE, '', arg1, ...(arg2 ? [arg2, ...arg3] : []))
  }

  #parent?: Route
  /** Add sub route */
  sub(route: Route, ...filters: Filter[]): Route
  sub(path: string, route: Route, ...filters: Filter[]): Route
  // deno-lint-ignore no-explicit-any
  sub(arg1: any, arg2: any, ...arg3: any[]): Route {
    let path: string | undefined, route: Route, filters: Filter[]
    if (typeof arg1 === 'string') {
      path = autoSlashPrefix(arg1)
      route = arg2
      filters = arg3
    } else {
      path = undefined
      route = arg1
      filters = arg2 ? [arg2, ...arg3] : []
    }
    route.#parent = this

    // flatten sub route handlers to this route
    for (const [method, handlerMatchers] of Object.entries(route.#handlers)) {
      this.#handlers[method as Method].push(
        ...handlerMatchers.map((hm) => {
          // rebuild middlePath = subPath + subRoutePath + handlerMiddlePath
          const middlePath = joinUrlPath(path, route.#path, hm.middlePath)

          // patternPath = parentRoutePath + middlePath + handlerPath
          const patternPath = joinUrlPath(this.#path, middlePath, hm.path)
          if (this.#debug) console.log(`sub: method=${method}, pattern=${patternPath}`)

          // rebuild middleFilters = subFilters + subRouteFilters + handlerMiddleFilters
          const middleFilters = [...filters]
          if (route.filters) middleFilters.push(...route.filters)
          if (hm.middleFilters) middleFilters.push(...hm.middleFilters)

          return {
            path: hm.path,
            handler: hm.handler,
            filters: hm.filters,
            pattern: new URLPattern({ pathname: patternPath, search: '*', hash: '*' }),
            middlePath,
            middleFilters,
          } as HandlerMatcher
        }),
      )
    }

    return this
  }
}
