import { assertEquals, assertFalse } from '../deps.ts'
import allowCorsHandler, { create, DEFAULT_CORS_OPTIONS } from './allow_cors.ts'

const baseUrl = 'http://localhost:8001'

Deno.test('default cors handler', () => {
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = allowCorsHandler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Allow-Origin'), DEFAULT_CORS_OPTIONS.allowOrigin)
  assertEquals(headers.get('Access-Control-Allow-Methods'), DEFAULT_CORS_OPTIONS.allowMethods)
  assertEquals(headers.get('Access-Control-Allow-Headers'), DEFAULT_CORS_OPTIONS.allowHeaders)
  assertFalse(headers.has('Access-Control-Allow-Credentials'))
  assertFalse(headers.has('Access-Control-Max-Age'))
})

Deno.test('custom Allow-Origin', () => {
  const handler = create({ allowOrigin: 'example.com' })
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = handler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Allow-Origin'), 'example.com')
  assertEquals(headers.get('Access-Control-Allow-Methods'), DEFAULT_CORS_OPTIONS.allowMethods)
  assertEquals(headers.get('Access-Control-Allow-Headers'), DEFAULT_CORS_OPTIONS.allowHeaders)
  assertFalse(headers.has('Access-Control-Allow-Credentials'))
  assertFalse(headers.has('Access-Control-Max-Age'))
})

Deno.test('custom Allow-Methods', () => {
  const handler = create({ allowMethods: 'GET' })
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = handler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Allow-Methods'), 'GET')
  assertEquals(headers.get('Access-Control-Allow-Origin'), DEFAULT_CORS_OPTIONS.allowOrigin)
  assertEquals(headers.get('Access-Control-Allow-Headers'), DEFAULT_CORS_OPTIONS.allowHeaders)
  assertFalse(headers.has('Access-Control-Allow-Credentials'))
  assertFalse(headers.has('Access-Control-Max-Age'))
})

Deno.test('custom Allow-Headers', () => {
  const handler = create({ allowHeaders: 'ABC' })
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = handler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Allow-Headers'), 'ABC')
  assertEquals(headers.get('Access-Control-Allow-Origin'), DEFAULT_CORS_OPTIONS.allowOrigin)
  assertEquals(headers.get('Access-Control-Allow-Methods'), DEFAULT_CORS_OPTIONS.allowMethods)
  assertFalse(headers.has('Access-Control-Allow-Credentials'))
  assertFalse(headers.has('Access-Control-Max-Age'))
})

Deno.test('custom Allow-Credentials', () => {
  const handler = create({ allowCredentials: true })
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = handler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Allow-Credentials'), 'true')
  assertEquals(headers.get('Access-Control-Allow-Origin'), DEFAULT_CORS_OPTIONS.allowOrigin)
  assertEquals(headers.get('Access-Control-Allow-Methods'), DEFAULT_CORS_OPTIONS.allowMethods)
  assertEquals(headers.get('Access-Control-Allow-Headers'), DEFAULT_CORS_OPTIONS.allowHeaders)
  assertFalse(headers.has('Access-Control-Max-Age'))
})

Deno.test('custom Max-Age', () => {
  const handler = create({ maxAge: 123 })
  const req = new Request(baseUrl, { method: 'OPTIONS' })
  const res = handler(req)
  assertEquals(res.status, 204)
  const headers = res.headers
  assertEquals(headers.get('Access-Control-Max-Age'), '123')
  assertEquals(headers.get('Access-Control-Allow-Origin'), DEFAULT_CORS_OPTIONS.allowOrigin)
  assertEquals(headers.get('Access-Control-Allow-Methods'), DEFAULT_CORS_OPTIONS.allowMethods)
  assertEquals(headers.get('Access-Control-Allow-Headers'), DEFAULT_CORS_OPTIONS.allowHeaders)
  assertFalse(headers.has('Access-Control-Allow-Credentials'))
})

Deno.test('not OPTIONS method', () => {
  const handler = create({ maxAge: 123 })
  const req = new Request(baseUrl, { method: 'GET' })
  const res = handler(req)
  assertEquals(res.status, 405)
})
