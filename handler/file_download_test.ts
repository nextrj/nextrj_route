import { assert, assertEquals, assertFalse } from '../deps.ts'
import fileDownloadHandler, { create } from './file_download.ts'

const baseUrl = 'http://localhost:8001'

Deno.test('default handler', async (t) => {
  await t.step('not GET method', async () => {
    const req = new Request(baseUrl, { method: 'POST' })
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 405)
  })

  await t.step('path "./" not exists', async () => {
    const req = new Request(baseUrl)
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 0)
    assertFalse(res.body)
  })

  await t.step('path "./unknown" not exists', async () => {
    const req = new Request(`${baseUrl}/unknown`)
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 0)
    assertFalse(res.body)
  })

  await t.step('download README.md', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./README.md')

    // request
    const req = new Request(`${baseUrl}/README.md`)
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 200)
    // res.headers.forEach((v, k) => console.log(`${k}=${v}`))
    assertEquals(Array.from(res.headers.keys()).length, 4)
    assertEquals(res.headers.get('content-type'), 'text/markdown; charset=UTF-8')
    assertEquals(parseInt(res.headers.get('content-length')!), originFileInfo.size)
    assert(res.headers.has('date'))
    assert(res.headers.has('last-modified'))

    // save to
    const toFile = './temp/README.md'
    await res.body?.pipeTo((await Deno.open(toFile, { create: true, write: true })).writable)
    assertEquals((await Deno.stat(toFile)).size, originFileInfo.size)
  })

  await t.step('download LICENSE', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./LICENSE')

    // request
    const req = new Request(`${baseUrl}/LICENSE`)
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 200)
    assertEquals(Array.from(res.headers.keys()).length, 4)
    assertEquals(res.headers.get('content-type'), 'application/octet-stream')
    assertEquals(parseInt(res.headers.get('content-length')!), originFileInfo.size)
    assert(res.headers.has('date'))
    assert(res.headers.has('last-modified'))

    // save to
    const toFile = './temp/LICENSE'
    await res.body?.pipeTo((await Deno.open(toFile, { create: true, write: true })).writable)
    assertEquals((await Deno.stat(toFile)).size, originFileInfo.size)
  })

  await t.step('download favicon.ico', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./example/favicon.ico')

    // request
    const req = new Request(`${baseUrl}/example/favicon.ico`)
    const res = await fileDownloadHandler(req, {})
    assertEquals(res.status, 200)
    assertEquals(Array.from(res.headers.keys()).length, 4)
    assertEquals(res.headers.get('content-type'), 'image/vnd.microsoft.icon')
    assertEquals(parseInt(res.headers.get('content-length')!), originFileInfo.size)
    assert(res.headers.has('date'))
    assert(res.headers.has('last-modified'))

    // save to
    const toFile = './temp/favicon.ico'
    await res.body?.pipeTo((await Deno.open(toFile, { create: true, write: true })).writable)
    assertEquals((await Deno.stat(toFile)).size, originFileInfo.size)
  })
})

Deno.test('custom filepathParser handler', async (t) => {
  await t.step('path not exists', async () => {
    const customHandler = create({ filepathParser: (_req, _pathParams) => './unknown' })
    const req = new Request(baseUrl)
    const res = await customHandler(req, {})
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 0)
    assertFalse(res.body)
  })

  await t.step('download README.md', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./README.md')

    // request
    const customHandler = create({ filepathParser: (_req, _pathParams) => './README.md' })
    const req = new Request(`${baseUrl}/any-path`)
    const res = await customHandler(req, {})
    assertEquals(res.status, 200)
    assertEquals(Array.from(res.headers.keys()).length, 4)
    assertEquals(res.headers.get('content-type'), 'text/markdown; charset=UTF-8')
    assertEquals(parseInt(res.headers.get('content-length')!), originFileInfo.size)
    assert(res.headers.has('date'))
    assert(res.headers.has('last-modified'))

    // save to
    const toFile = './temp/README.md'
    await res.body?.pipeTo((await Deno.open(toFile, { create: true, write: true })).writable)
    assertEquals((await Deno.stat(toFile)).size, originFileInfo.size)
  })
})

Deno.test('allow cors handler', async (t) => {
  await t.step('cors=true', async () => {
    const customHandler = create({ cors: true })
    const req = new Request(`${baseUrl}/README.md`)
    const res = await customHandler(req, {})
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    await res.body?.cancel()
  })

  await t.step('cors=example.com', async () => {
    const customHandler = create({ cors: 'example.com' })
    const req = new Request(`${baseUrl}/README.md`)
    const res = await customHandler(req, {})
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'example.com')
    await res.body?.cancel()
  })
})

Deno.test('custom max-age cache handler', async () => {
  const maxAge = 60 * 60
  const customHandler = create({ maxAge })
  const req = new Request(`${baseUrl}/README.md`)
  const res = await customHandler(req, {})
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('cache-control'), `max-age=${maxAge}`)
  await res.body?.cancel()
})

Deno.test('custom contentTypeParser handler', async () => {
  const contentType = 'custom-type'
  const customHandler = create({ contentTypeParser: (_req, _filepath) => contentType })
  const req = new Request(`${baseUrl}/README.md`)
  const res = await customHandler(req, {})
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('content-type'), contentType)
  await res.body?.cancel()
})
