import Route from '../mod.ts'

// init route
const route = new Route()
  .post('/', async (req) => new Response(await req.text()))
  .get('/', () => new Response('Hello World!'))
  .get('/:id', (_req, { id }) => new Response(id))
  // request `static/m1/index.html`, pathParams[0]=m1/index.html
  .get('/static/*', (_req, pathParams) => new Response(pathParams[0]))
  .get('/error/any', () => {
    throw new Error('custom error message')
  })

// start server
const port = Deno.args.length ? parseInt(Deno.args[0]) : 8001
Deno.serve({ port }, (req) => route.handle(req))
