/**
 * Create a custom cors handler by {@linkcode create} or use default cors handler
 * by {@linkcode allowCorsHandler} for OPTIONS request.
 *
 * @module
 */

import { SyncHandler } from '../mod.ts'

export type CorsOptions = {
  allowOrigin?: string
  allowMethods?: string
  allowHeaders?: string
  allowCredentials?: boolean
  /** Cache seconds */
  maxAge?: number
}

export const DEFAULT_CORS_OPTIONS = {
  allowOrigin: '*',
  allowMethods: 'GET, POST, PUT, PATCH, DELETE',
  allowHeaders: 'Authorization',
}

/** Create a CORS Handler */
export function create(options: CorsOptions = DEFAULT_CORS_OPTIONS): SyncHandler {
  return function handle(req: Request): Response {
    if (req.method !== 'OPTIONS') return new Response(undefined, { status: 405 })

    const headers: Record<string, string> = {}
    if (options.allowOrigin) headers['Access-Control-Allow-Origin'] = options.allowOrigin
    if (options.allowMethods) headers['Access-Control-Allow-Methods'] = options.allowMethods
    if (options.allowHeaders) headers['Access-Control-Allow-Headers'] = options.allowHeaders
    if (Object.hasOwn(options, 'allowCredentials')) {
      headers['Access-Control-Allow-Credentials'] = (options.allowCredentials || false) + ''
    }
    if (options.maxAge) headers['Access-Control-Max-Age'] = options.maxAge.toFixed(0)

    return new Response(undefined, { status: 204, headers })
  }
}

/**
 * A default allow-cors Handler.
 * - Access-Control-Allow-Origin = "*"
 * - Access-Control-Allow-Methods = "GET, POST, PUT, PATCH, DELETE"
 * - Access-Control-Allow-Headers = "Authorization"
 * - response.status = 204 for OPTIONS method
 * - response.status = 405 for not OPTIONS method
 */
const allowCorsHandler = create()
export default allowCorsHandler
