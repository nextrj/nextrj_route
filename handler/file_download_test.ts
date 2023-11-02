import { assert, assertEquals, assertFalse } from '../deps.ts'
import fileDownloadHandler, { create } from './file_download.ts'

const baseUrl = 'http://localhost:8001'

Deno.test('default handler', async (t) => {
  await t.step('not GET method', async () => {
    const req = new Request(baseUrl, { method: 'POST' })
    const res = await fileDownloadHandler(req)
    assertEquals(res.status, 405)
  })

  await t.step('path "./"', async () => {
    const req = new Request(baseUrl)
    const res = await fileDownloadHandler(req)
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 1)
    assertEquals(res.headers.get('content-type'), 'text/plain;charset=UTF-8')
    if (Deno.build.os == 'windows') {
      // 2023-11-02: win 11 treate Deno.open('./') as NotFound
      assertEquals(await res.text(), '"./" not found')
    } else {
      // 2023-11-02: macOS Hign Sierra treate Deno.open('./') as directory
      assertEquals(await res.text(), '"./" is not a file')
    }
  })

  await t.step('path "./unknown" not exists', async () => {
    const req = new Request(`${baseUrl}/unknown`)
    const res = await fileDownloadHandler(req)
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 1)
    assertEquals(res.headers.get('content-type'), 'text/plain;charset=UTF-8')
    assertEquals(await res.text(), '"./unknown" not found')
  })

  await t.step('download README.md', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./README.md')

    // request
    const req = new Request(`${baseUrl}/README.md`)
    const res = await fileDownloadHandler(req)
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
    const res = await fileDownloadHandler(req)
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
    const originFileInfo = await Deno.stat('./favicon.ico')

    // request
    const req = new Request(`${baseUrl}/favicon.ico`)
    const res = await fileDownloadHandler(req)
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
    const res = await customHandler(req)
    assertEquals(res.status, 404)
    assertEquals(Array.from(res.headers.keys()).length, 1)
    assertEquals(res.headers.get('content-type'), 'text/plain;charset=UTF-8')
    assertEquals(await res.text(), '"./unknown" not found')
  })

  await t.step('download README.md', async () => {
    // origin file info
    const originFileInfo = await Deno.stat('./README.md')

    // request
    const customHandler = create({ filepathParser: (_req, _pathParams) => './README.md' })
    const req = new Request(`${baseUrl}/any-path`)
    const res = await customHandler(req)
    assertEquals(res.status, 200)
    assertEquals(Array.from(res.headers.keys()).length, 4)
    assertEquals(res.headers.get('content-type'), 'text/markdown; charset=UTF-8')
    assertEquals(parseInt(res.headers.get('content-length')!), originFileInfo.size)
    assert(res.headers.has('date'))
    assert(res.headers.has('last-modified'))
    const lastModified = res.headers.get('last-modified') as string

    // save to
    const toFile = './temp/README.md'
    await res.body?.pipeTo((await Deno.open(toFile, { create: true, write: true })).writable)
    assertEquals((await Deno.stat(toFile)).size, originFileInfo.size)

    // re request with If-Modified-Since should return 304
    const req1 = new Request(`${baseUrl}/any-path`, { headers: { 'If-Modified-Since': lastModified } })
    const res1 = await customHandler(req1)
    assertEquals(res1.status, 304)
    assertFalse(res1.headers.has('last-modified'))
    assertFalse(res1.headers.has('date'))
    assertFalse(res1.headers.has('cache-control'))
    assertFalse(res1.headers.has('content-type'))
  })
})

Deno.test('allow cors handler', async (t) => {
  await t.step('cors=false', async () => {
    const customHandler = create({ cors: false })
    const req = new Request(`${baseUrl}/README.md`)
    const res = await customHandler(req)
    assertEquals(res.status, 200)
    assertFalse(res.headers.has('Access-Control-Allow-Origin'))
    await res.body?.cancel()
  })

  await t.step('cors=true', async () => {
    const customHandler = create({ cors: true })
    const req = new Request(`${baseUrl}/README.md`)
    const res = await customHandler(req)
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*')
    await res.body?.cancel()
  })

  await t.step('cors=example.com', async () => {
    const customHandler = create({ cors: 'example.com' })
    const req = new Request(`${baseUrl}/README.md`)
    const res = await customHandler(req)
    assertEquals(res.status, 200)
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), 'example.com')
    await res.body?.cancel()
  })
})

Deno.test('custom max-age cache handler', async () => {
  const maxAge = 60 * 60
  const customHandler = create({ maxAge })
  const req = new Request(`${baseUrl}/README.md`)
  const res = await customHandler(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('cache-control'), `max-age=${maxAge}`)
  await res.body?.cancel()
})

Deno.test('custom contentTypeParser handler', async () => {
  const contentType = 'custom-type'
  const customHandler = create({ contentTypeParser: (_req, _filepath) => contentType })
  const req = new Request(`${baseUrl}/README.md`)
  const res = await customHandler(req)
  assertEquals(res.status, 200)
  assertEquals(res.headers.get('content-type'), contentType)
  await res.body?.cancel()
})
