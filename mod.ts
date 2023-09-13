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

/** Route Handler */
export type Handler = (
  request: Request,
  pathParams: Record<string, string>,
) => Response | Promise<Response>

/** Route class */
export default class Route {
  private rootPath?: string
  // Init empty array for each Method
  private handlers: Record<Method, Array<{ pattern: URLPattern; handler: Handler }>> = {
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
  constructor(rootPath?: string) {
    this.rootPath = rootPath
  }

  /** Handle request */
  handle(req: Request): Response | Promise<Response> {
    try {
      for (const r of this.handlers[req.method as Method]) {
        if (r.pattern.test(req.url)) {
          const pathParams = (r.pattern.exec(req.url)?.pathname?.groups || {}) as Record<string, string>
          return r['handler'](req, pathParams)
        }
      }
      return new Response(null, { status: 404 })
    } catch (error) {
      return new Response(error.message, { status: 500 })
    }
  }

  /** Add path handler */
  private add(method: Method, path: string, handler: Handler) {
    const pathname = this.rootPath ? this.rootPath + path : path
    this.handlers[method].push({
      pattern: new URLPattern({ pathname }),
      handler,
    })
    return this
  }
  /** Add get method path handler */
  get(path: string, handler: Handler) {
    return this.add(Method.GET, path, handler)
  }
  /** Add head method path handler */
  head(path: string, handler: Handler) {
    this.add(Method.HEAD, path, handler)
  }
  /** Add post method path handler */
  post(path: string, handler: Handler) {
    return this.add(Method.POST, path, handler)
  }
  /** Add put method path handler */
  put(path: string, handler: Handler) {
    return this.add(Method.PUT, path, handler)
  }
  /** Add delete method path handler */
  delete(path: string, handler: Handler) {
    return this.add(Method.DELETE, path, handler)
  }
  /** Add options method path handler */
  options(path: string, handler: Handler) {
    return this.add(Method.OPTIONS, path, handler)
  }
  /** Add trace method path handler */
  trace(path: string, handler: Handler) {
    return this.add(Method.TRACE, path, handler)
  }
  /** Add patch method path handler */
  patch(path: string, handler: Handler) {
    return this.add(Method.PATCH, path, handler)
  }
}
