import { timingSafeEqual } from 'node:crypto';

// Steady is a one-person app, so the cloud features are protected by a single
// access code (STEADY_ACCESS_CODE). The app sends it in this header.
export const ACCESS_HEADER = 'x-steady-code';

export function isAuthorized(req: Request): boolean {
  const expected = Netlify.env.get('STEADY_ACCESS_CODE');
  const given = req.headers.get(ACCESS_HEADER);
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns a 401 response when the request is not authorised, otherwise null. */
export function requireAccess(req: Request): Response | null {
  if (!Netlify.env.get('STEADY_ACCESS_CODE')) {
    return Response.json({ error: 'Cloud features are not set up yet: STEADY_ACCESS_CODE is missing.' }, { status: 503 });
  }
  return isAuthorized(req) ? null : Response.json({ error: 'That access code is not right.' }, { status: 401 });
}
