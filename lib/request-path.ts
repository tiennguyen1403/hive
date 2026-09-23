/**
 * The request header that carries the path a visitor asked for, from
 * `proxy.ts` to the render (slice B3b).
 *
 * A layout is not handed its page's address, so the admin layout's sign-in
 * detour could only ever say `next=/admin` — and a layout's redirect is the
 * one that wins. The proxy sets this header on every request it sees
 * (overwriting anything a client sent under the name), and
 * `lib/db/session.ts` reads it when no path is passed.
 *
 * A module of its own so both sides import one name: the proxy must not pull
 * in `next/headers`, and the session module must not restate a string.
 */
export const PATH_HEADER = "x-pathname";
