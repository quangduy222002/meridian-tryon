/**
 * AI step builder: turns a sentence like "slide the GPU in from the open side, warn that it's heavy" into a complete
 * build step. Runs in the viewer's browser with the viewer's own Anthropic API key (the site has no server), and is
 * loaded only when someone presses "Generate".
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ToolId } from './guide';

/** Named places a part can start or end at; the studio turns them into offsets. */
export const PLACES = ['installed', 'previous position', 'open side', 'above', 'front', 'rear', 'set aside'] as const;
export type Place = (typeof PLACES)[number];

export interface AiMove {
  part: string;
  from: Place;
  to: Place;
  /** How far away the named side is, in centimetres (0 = default). */
  distance_cm: number;
  /** Rotation at the start, in degrees; the part turns back to its installed orientation while it moves. */
  turn_at_start_deg: { x: number; y: number; z: number };
  /** Size at the start (1 = real size); it grows or shrinks to real size while it moves. */
  scale_at_start: number;
  /** Fade in (hidden at start) or fade out (hidden at end). */
  hidden_at_start: boolean;
  hidden_at_end: boolean;
}

export interface AiStep {
  title: string;
  body: string;
  warning: string;
  tools: ToolId[];
  moves: AiMove[];
  camera: 'wide' | 'close-up';
}

export interface AiContext {
  parts: { id: string; name: string; spec: string; qty: number; where: string }[];
  tools: { id: ToolId; label: string }[];
  steps: { title: string; parts: string[] }[];
  /** Index (0-based) the new step will be inserted at. */
  at: number;
}

const schema = (ctx: AiContext) => ({
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body', 'warning', 'tools', 'moves', 'camera'],
  properties: {
    title: { type: 'string', description: 'Short imperative title, max 6 words.' },
    body: { type: 'string', description: 'One to three sentences a beginner can follow.' },
    warning: { type: 'string', description: 'One safety or damage warning, or an empty string.' },
    tools: { type: 'array', items: { type: 'string', enum: ctx.tools.map((t) => t.id) } },
    moves: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'part',
          'from',
          'to',
          'distance_cm',
          'turn_at_start_deg',
          'scale_at_start',
          'hidden_at_start',
          'hidden_at_end',
        ],
        properties: {
          part: { type: 'string', enum: ctx.parts.map((p) => p.id) },
          from: { type: 'string', enum: [...PLACES] },
          to: { type: 'string', enum: [...PLACES] },
          distance_cm: { type: 'number' },
          turn_at_start_deg: {
            type: 'object',
            additionalProperties: false,
            required: ['x', 'y', 'z'],
            properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
          },
          scale_at_start: { type: 'number' },
          hidden_at_start: { type: 'boolean' },
          hidden_at_end: { type: 'boolean' },
        },
      },
    },
    camera: { type: 'string', enum: ['wide', 'close-up'] },
  },
});

const systemPrompt = (
  ctx: AiContext,
) => `You write one step of a 3D assembly guide for a gaming PC, like a page of a printed manual.
The viewer animates each part in the step from its "from" place to its "to" place.

Places:
- installed: the part's final position in the build.
- previous position: wherever the part ended after the last step that moved it (use this to continue a part's motion; for a part not in the build yet it means its usual approach side).
- open side / above / front / rear: a point that distance away from the installed position, on that side of the case. The case's open side faces the viewer; front is where the intake fans are; rear has the I/O and the PSU opening.
- set aside: on the table beside the case (for parts taken off, like a side panel).

Typical moves: a new part flies in from a side to "installed"; a part taken off goes from "previous position" to "set aside"; a part refitted goes from "previous position" to "installed". Choose the side a real builder would come from. Use distance_cm 0 unless the request implies a distance.

Each move can also:
- turn_at_start_deg: start rotated (degrees around x = front-rear axis, y = vertical, z = towards the viewer) and turn into its installed orientation while moving — e.g. {"x":0,"y":0,"z":90} for a part that has to be twisted into place. Use 0s when no turn is needed.
- scale_at_start: start smaller or larger and grow to real size (1 = no change; use 1 unless asked, e.g. 0.5 to "grow into place").
- hidden_at_start / hidden_at_end: fade the part in or out (e.g. hidden_at_end for packaging or a part that is removed for good). Use false unless asked.

Parts (id — name — where it is before this step):
${ctx.parts.map((p) => `- ${p.id} — ${p.qty > 1 ? `${p.qty}× ` : ''}${p.name} (${p.spec}) — ${p.where}`).join('\n')}

Tools (id — label): ${ctx.tools.map((t) => `${t.id} — ${t.label}`).join('; ')}

Guide so far:
${ctx.steps.length ? ctx.steps.map((s, i) => `${i + 1}. ${s.title} [${s.parts.join(', ') || 'no parts'}]`).join('\n') : '(empty)'}
The new step will be step ${ctx.at + 1}.

Write title, body and warning in the same language as the request. Only include the parts the request is about (or that the step clearly needs). Use "close-up" for small parts on the motherboard, "wide" otherwise.`;

/** Generates a step. Throws an Error whose message is safe to show to the user. */
export async function generateStep(apiKey: string, request: string, ctx: AiContext): Promise<AiStep> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // If the model declines, the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schema(ctx) } },
      system: systemPrompt(ctx),
      messages: [{ role: 'user', content: request }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError)
      throw new Error('That API key was rejected. Check it and try again.', { cause: err });
    if (err instanceof Anthropic.PermissionDeniedError)
      throw new Error('This API key is not allowed to use the model.', { cause: err });
    if (err instanceof Anthropic.RateLimitError)
      throw new Error('Rate limited by Anthropic — wait a moment and retry.', { cause: err });
    if (err instanceof Anthropic.APIConnectionError)
      throw new Error('Could not reach Anthropic. Check your connection.', { cause: err });
    if (err instanceof Anthropic.APIError)
      throw new Error(`Anthropic API error ${err.status ?? ''}: ${err.message}`, { cause: err });
    throw err;
  }
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request. Try rephrasing it.');
  if (res.stop_reason === 'max_tokens') throw new Error('The answer was cut off. Try a shorter request.');
  const text = res.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('The model returned no step. Try again.');
  let step: AiStep;
  try {
    step = JSON.parse(text.text) as AiStep;
  } catch {
    throw new Error('The model returned an unreadable step. Try again.');
  }
  const ids = new Set(ctx.parts.map((p) => p.id));
  const toolIds = new Set(ctx.tools.map((t) => t.id));
  step.moves = (step.moves ?? []).filter((m) => ids.has(m.part));
  step.tools = (step.tools ?? []).filter((t) => toolIds.has(t));
  if (!step.title) throw new Error('The model returned an empty step. Try describing it differently.');
  return step;
}
