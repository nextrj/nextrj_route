import { assert, assertEquals, assertFalse, assertObjectMatch, assertStrictEquals, assertThrows } from './deps.ts'
const baseUrl = 'http://localhost:8001'

Deno.test('empty or root path', () => {
  assert(new URLPattern(baseUrl).test(baseUrl))
  assertThrows(() => new URLPattern('').test(baseUrl), TypeError, 'a relative input without a base URL is not valid')
  assertThrows(
    () => new URLPattern({ pathname: '/path/to' }, baseUrl).test(baseUrl),
    TypeError,
    'specifying both an init object, and a seperate base URL is not valid',
  )

  // empty path
  assert(new URLPattern('', baseUrl).test(baseUrl))
  assert(new URLPattern({ pathname: '', baseURL: baseUrl }).test(baseUrl))
  assertFalse(new URLPattern({ pathname: '' }).test(baseUrl))
  assertFalse(new URLPattern('', baseUrl).test(`${baseUrl}?k=v`))

  // root path
  assert(new URLPattern({ pathname: '/' }).test(baseUrl))
  assert(new URLPattern({ pathname: '/' }).test(`${baseUrl}/`))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl }).test(baseUrl))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl }).test(`${baseUrl}/`))
  assertFalse(new URLPattern({ pathname: '/', baseURL: baseUrl }).test(`${baseUrl}?k=v`))
  assert(new URLPattern({ pathname: '/' }).test(`${baseUrl}?k=v`))
  assert(new URLPattern({ pathname: '/', search: '*' }).test(`${baseUrl}?k=v`))
  assert(new URLPattern({ pathname: '/', search: '*' }).test(`${baseUrl}/?k=v`))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl, search: '*' }).test(`${baseUrl}?k=v`))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl, search: '*' }).test(`${baseUrl}/?k=v`))
  assert(new URLPattern({ pathname: '/', hash: '*' }).test(`${baseUrl}#abc`))
  assert(new URLPattern({ pathname: '/', hash: '*' }).test(`${baseUrl}/#abc`))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl, hash: '*' }).test(`${baseUrl}#abc`))
  assert(new URLPattern({ pathname: '/', baseURL: baseUrl, hash: '*' }).test(`${baseUrl}/#abc`))

  assertFalse(new URLPattern({ pathname: '/', search: '*', hash: '*' }).test(`${baseUrl}/a`))
  assertFalse(new URLPattern({ pathname: '/', search: '*', hash: '*' }).test(`${baseUrl}/a#b`))
  assertFalse(new URLPattern({ pathname: '/', search: '*', hash: '*' }).test(`${baseUrl}/a?k=v`))
  assert(new URLPattern({ pathname: '/favicon.ico', search: '*', hash: '*' }).test(`${baseUrl}/favicon.ico`))
})

Deno.test('pattern.exec', () => {
  // match return object
  const pattern = new URLPattern({ pathname: '/:mname/:id' })
  const url = `${baseUrl}/user/123?k=v&k1=v1#abc`
  assert(pattern.test(url))
  const result = pattern.exec(url)
  assert(result)
  // console.log(JSON.stringify(result))
  assertObjectMatch(result, { pathname: { groups: { mname: 'user', id: '123' } } })
  const params = result?.pathname?.groups
  assertEquals(JSON.stringify(params), '{"mname":"user","id":"123"}')

  // not match return null
  const url1 = `${baseUrl}/path/to/unknown`
  assertFalse(pattern.test(url1))
  const result1 = pattern.exec(url1)
  assertStrictEquals(result1, null)
})

Deno.test('/path/to', () => {
  const pattern = new URLPattern({ pathname: '/path/to' })
  const url = `${baseUrl}/path/to?k=v`
  assert(pattern.test(url))
  const params = (pattern.exec(url)?.pathname?.groups || {}) as Record<string, string>
  assertEquals(JSON.stringify(params), '{}')
})

Deno.test('/path/:p1/:p2', () => {
  const pattern = new URLPattern({ pathname: '/path/:p1/:p2' })
  const url = `${baseUrl}/path/a/b?k=v`
  assert(pattern.test(url))
  const params = (pattern.exec(url)?.pathname?.groups || {}) as Record<string, string>
  assertEquals(params.p1, 'a')
  assertEquals(params.p2, 'b')
})

Deno.test('/static/* for static/a/b.html', () => {
  const pattern = new URLPattern({ pathname: '/static/*' })
  const url = `${baseUrl}/static/a/b.html`
  assert(pattern.test(url))
  const params = (pattern.exec(url)?.pathname?.groups || {}) as Record<string, string>
  // console.log(JSON.stringify(params, null, 2))
  assertEquals(params['0'], 'a/b.html')
  assertEquals(params[0], 'a/b.html')
})

Deno.test('/static/* for static/a.html', () => {
  const pattern = new URLPattern({ pathname: '/static/*' })
  const url = `${baseUrl}/static/a.html`
  assert(pattern.test(url))
  const params = (pattern.exec(url)?.pathname?.groups || {}) as Record<string, string>
  assertEquals(params['0'], 'a.html')
  assertEquals(params[0], 'a.html')
})

Deno.test('/static/* for static/a.html?k=v', () => {
  const pattern = new URLPattern({ pathname: '/static/*' })
  const url = `${baseUrl}/static/a.html?k=v`
  assert(pattern.test(url))
  const params = (pattern.exec(url)?.pathname?.groups || {}) as Record<string, string>
  assertEquals(params['0'], 'a.html')
  assertEquals(params[0], 'a.html')
})
