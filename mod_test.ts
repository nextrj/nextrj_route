import { assertEquals, assertFalse } from './deps.ts'
import Route, { DEFAULT_ERROR_MAPPER, FilterError } from './mod.ts'

const baseUrl = 'http://localhost:8001'
Deno.test('Route without rootPath', async (t) => {
  const route = new Route()
    .get('/', () => new Response('root'))
    .get('/a', () => new Response('/a'))
    .get('/error/any', () => {
      throw new Error('custom error message')
    })
    .post('/a', async (req) => new Response(await req.text()))
    .get('/b/:id', (_req, ctx) => new Response(ctx?.id as string))

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
    const req = new Request(`${baseUrl}/error/any`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'custom error message')
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
    .get('/b/:id', (_req, { id } = {}) => new Response(id as string))

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

Deno.test('Route with filter', async (t) => {
  let url = '', project = ''
  const route = new Route()
    .filter(() => ({ project: 'NextRJ' }), (req, ctx) => {
      url = req.url
      project = ctx?.project as string
    })
    .get(
      '/a',
      (_req, ctx) => new Response(`Hello ${ctx?.project} ${ctx?.a}`),
      (req) => ({ a: 'a', url: req.url }),
    )
    .get(
      '/b',
      (_req, ctx) => {
        assertFalse(ctx?.a)
        return new Response(`Hello ${ctx?.project} ${ctx?.b}`)
      },
      (req) => ({ b: 'b', url: req.url }),
    )
    .get(
      '/filter-error',
      () => {
        throw new Error('error in handler')
      },
      () => {
        throw new Error('error in filter')
      },
    )
    .get(
      '/handler-error',
      () => {
        throw new Error('error in handler')
      },
    )

  await t.step('GET /a', async () => {
    const res = await route.handle(new Request(`${baseUrl}/a`))
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'Hello NextRJ a')
  })
  assertEquals(url, `${baseUrl}/a`)
  assertEquals(project, 'NextRJ')

  await t.step('GET /b', async () => {
    const res = await route.handle(new Request(`${baseUrl}/b`))
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'Hello NextRJ b')
  })

  await t.step('GET /filter-error with default error mapper', async () => {
    const res = await route.handle(new Request(`${baseUrl}/filter-error`))
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'error in filter')
  })

  await t.step('GET /handler-error with default error mapper', async () => {
    const res = await route.handle(new Request(`${baseUrl}/handler-error`))
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'error in handler')
  })
})

class HandlerError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'HandlerError'
  }
}

Deno.test('Route with route filter error', async (t) => {
  await t.step('default error mapper', async () => {
    const route = new Route()
      .get('/', () => new Response('Hello'))
      .filter(() => {
        throw new FilterError('error in route filter')
      })

    const res = await route.handle(new Request(`${baseUrl}/`))
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'error in route filter')
  })
  await t.step('custom error mapper', async () => {
    const route = new Route()
      .get('/', () => new Response('Hello'))
      .filter(() => {
        throw new FilterError('error in route filter')
      })
      .errorMapper((err, req) => {
        if (err instanceof FilterError) return new Response('custom message', { status: 403 })
        else return DEFAULT_ERROR_MAPPER(err, req)
      })

    const res = await route.handle(new Request(`${baseUrl}/`))
    assertEquals(res.status, 403)
    assertEquals(await res.text(), 'custom message')
  })
})

