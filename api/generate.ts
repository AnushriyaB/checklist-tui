// Vercel Function — the OpenRouter key lives here as OPENROUTER_API_KEY.
// The TUI never sees it. Only {goal} comes in; only {title, items} go out.

declare const process: {env: Record<string, string | undefined>}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'x-ai/grok-4.6'
// Keep in sync with src/lib/limits.ts — the TUI counter uses the same cap.
const MAX_GOAL = 400
const RATE_MAX = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

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

type Hits = {n: number; reset: number}
const hits = new Map<string, Hits>()

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const cur = hits.get(ip)
  if (!cur || now >= cur.reset) {
    hits.set(ip, {n: 1, reset: now + RATE_WINDOW_MS})
    return false
  }
  cur.n += 1
  return cur.n > RATE_MAX
}

function extractJson(text: string): unknown {
  let s = text.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) s = fenced[1]!.trim()
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last > first) s = s.slice(first, last + 1)
  return JSON.parse(s)
}

function json(status: number, body: unknown) {
  return Response.json(body, {status})
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set on Vercel')
    return json(503, {error: 'unavailable'})
  }

  if (rateLimited(clientIp(request))) {
    return json(429, {error: 'rate_limited'})
  }

  let goal = ''
  try {
    const body = (await request.json()) as {goal?: unknown}
    goal = typeof body.goal === 'string' ? body.goal.trim() : ''
  } catch {
    return json(400, {error: 'bad_request'})
  }
  if (!goal || goal.length > MAX_GOAL) return json(400, {error: 'bad_request'})

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
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {role: 'system', content: SYSTEM_PROMPT},
          {role: 'user', content: goal},
        ],
        temperature: 0.7,
      }),
    })
  } catch (error) {
    console.error('OpenRouter network error', error)
    return json(502, {error: 'upstream'})
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('OpenRouter HTTP', response.status, text.slice(0, 200))
    return json(502, {error: 'upstream'})
  }

  const data = (await response.json().catch(() => null)) as
    | {choices?: Array<{message?: {content?: string}}>}
    | null
  const content = data?.choices?.[0]?.message?.content
  if (!content) return json(502, {error: 'bad_response'})

  try {
    const parsed = extractJson(content) as {title?: unknown; items?: unknown}
    if (!parsed || typeof parsed.title !== 'string' || !Array.isArray(parsed.items)) {
      return json(502, {error: 'bad_response'})
    }
    return json(200, {title: parsed.title, items: parsed.items})
  } catch {
    return json(502, {error: 'bad_response'})
  }
}
