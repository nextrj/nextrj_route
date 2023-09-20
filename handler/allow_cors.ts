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

/**
 * Create a CORS Handler.
 *
 * Defaults:
 * - allowOrigin = "*"
 * - allowMethods = "GET, POST, PUT, PATCH, DELETE"
 * - allowHeaders = "Authorization"
 * - response.status = 204 for OPTIONS method
 * - response.status = 405 for not OPTIONS method
 */
export function create(options: CorsOptions = {}): SyncHandler {
  const {
    allowOrigin = DEFAULT_CORS_OPTIONS.allowOrigin,
    allowMethods = DEFAULT_CORS_OPTIONS.allowMethods,
    allowHeaders = DEFAULT_CORS_OPTIONS.allowHeaders,
    allowCredentials,
    maxAge,
  } = options
  return function handle(req: Request): Response {
    if (req.method !== 'OPTIONS') return new Response(undefined, { status: 405 })

    const headers: Record<string, string> = {}
    if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
    if (allowMethods) headers['Access-Control-Allow-Methods'] = allowMethods
    if (allowHeaders) headers['Access-Control-Allow-Headers'] = allowHeaders
    if (allowCredentials !== undefined) headers['Access-Control-Allow-Credentials'] = allowCredentials + ''
    if (maxAge) headers['Access-Control-Max-Age'] = maxAge.toFixed(0)

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