Deno.test('Route with handler filter error', async (t) => {
  await t.step('default error mapper', async (t) => {
    const route = new Route()
      .get(
        '/filter-error',
        () => new Response('Hello'),
        () => {
          throw new FilterError('error in filter')
        },
      )
      .get(
        '/handler-error',
        () => {
          throw new HandlerError('error in handler')
        },
      )

    await t.step('GET /filter-error', async () => {
      const res = await route.handle(new Request(`${baseUrl}/filter-error`))
      assertEquals(res.status, 500)
      assertEquals(await res.text(), 'error in filter')
    })

    await t.step('GET /handler-error', async () => {
      const res = await route.handle(new Request(`${baseUrl}/handler-error`))
      assertEquals(res.status, 500)
      assertEquals(await res.text(), 'error in handler')
    })
  })

  await t.step('custom error mapper', async (t) => {
    const route = new Route()
      .get(
        '/filter-error',
        () => new Response('Hello'),
        () => {
          throw new FilterError('error in filter')
        },
      )
      .get(
        '/sync-handler-error',
        () => {
          throw new HandlerError('error in sync handler')
        },
      )
      .get(
        '/async-handler-error',
        async (req: Request): Promise<Response> => {
          if (req.url !== 'unknown') throw new HandlerError('error in async handler')
          return await Promise.resolve(new Response('test'))
        },
      )
      .errorMapper((err, req) => {
        if (err instanceof FilterError) return new Response('custom filter message', { status: 403 })
        else if (err instanceof HandlerError) return new Response('custom handler message', { status: 400 })
        else return DEFAULT_ERROR_MAPPER(err, req)
      })

    await t.step('GET /filter-error', async () => {
      const res = await route.handle(new Request(`${baseUrl}/filter-error`))
      assertEquals(res.status, 403)
      assertEquals(await res.text(), 'custom filter message')
    })

    await t.step('GET /sync-handler-error', async () => {
      const res = await route.handle(new Request(`${baseUrl}/sync-handler-error`))
      assertEquals(res.status, 400)
      assertEquals(await res.text(), 'custom handler message')
    })

    await t.step('GET /async-handler-error', async () => {
      const res = await route.handle(new Request(`${baseUrl}/async-handler-error`))
      assertEquals(res.status, 400)
      assertEquals(await res.text(), 'custom handler message')
    })
  })
})

Deno.test('Route with sub route', async (t) => {
  // module1 route
  const m1Route = new Route()
    .get('', (_req) => new Response('m1'))
    .get('/', (_req) => new Response('m1/'))
    .get('/:id', (_req, { id } = {}) => new Response(id as string))

  // module2 route
  const m2Route = new Route('/m2')
    .get('', (_req) => new Response('m2'))

  // top route
  const route = new Route()
    .sub(m1Route, '/m1')
    .sub(m2Route)
    // '' auto change to '/'
    .get('', () => new Response('root'))
    .get('/', () => new Response('root/'))
    .get('/m3', () => new Response('m3'))
    .get('/error', () => {
      throw new Error('custom error message')
    })

  await t.step('GET ""', async () => {
    const req = new Request(baseUrl)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'root/')
  })

  await t.step('GET /', async () => {
    const req = new Request(`${baseUrl}/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'root/')
  })

  await t.step('GET /m1', async () => {
    const req = new Request(`${baseUrl}/m1`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'm1')
  })

  await t.step('GET /m1/:id', async () => {
    const req = new Request(`${baseUrl}/m1/123`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '123')
  })

  await t.step('GET /m2', async () => {
    const req = new Request(`${baseUrl}/m2`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'm2')
  })

  await t.step('GET /m3', async () => {
    const req = new Request(`${baseUrl}/m3`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'm3')
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
    assertEquals(await res.text(), 'custom error message')
  })
})

Deno.test('Order is important', async (t) => {
  await t.step('parent root first', async () => {
    const route = new Route()
      // add child route first
      .sub(
        new Route('/').get('/', (_req) => new Response('r1')),
        '/',
      ).get('/', () => new Response('r'))
    const req = new Request(`${baseUrl}/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'r')
  })

  await t.step('child root first', async () => {
    const route = new Route()
      // add handler first
      .get('/', () => new Response('r'))
      .sub(
        new Route('/').get('/', (_req) => new Response('r1')),
        '/',
      )
    const req = new Request(`${baseUrl}/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'r')
  })
})
