import allowCorsHandler from '../handler/allow_cors.ts'
import Route, { DEFAULT_ERROR_MAPPER, FilterError } from '../mod.ts'

/** A sample filter for check 'Authorization' header */
export default function checkAuthorizationHeaderFilter(req: Request): void {
  if (!req.headers.has('Authorization')) throw new FilterError('Missing "Authorization" header')
}

// init route
const route = new Route()
  .filter(() => ({ name: 'NextRJ' }))
  .options('/*', allowCorsHandler)
  .post('/', async (req) => new Response(await req.text()))
  // Hello NextRJ from $url
  .get('/', (_req, ctx) => new Response(`Hello ${ctx?.name} from '${ctx?.url}'`), (req) => ({ url: req.url }))
  .get('/example/:id', (_req, ctx) => new Response(ctx?.id as string))
  // request `static/m1/index.html`, ctx['0']=m1/index.html
  .get('/static/*', (_req, ctx) => new Response(ctx?.['0'] as string))
  .get('/error/any', () => {
    throw new Error('custom error message')
  })
  .get('/auth', () => new Response('Auth'), checkAuthorizationHeaderFilter)
  .errorMapper((req, err) => {
    if (err instanceof FilterError) return new Response(err.message, { status: 403 })
    else return DEFAULT_ERROR_MAPPER(req, err)
  })

// start server
const port = Deno.args.length ? parseInt(Deno.args[0]) : 8001
Deno.serve({ port }, (
  req: Request,
  info: Deno.ServeHandlerInfo,
): Response | Promise<Response> => route.handle(req, info))
