/**
 * A file server.
 *
 * CLI:
 *
 * ```shell
 * deno run --allow-read --allow-net https://deno.land/x/nextrj_route/example/file_server.ts
 * ```
 *
 * Arguments:
 *
 * 1. -p or --port : set server port, default 8001
 * 2. -r or --root : set file root dir, default current dir
 * 3. -c or --cors : set whether allow cors by set response header 'Access-Control-Allow-Origin'='*', default true.
 * @module
 */
import { contentType, extname, joinPath, parseArgs } from '../deps.ts'
import Route from '../mod.ts'
import { create as createFileDownloadHandler } from '../handler/file_download.ts'

// parse command line args
// -p or --port : set server port, default 8001
// -r or --root : set file root dir, default current dir
// -c or --cors : set whether allow cors.
const cfg = parseArgs(Deno.args, {
  default: { p: 8001, c: true },
  alias: { p: 'port', r: 'root', c: 'cors' },
})
// console.log(JSON.stringify(cfg, null, 2))
const port = cfg.port as number
const cors = ['false', 'f', '0'].includes((cfg.cors + '').toLowerCase()) ? false : cfg.cors

// create a file download handler
const fileDownloadHandler = createFileDownloadHandler({
  cors,
  filepathParser: (_req, ctx) => cfg.root ? joinPath(cfg.root, ctx?.[0] as string) : ctx?.[0] as string,
  contentTypeParser: (filepath, _req) => {
    const ext = extname(filepath)
    return ext === '.ts' ? 'application/x-typescript; charset=UTF-8' : (contentType(ext) || 'application/octet-stream')
  },
})

// init route
const route = new Route()
  .get('/', () => new Response('NextRJ File Server Example'))
  .get('/*', fileDownloadHandler)

// start server
Deno.serve({ port }, (
  req: Request,
  info: Deno.ServeHandlerInfo,
): Response | Promise<Response> => route.handle(req, info))
