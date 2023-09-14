import { assertEquals, contentType, extname } from './deps.ts'

Deno.test('contentType', () => {
  assertEquals(extname(''), '')
  assertEquals(extname('t'), '')
  assertEquals(extname('a/t.html'), '.html')

  assertEquals(contentType('unknown'), undefined)
  assertEquals(contentType('t.html'), undefined) // only extension
  assertEquals(contentType(extname('a/t.html')), 'text/html; charset=UTF-8')
  assertEquals(contentType(extname('t.html')), 'text/html; charset=UTF-8')
  assertEquals(contentType(extname('t.htm')), 'text/html; charset=UTF-8')
  assertEquals(contentType(extname('t.js')), 'application/javascript; charset=UTF-8')
  assertEquals(contentType(extname('t.css')), 'text/css; charset=UTF-8')

  assertEquals(contentType(extname('t.txt')), 'text/plain; charset=UTF-8')
  assertEquals(contentType(extname('t.md')), 'text/markdown; charset=UTF-8')

  assertEquals(contentType(extname('t.pdf')), 'application/pdf')
  assertEquals(contentType(extname('t.ico')), 'image/vnd.microsoft.icon')
  assertEquals(contentType(extname('t.png')), 'image/png')
  assertEquals(contentType(extname('t.jpg')), 'image/jpeg')
  assertEquals(contentType(extname('t.jpeg')), 'image/jpeg')
  assertEquals(contentType(extname('t.gif')), 'image/gif')

  assertEquals(contentType(extname('t.exe')), 'application/x-msdos-program')
  assertEquals(contentType(extname('t.bin')), 'application/octet-stream')
})
