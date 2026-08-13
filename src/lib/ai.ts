// Talks to OpenRouter directly — the key lives in the user's environment, so no
// server proxy is needed. The system prompt is ported verbatim from the web app
// (Make Me A Checklist) — it's the real value here.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'x-ai/grok-4.6'

// Tuned for a terminal checklist: steps must be short and scannable, because
// they're read in a narrow column, not a wide web card. Same JSON shape as the
// web app so the parser is unchanged.
const SYSTEM_PROMPT = `
You are a planning assistant for a TERMINAL checklist app. Turn the user's goal
into a compact, scannable checklist of phases and steps.

STRUCTURE
- Simple goals: 1–2 phases, 2–4 steps each.
- Bigger projects: 3–5 chronological phases, 3–5 steps each.
- Each phase is a short title. Each step is ONE concrete action.

WRITE FOR A NARROW TERMINAL — brevity is the whole point
- Keep every step SHORT: ideally under ~55 characters, one glanceable line.
- Start with a verb. Say WHAT to do, not a paragraph of how.
- No URLs, no long parentheticals, no "e.g." asides. Cut ruthlessly.
- Merge anything under ~2 minutes into a bigger step.
- Never list "open browser" or "go to a website" as their own steps.

GOOD vs BAD (note the length)
- BAD:  "Search for affordable movers in your area, compare at least 5 quotes, and save the top 3 to a spreadsheet"
- GOOD: "Compare 5 mover quotes, shortlist top 3"
- BAD:  "Book round-trip flights from NYC to SFO (JFK, EWR, or LGA; aim for $250–400)"
- GOOD: "Book round-trip flights to SFO"
- BAD:  "Handle finances"  (too vague)
- GOOD: "Cancel unused subscriptions"

If the user names a tool (Figma, Linear, etc.), assume its native workflow.

OUTPUT
Return ONLY valid JSON with exactly this structure:
{
  "title": "Short, outcome-oriented title",
  "items": [
    { "text": "Phase name", "subtasks": ["Step 1", "Step 2"] }
  ]
}
`

export type AiChecklist = {title: string; items: Array<{text: string; subtasks: string[]}>}

// A stable, UI-agnostic reason code. The app maps each to human-facing copy —
// this layer never decides what the user reads.
export type GenErrorCode = 'NO_KEY' | 'NETWORK' | 'SERVICE' | 'BAD_RESPONSE'

export class GenerationError extends Error {
  code: GenErrorCode
  detail?: string // short technical reason, for surfacing during debugging
  constructor(code: GenErrorCode, message: string, detail?: string) {
    super(message)
    this.code = code
    this.detail = detail
    this.name = 'GenerationError'
  }
}

export const hasApiKey = () => Boolean(process.env.OPENROUTER_API_KEY)

// Pull a JSON object out of the model's reply even if it's wrapped in ```json
// fences or a sentence of prose — more forgiving than a bare JSON.parse.
function extractJson(text: string): unknown {
  let s = text.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) s = fenced[1]!.trim()
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last > first) s = s.slice(first, last + 1)
  return JSON.parse(s)
}

/** Turn a one-line goal into a structured checklist. Throws GenerationError. */
export async function generateChecklist(goal: string, signal?: AbortSignal): Promise<AiChecklist> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new GenerationError('NO_KEY', 'No API key in the environment')

  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/AnushriyaB/checklist-tui',
        'X-Title': 'checklist-tui',
      },
      // No response_format: some models 400 on it. The prompt already demands
      // JSON, and extractJson() is forgiving — so this works across models.
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {role: 'system', content: SYSTEM_PROMPT},
          {role: 'user', content: goal},
        ],
        temperature: 0.7,
      }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error // let the caller treat cancellation separately
    throw new GenerationError('NETWORK', 'Could not reach the service', 'network request failed')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let reason = `HTTP ${response.status}`
    try {
      const j = JSON.parse(body) as {error?: {message?: string}}
      if (j?.error?.message) reason = `${response.status}: ${j.error.message}`
    } catch {
      /* body wasn't JSON */
    }
    throw new GenerationError('SERVICE', 'Service returned an error', reason.slice(0, 160))
  }

  const data = (await response.json().catch(() => null)) as
    | {choices?: Array<{message?: {content?: string}}>}
    | null
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new GenerationError('BAD_RESPONSE', 'Empty response', 'no content in response')

  let parsed: unknown
  try {
    parsed = extractJson(content)
  } catch {
    throw new GenerationError('BAD_RESPONSE', 'Malformed response', `not JSON: ${content.slice(0, 80)}`)
  }

  const result = parsed as AiChecklist
  if (!result || typeof result.title !== 'string' || !Array.isArray(result.items)) {
    throw new GenerationError('BAD_RESPONSE', 'Unexpected shape', 'missing title/items')
  }
  return result
}
