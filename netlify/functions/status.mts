import type { Config } from '@netlify/functions';
import { isAuthorized } from '../lib/auth.mts';

// Tells the app which cloud features are configured, and whether its access code works.
export default async (req: Request) => {
  return Response.json({
    configured: Boolean(Netlify.env.get('STEADY_ACCESS_CODE')),
    authorized: isAuthorized(req),
    ai: Boolean(Netlify.env.get('ANTHROPIC_API_KEY')),
    push: Boolean(Netlify.env.get('VAPID_PUBLIC_KEY') && Netlify.env.get('VAPID_PRIVATE_KEY')),
  });
};

export const config: Config = { path: '/api/status', method: 'GET' };
