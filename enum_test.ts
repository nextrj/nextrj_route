import { assertEquals, assertNotEquals } from './deps.ts'

Deno.test('enum and string', () => {
  enum Method {
    GET = 'GET',
    POST = 'POST',
  }
  // enum string
  assertEquals(Method.GET, 'GET')
  assertEquals(typeof Method.GET, 'string')
  assertEquals(Object.keys(Method).join(' '), 'GET POST')
  assertEquals(Object.values(Method).join(' '), 'GET POST')

  // string to enum
  const g = 'GET' as Method
  assertEquals(g, Method.GET)
  const e = 'get' as Method
  assertNotEquals(e, Method.GET)

  // array to object
  const o = Object.fromEntries(Object.keys(Method).map((k) => [k, []]))
  assertEquals(JSON.stringify(o), '{"GET":[],"POST":[]}')

  // enum as key
  const r = { [Method.GET]: '/a', b: true }
  assertEquals(r[Method.GET], '/a')
  assertEquals(JSON.stringify(r), '{"GET":"/a","b":true}')
  assertEquals(Object.keys(r).join(' '), 'GET b')
})
