# NextRJ Web Route

A Web Route for `Deno.serve`.

## Examples

### A static files and api server

```ts
import Route from 'https://deno.land/x/nextrj_route/mod.ts'
import fileDownloadHandler from 'https://deno.land/x/nextrj_route/handler/file_download.ts'
import allowCorsHandler from 'https://deno.land/x/nextrj_route/handler/allow_cors.ts'

const route = new Route()
  // allow cors for all OPTIONS request
  .options('/*', allowCorsHandler)
  // serve static files
  .get('/static/*', fileDownloadHandler)
  // api serve
  .post('/', async (req) => new Response(await req.text()))
  .get('/', () => new Response('Hello World!'))
  .get('/:id', (_req, { id } = {}) => new Response(id as string))

Deno.serve((req) => route.handle(req))
```

### Route with filter and error mapper

```ts
import Route, { DEFAULT_ERROR_MAPPER, Filter, FilterError } from 'https://deno.land/x/nextrj_route/mod.ts'

const globalDataFilter: Filter = () => ({ project: 'NextRJ' })
const checkAuthorizationHeaderFilter: Filter = (req: Request): void => {
  if (!req.headers.has('Authorization')) throw new FilterError('Missing "Authorization" header')
}
const maxIdFilter: Filter = (req: Request, { id } = {}): void => {
  const idNum = parseInt(id as string)
  if (idNum > 1000)) throw new FilterError('id value should not greater than 1000')
}

const route = new Route()
  // top filters
  .filter(globalDataFilter, checkAuthorizationHeaderFilter)
  // api serve
  .post('/', async (req) => new Response(await req.text()))
  .get('/', () => new Response('Hello World!'))
  // handler with specific filter
  .get('/:id', (_req, { id } = {}) => new Response(id as string), maxIdFilter)
  // error mapping
  .errorMapper((req, err) => {
    if (err instanceof FilterError) return new Response(err.message, { status: 403 })
    else return DEFAULT_ERROR_MAPPER(req, err)
  })

Deno.serve((req, info) => route.handle(req, info))
```

### Nested sub routes

Use this mode to seperate each module's route to different file.

```ts
// module1 route
const m1Route = new Route()
  .get((req) => new Response('This is m1'))
  .post(async (req) => new Response(await req.text()))
  .get('/:id', (_req, { id } = {}) => new Response(id as string))

// module2 route
const m2Route = new Route('/m2')
  .get((req) => new Response('This is m2'))
  .post(async (req) => new Response(await req.text()))

// top route
const route = new Route()
  .sub('/m1', m1Route)
  .sub(m2Route)
  .get('/m3', (req) => new Response('This is m3'))

// start server with top route
Deno.serve((req, info) => route.handle(req, info))
```

The code above is the same as the one below:

```ts
const route = new Route()
  .get('/m1', (req) => new Response('This is m1'))
  .post('/m1', async (req) => new Response(await req.text()))
  .get('/m1/:id', (_req, { id } = {}) => new Response(id as string))
  .get('/m2', (req) => new Response('This is m2'))
  .post('/m2', async (req) => new Response(await req.text()))
  .get('/m3', (req) => new Response('This is m3'))

Deno.serve((req, info) => route.handle(req, info))
```
