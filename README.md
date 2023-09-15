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
