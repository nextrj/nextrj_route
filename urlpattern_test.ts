import { assert, assertEquals } from './deps.ts'

const baseUrl = 'http://localhost:8001'
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
