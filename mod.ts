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

export type ErrorMapper = (
  error: Error,
  request: Request,
) => Response
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

/** Route class */
export default class Route {
  #errorMapper: ErrorMapper
  #rootPath?: string
  #filters?: Filter[]
  // Init empty array for each Method
  private handlers: Record<Method, Array<{ pattern: URLPattern; handler: Handler; filters?: Filter[] }>> = {
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
  constructor(rootPath?: string, ...filter: Filter[]) {
    this.#rootPath = rootPath
    this.#filters = filter
    this.#errorMapper = DEFAULT_ERROR_MAPPER
  }

  /** Handle request */
  async handle(req: Request, info?: Deno.ServeHandlerInfo): Promise<Response> {
    try {
      // find and invoke match handler
      for await (const cfg of this.handlers[req.method as Method]) {
        if (cfg.pattern.test(req.url)) {
          // init context
          const ctx: Context = { client: info ? { host: info?.remoteAddr?.hostname } : undefined }

          // invoke route's filter first and merge return data to context
          if (this.#filters?.length) await executeFilters(req, ctx, this.#filters)

          // resolves the path parameters from the url
          const pathParams = (cfg.pattern.exec(req.url)?.pathname?.groups || {}) as Record<string, string>

          // merge path parameters to context
          Object.assign(ctx, pathParams)

          // invoke handler's filter and merge return data to context
          if (cfg.filters?.length) await executeFilters(req, ctx, cfg.filters)

          // invoke handler
          return cfg.handler(req, ctx)
        }
      }

      // no handler matches, return 404
      return new Response(null, { status: 404 })
    } catch (err) {
      return await this.#errorMapper(err, req)
    }
  }
  /** Set filters */
  filter(...filters: Filter[]) {
    this.#filters = filters
    return this
  }

  /** Set error mapper */
  errorMapper(mapper: ErrorMapper) {
    this.#errorMapper = mapper
    return this
  }

  /** Add path handler */
  private add(method: Method, path: string, handler: Handler, ...filters: Filter[]) {
    const pathname = this.#rootPath ? this.#rootPath + path : path
    this.handlers[method].push({
      pattern: new URLPattern({ pathname }),
      handler,
      filters,
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
}
