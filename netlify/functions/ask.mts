import type { Config } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { requireAccess } from '../lib/auth.mts';

interface AskBody {
  mode: 'ask' | 'report';
  question?: string;
  entries: unknown[];
  stats?: unknown; // pre-computed numbers for the monthly report
}

const ASK_PROMPT = `You help one person reflect on their private well-being journal. Each entry has a date, mood and energy (1-5), sleep hours, free text, a "what went well" reflection, tags and the VIA character strengths they used.
Answer their question using only these entries. Be warm, plain and brief. Describe patterns as observations, never as medical advice or diagnosis. Mention how many days a pattern is based on, and say so when there are too few to tell.
Reply with JSON only, no prose around it: {"summary": string[] (2-4 short sentences), "matchDates": string[] (YYYY-MM-DD dates of the most relevant entries, newest first, at most 12)}.`;

const REPORT_PROMPT = `You write a short monthly reflection for one person, from their well-being check-ins and the stats provided. Their signature strengths are Love, Curiosity, Appreciation of Beauty & Excellence, Social Intelligence and Kindness.
Write 3-4 short paragraphs: how the month felt overall, what seemed to help, what seemed to weigh on them, and one gentle, specific suggestion for next month that uses a signature strength. Quote a phrase from their journal where it fits. Be warm and plain, never guilt-trip about missed days, and never give medical advice.
Reply with JSON only: {"summary": string[] (one string per paragraph)}.`;

function parseJson(text: string): { summary?: string[]; matchDates?: string[] } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return { summary: [text.trim()] };
  }
}

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const denied = requireAccess(req);
  if (denied) return denied;
  if (!Netlify.env.get('ANTHROPIC_API_KEY')) {
    return Response.json({ error: 'Claude is not set up yet: add ANTHROPIC_API_KEY in Netlify.' }, { status: 503 });
  }

  const body = (await req.json()) as AskBody;
  if (!Array.isArray(body.entries) || (body.mode === 'ask' && !body.question?.trim())) {
    return Response.json({ error: 'Missing question or entries.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: Netlify.env.get('ANTHROPIC_API_KEY') });
  const content =
    body.mode === 'report'
      ? `Stats for the month:\n${JSON.stringify(body.stats)}\n\nCheck-ins:\n${JSON.stringify(body.entries)}`
      : `Journal entries:\n${JSON.stringify(body.entries)}\n\nQuestion: ${body.question}`;

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low' },
      // If a request is declined for policy reasons, let the API retry it on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: body.mode === 'report' ? REPORT_PROMPT : ASK_PROMPT,
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'Claude could not answer that one. Try rephrasing.' }, { status: 422 });
    }
    const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const parsed = parseJson(text);
    return Response.json({ summary: parsed.summary ?? [], matchDates: parsed.matchDates ?? [] });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Netlify.' }, { status: 502 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Claude is busy right now. Try again in a minute.' }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return Response.json({ error: `Claude returned an error (${err.status}).` }, { status: 502 });
    }
    throw err;
  }
};

export const config: Config = { path: '/api/ask', method: 'POST' };
