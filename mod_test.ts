import { assertEquals, assertFalse } from './deps.ts'
import Route, { DEFAULT_ERROR_MAPPER, ErrorMapper, Filter, FilterError, Handler, SyncFilter } from './mod.ts'

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

Deno.test('Nested Routee - two layer', async (t) => {
  // module1 route
  const m1Route = new Route()
    .get((_req) => new Response('m1'))
    .get('/', (_req) => new Response('m1/'))
    .get('/:id', (_req, { id } = {}) => new Response(id as string))

  // module2 route
  const m2Route = new Route('/m2')
    .get('', (_req) => new Response('m2'))

  // top route
  const route = new Route()
    .sub('/m1', m1Route)
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

Deno.test('Nested Route - order is important - first config has top priority', async (t) => {
  await t.step('parent handlers first', async () => {
    const route = new Route()
      // add handler first
      .get('/', () => new Response('root'))
      .sub('/', new Route().get(() => new Response('child')))
    const req = new Request(`${baseUrl}/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'root')
  })

  await t.step('add sub route first', async () => {
    const route = new Route()
      // add sub route first
      .sub('/', new Route().get(() => new Response('child')))
      .get('/', () => new Response('root'))
    const req = new Request(`${baseUrl}/`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'child')
  })
})

Deno.test('Nested Route - more layer', async (t) => {
  const m1Route = new Route()
    .setDebug(false)
    .get('', (_req) => new Response('m1'))
    .sub(
      '/a',
      new Route()
        .get(() => new Response('m1/a'))
        .sub('/b', new Route().get(() => new Response('m1/a/b'))),
    )
    .get('/:id', (_req, ctx) => new Response(ctx?.id as string))

  const m2Route = new Route('/m2')
    .setDebug(false)
    .get('/', (_req) => new Response('m2'))
    .get('/:id', (_req, ctx) => new Response(ctx?.id as string))

  const route = new Route()
    .setDebug(false)
    .get('/', () => new Response('root'))
    .sub('/m1', m1Route)
    .sub(m2Route)

  await t.step('GET "" or GET /', async (t) => {
    await t.step('GET "" ', async () => {
      const req = new Request(baseUrl)
      const res = await route.handle(req)
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'root')
    })
    await t.step('GET /', async () => {
      const req = new Request(`${baseUrl}/`)
      const res = await route.handle(req)
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'root')
    })
  })

  await t.step('GET /m1 or GET /m1/', async (t) => {
    await t.step('GET /m1', async () => {
      const req = new Request(`${baseUrl}/m1`)
      const res = await route.handle(req)
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'm1')
    })
    await t.step('GET /m1/', async () => {
      const req = new Request(`${baseUrl}/m1/`)
      const res = await route.handle(req)
      assertEquals(res.status, 404)
    })
  })

  await t.step('GET /m1/a', async () => {
    const req = new Request(`${baseUrl}/m1/a`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'm1/a')
  })

  await t.step('GET /m1/:id', async () => {
    const req = new Request(`${baseUrl}/m1/1`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '1')
  })

  await t.step('GET /m1/a/b', async () => {
    const req = new Request(`${baseUrl}/m1/a/b`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'm1/a/b')
  })

  await t.step('GET /m1 or GET /m1/', async (t) => {
    await t.step('GET /m2', async () => {
      const req = new Request(`${baseUrl}/m2`)
      const res = await route.handle(req)
      assertEquals(res.status, 404)
    })
    await t.step('GET /m2/', async () => {
      const req = new Request(`${baseUrl}/m2/`)
      const res = await route.handle(req)
      assertEquals(res.status, 200)
      assertEquals(await res.text(), 'm2')
    })
  })

  await t.step('GET /m2/:id', async () => {
    const req = new Request(`${baseUrl}/m2/2`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), '2')
  })
})

Deno.test('Nested Route with nested filter', async (t) => {
  type CTX = { s: string[] }
  function createFilter(value: string): Filter {
    const filter: SyncFilter = (_, ctx = {}) => {
      const c = ctx as CTX
      if (!c.s) ctx.s = []
      c.s.push(value)
    }
    return filter
  }
  const route = new Route(undefined, createFilter('r'))
    .setDebug(false)
    .get('/h', (_, { s } = {}) => new Response((s as string[]).join('|')), createFilter('rh'))
    .sub(
      '/a',
      new Route(undefined, createFilter('a'))
        .get('/h', (_, { s } = {}) => new Response((s as string[]).join('|')), createFilter('ah'))
        .sub(
          '/b',
          new Route(undefined, createFilter('b'))
            .get('/h', (_, { s } = {}) => new Response((s as string[]).join('|')), createFilter('bh')),
        ),
    )

  await t.step('GET /h', async () => {
    const req = new Request(`${baseUrl}/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'r|rh')
  })

  await t.step('GET /a/h', async () => {
    const req = new Request(`${baseUrl}/a/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'r|a|ah')
  })

  await t.step('GET /a/b/h', async () => {
    const req = new Request(`${baseUrl}/a/b/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 200)
    assertEquals(await res.text(), 'r|a|b|bh')
  })
})

Deno.test('Nested Route with nested errorMapper on handler', async (t) => {
  function createHandler(errorMsg: string): Handler {
    return (): Response => {
      throw new Error(errorMsg)
    }
  }
  function createErrorMapper(prefix: string): ErrorMapper {
    return (err): Response => {
      return new Response(`${prefix}:${err.message}`, { status: 400 })
    }
  }

  const route = new Route().setDebug(false)
    .get('/h', createHandler('h'))
    .sub(
      '/a',
      new Route().errorMapper(createErrorMapper('a'))
        .get('/h', createHandler('ah'))
        .sub('/b', new Route().errorMapper(createErrorMapper('b')).get('/h', createHandler('bh')))
        .sub('/c', new Route().get('/h', createHandler('ch'))),
    )
    .sub(
      '/a1',
      new Route()
        .get('/h', createHandler('a1h'))
        .sub('/b1', new Route().get('/h', createHandler('b1h'))),
    )

  await t.step('GET /h', async () => {
    const req = new Request(`${baseUrl}/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'h')
  })

  await t.step('GET /a/h', async () => {
    const req = new Request(`${baseUrl}/a/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'a:ah')
  })

  await t.step('GET /a/b/h', async () => {
    const req = new Request(`${baseUrl}/a/b/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'b:bh')
  })

  await t.step('GET /a/c/h', async () => {
    const req = new Request(`${baseUrl}/a/c/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'a:ch')
  })

  await t.step('GET /a1/h', async () => {
    const req = new Request(`${baseUrl}/a1/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'a1h')
  })

  await t.step('GET /a1/b1/h', async () => {
    const req = new Request(`${baseUrl}/a1/b1/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'b1h')
  })
})

Deno.test('Nested Route with nested errorMapper on filter', async (t) => {
  function createFilter(errorMsg: string): Filter {
    return (): void => {
      throw new Error(errorMsg)
    }
  }
  function createHandler(errorMsg: string): Handler {
    return (): Response => {
      throw new Error(errorMsg)
    }
  }
  function createErrorMapper(prefix: string): ErrorMapper {
    return (err): Response => {
      return new Response(`${prefix}:${err.message}`, { status: 400 })
    }
  }

  const route = new Route().setDebug(false)
    .get('/h', createHandler('h'), createFilter('rhf'))
    .sub(
      '/a',
      new Route().errorMapper(createErrorMapper('a'))
        .get('/h', createHandler('ah'), createFilter('ahf'))
        .sub('/b', new Route().errorMapper(createErrorMapper('b')).get('/h', createHandler('bh'), createFilter('abhf')))
        .sub('/c', new Route().get('/h', createHandler('ch')), createFilter('achf')),
    )
    .sub(
      '/a1',
      new Route(undefined, createFilter('a1f'))
        .get('/h', createHandler('a1h')),
    )

  await t.step('GET /h', async () => {
    const req = new Request(`${baseUrl}/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'rhf')
  })

  await t.step('GET /a/h', async () => {
    const req = new Request(`${baseUrl}/a/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'a:ahf')
  })

  await t.step('GET /a/b/h', async () => {
    const req = new Request(`${baseUrl}/a/b/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'b:abhf')
  })

  await t.step('GET /a/c/h', async () => {
    const req = new Request(`${baseUrl}/a/c/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 400)
    assertEquals(await res.text(), 'a:achf')
  })

  await t.step('GET /a1/h', async () => {
    const req = new Request(`${baseUrl}/a1/h`)
    const res = await route.handle(req)
    assertEquals(res.status, 500)
    assertEquals(await res.text(), 'a1f')
  })
})
