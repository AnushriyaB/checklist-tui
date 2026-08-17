declare const process: {env: Record<string, string | undefined>}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'x-ai/grok-4.6'
const MAX_GOAL = 400
const RATE_MAX = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

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
  const systemPrompt =
    process.env.CHECKLIST_SYSTEM_PROMPT ??
    'Turn the user goal into a compact JSON checklist for a narrow terminal. Phases with short verb-led steps, under 55 characters. Return only JSON: {"title":string,"items":[{"text":string,"subtasks":string[]}]}'
  if (!apiKey) return json(503, {error: 'unavailable'})

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
          {role: 'system', content: systemPrompt},
          {role: 'user', content: goal},
        ],
        temperature: 0.7,
      }),
    })
  } catch {
    return json(502, {error: 'upstream'})
  }

  if (!response.ok) return json(502, {error: 'upstream'})

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
