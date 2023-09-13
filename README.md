# NextRJ Web Route

A Web Route for `Deno.serve`.

```ts
import Route from 'https://deno.land/x/nextrj_route/mod.ts'
const route = new Route()
  .post('/', async (req) => new Response(await req.text()))
  .get('/', () => new Response('Hello World!'))
  .get('/:id', (_req, { id }) => new Response(id))
  // request `static/m1/index.html`, pathParams[0]=m1/index.html
  .get('/static/*', (_req, pathParams) => new Response(pathParams[0]))

Deno.serve((req) => route.handle(req))
```
