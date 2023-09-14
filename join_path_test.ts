import { assertEquals, joinPath } from './deps.ts'

Deno.test('join path', () => {
  if (Deno.build.os === 'windows') {
    assertEquals(joinPath('static', 'a.html'), 'static\\a.html')
    assertEquals(joinPath('static', '\\a.html'), 'static\\a.html')
    assertEquals(joinPath('.', '\\a.html'), 'a.html')
    assertEquals(joinPath('.', 'a.html'), 'a.html')
    assertEquals(joinPath('.', '.\\a.html'), 'a.html')
    assertEquals(joinPath('.\\', 'a.html'), 'a.html')
    assertEquals(joinPath('.\\', '\\a.html'), 'a.html')
    assertEquals(joinPath('.\\', '.\\a.html'), 'a.html')
    assertEquals(joinPath('..\\', 'a.html'), '..\\a.html')
    assertEquals(joinPath('..\\', '\\a.html'), '..\\a.html')
    assertEquals(joinPath('..\\', '.\\a.html'), '..\\a.html')
  } else { // darwin, linux
    assertEquals(joinPath('static', 'a.html'), 'static/a.html')
    assertEquals(joinPath('static', '/a.html'), 'static/a.html')
    assertEquals(joinPath('.', '/a.html'), 'a.html')
    assertEquals(joinPath('.', 'a.html'), 'a.html')
    assertEquals(joinPath('.', './a.html'), 'a.html')
    assertEquals(joinPath('./', 'a.html'), 'a.html')
    assertEquals(joinPath('./', '/a.html'), 'a.html')
    assertEquals(joinPath('./', './a.html'), 'a.html')
    assertEquals(joinPath('../', 'a.html'), '../a.html')
    assertEquals(joinPath('../', '/a.html'), '../a.html')
    assertEquals(joinPath('../', './a.html'), '../a.html')
  }
})
