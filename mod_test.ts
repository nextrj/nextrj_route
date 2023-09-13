import { assertEquals, assertFalse } from './deps.ts'
import Route from './mod.ts'

const baseUrl = 'http://localhost:8001'
Deno.test('Route without rootPath', async (t) => {
  const route = new Route()
    .get('/', () => new Response('root'))
    .get('/a', () => new Response('/a'))
    .get('/error', () => {
      throw new Error('error')
    })
    .post('/a', async (req) => new Response(await req.text()))
    .get('/b/:id', (_req, pathParams) => new Response(pathParams.id as string))

  await t.step('GET /', async () => {
    const req = new Request(baseUrl)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'root')
  })

  await t.step('GET /a', async () => {
    const req = new Request(`${baseUrl}/a`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '/a')
  })

  await t.step('POST /a', async () => {
    const req = new Request(`${baseUrl}/a`, { method: 'POST', body: 'post a' })
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'post a')
  })

  await t.step('GET /b/:id', async () => {
    const req = new Request(`${baseUrl}/b/123`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '123')
  })

  await t.step('404 NotFound without body', async () => {
    const req = new Request(`${baseUrl}/unknown`)
    const res = await route.handle(req)
    assertEquals(res.status, 404)
    assertFalse(await res.text())
  })

  await t.step('500 InternalServerError with body text', async () => {
    const req = new Request(`${baseUrl}/error`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'error')
  })
})

Deno.test('Route with rootPath', async (t) => {
  const route = new Route('/x')
    .get('', () => new Response('/x'))
    .get('/', () => new Response('/x/'))
    .get('/a', () => new Response('/x/a'))
    .get('/error', () => {
      throw new Error('error')
    })
    .post('/a', async (req) => new Response(await req.text()))
    .get('/b/:id', (_req, pathParams) => new Response(pathParams.id as string))

  await t.step('GET /x', async () => {
    const req = new Request(`${baseUrl}/x`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '/x')
  })

  await t.step('GET /x/', async () => {
    const req = new Request(`${baseUrl}/x/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '/x/')
  })

  await t.step('GET /x/a', async () => {
    const req = new Request(`${baseUrl}/x/a`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '/x/a')
  })

  await t.step('POST /x/a', async () => {
    const req = new Request(`${baseUrl}/x/a`, { method: 'POST', body: 'post a' })
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'post a')
  })

  await t.step('GET /x/b/:id', async () => {
    const req = new Request(`${baseUrl}/x/b/123`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '123')
  })

  await t.step('404 NotFound without body', async () => {
    const req = new Request(`${baseUrl}/x/unknown`)
    const res = await route.handle(req)
    assertEquals(res.status, 404)
    assertFalse(await res.text())
  })

  await t.step('500 InternalServerError with body text', async () => {
    const req = new Request(`${baseUrl}/x/error`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'error')
  })
})
