/**
 * Detects the rate-limit exception raised by `enforce_rate_limit()`
 * (migration 0034).
 *
 * Chat messages and reviews are inserted straight from the browser, so
 * the limiter is a database trigger rather than a route handler — which
 * means the client receives a raw PostgREST error and has to recognise
 * it. Matching on the `ERR_*` message is how the rest of this codebase
 * branches on database exceptions (see the `ERROR_STATUS` maps in the
 * route handlers).
 */
export function isRateLimited(error: { message?: string } | null | undefined): boolean {
  return !!error?.message?.includes('ERR_RATE_LIMITED');
}
