/**
 * A file download handler that use streams in order to prevent having to load entire files into memory.
 *
 * @module
 */

import { contentType, extname } from '../deps.ts'
import { AsyncHandler, Context } from '../mod.ts'

export type FilepathParser = (req: Request, ctx?: Context) => string | Promise<string>
export type ContentTypeParser = (filepath: string, req?: Request) => string | Promise<string>
export type CreateOptions = {
  filepathParser?: FilepathParser
  contentTypeParser?: ContentTypeParser
  /** allow-origin */
  cors?: boolean | string
  /** client cache seconds */
  maxAge?: number
}
export const DEFAULT_FILEPATH_PARSER = (req: Request) => '.' + decodeURIComponent(new URL(req.url).pathname)
export const DEFAULT_CONTENT_TYPE_PARSER = (filepath: string) =>
  contentType(extname(filepath)) || 'application/octet-stream'

/** Create a download file Handler */
export function create(options: CreateOptions = {}): AsyncHandler {
  return async function handle(req: Request, ctx?: Context): Promise<Response> {
    if (req.method !== 'GET') return new Response(undefined, { status: 405 })

    const { cors, maxAge, filepathParser = DEFAULT_FILEPATH_PARSER, contentTypeParser = DEFAULT_CONTENT_TYPE_PARSER } =
      options

    // get file path
    const p = filepathParser(req, ctx)
    const filepath: string = (p instanceof Promise) ? (await p) : p

    // open file for read
    let file
    try {
      file = await Deno.open(filepath, { read: true })
    } catch (_e) {
      // opened failed, return 404
      return new Response(undefined, { status: 404 })
    }
    const fileInfo = await file.stat()
    if (!fileInfo.isFile) {
      file.close()
      return new Response(`"${filepath}" is not a file`, { status: 404 })
    }

    // get contentType
    const p1 = contentTypeParser(filepath, req)
    const contentType: string = (p1 instanceof Promise) ? (await p1) : p1

    // build headers
    const headers: Record<string, string> = { 'content-type': contentType }
    if (cors) headers['Access-Control-Allow-Origin'] = typeof cors === 'boolean' ? '*' : cors
    if (maxAge) headers['cache-control'] = `max-age=${maxAge}`

    // file info to header
    if (fileInfo.atime) headers['date'] = fileInfo.atime.toUTCString()
    if (fileInfo.mtime) headers['last-modified'] = fileInfo.mtime.toUTCString()

    // if a `if-modified-since` header is present and the value is bigger than
    // the access timestamp value, then return 304
    const ifModifiedSinceValue = req.headers.get('if-modified-since')
    if (
      fileInfo.mtime && ifModifiedSinceValue &&
      fileInfo.mtime.getTime() < new Date(ifModifiedSinceValue).getTime() + 1000
    ) return new Response(file.readable, { status: 304, headers })

    // Set content length header
    if (fileInfo.size) headers['content-length'] = `${fileInfo.size}`

    // read file to stream so the file doesn't have to be fully loaded into memory
    return new Response(file.readable, { status: 200, headers })
  }
}

/** A default file download Handler */
const fileDownloadHandler = create()
export default fileDownloadHandler
