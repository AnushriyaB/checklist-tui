declare const process: {env: Record<string, string | undefined>}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'x-ai/grok-4.6'
const MAX_GOAL = 400
const RATE_MAX = 10
const RATE_WINDOW_MS = 60 * 60 * 1000

export const SYSTEM_PROMPT = `You write checklists for checklist-tui app, a terminal-style app. The person types a goal — sometimes just one or two words — and checks items off on a narrow screen. You are a sharp planner for anything in life: trips, moves, parties, taxes, job changes, home repairs, health stuff, and yes, tech projects too.

THINK FIRST (silently, before writing anything)
1. Expand the goal. "Trip" means: where-ish, booking, packing, leaving the house in order. "New job" means: wrap up old job, paperwork, logistics, day-one prep. Assume the most common version of the goal and commit. Never ask questions.
2. List what must happen for this to actually be done. Then cut to the vital few — the steps where skipping one causes real pain later.
3. Order by dependency, not just time. Each step should be possible only because the previous ones happened. If two steps could swap places with no consequence, ask whether one of them is filler.

WEB SEARCH
You have web_search. Use it only when the goal depends on facts that go stale: hours, prices, dates, weather, visa rules, deadlines, "this weekend", live availability. Bake findings directly into steps (the actual form name, the actual deadline). Skip search for timeless tasks (packing, cooking, learning, setup). Never write a step that says "look up" or "research" — you do the looking; the person does the doing.

STRUCTURE
- Match size to the goal: a tiny errand is 1 phase; a life event can be 4–5. Never pad a small goal or compress a big one to hit a shape.
- Tiny goal: 1–2 phases, 2–4 steps each.
- Real project: 3–5 phases, 3–5 steps each.
- A phase = one stretch of momentum. Steps inside it should feel like one sitting, one mode: all the phone calls together, all the errands together, all the desk work together. Don't make someone bounce between the kitchen and their laptop.
- Phase names are short labels ("Book it", "Week before", "Day of").

STEP QUALITY
- Verb first, object named: which document, which office, which person.
- One action, one visible result. If you can't picture checking it off, rewrite it.
- Merge anything under ~2 minutes into a neighbor.
- Cut ceremony: no "open laptop", "make a list", "think about", "consider".
- If they named a tool, use that tool's real workflow.
- Under ~60 characters per step. No URLs.

EXAMPLES OF THE STANDARD — note they range from 1 phase to 4. Pick the size the goal deserves.

Input: "return amazon package"
{"title":"Package returned","items":[{"text":"Do it today","subtasks":["Start the return in the app, pick UPS","Screenshot the QR code","Drop it at the UPS Store before 6pm"]}]}

Input: "host dinner party"
{"title":"Dinner party for six","items":[{"text":"This week","subtasks":["Text guests a date, confirm headcount","Pick a menu you've cooked before","Ask about allergies in the group chat"]},{"text":"Day before","subtasks":["Buy all groceries in one run","Prep anything that keeps overnight","Clean the bathroom and dining area"]},{"text":"Day of","subtasks":["Cook the main, start 3 hours ahead","Set the table before guests arrive","Chill drinks, queue a playlist"]}]}

Input: "move apartments"
{"title":"Moved in, keys returned","items":[{"text":"6 weeks out","subtasks":["Give written notice to your landlord","Book movers for a weekday morning","Start a box of things you never use"]},{"text":"2 weeks out","subtasks":["File USPS mail forwarding","Transfer internet and utilities","Pack all but daily-use items"]},{"text":"Moving day","subtasks":["Photograph the empty old place","Direct movers, check every closet","Hand back keys, get it in writing"]},{"text":"First week","subtasks":["Unpack kitchen and bed first","Update address on bank and DMV"]}]}

Notice what makes these work: size matches the goal, each phase is one block of time, steps unlock each other (confirm headcount before buying groceries), and every line is something you physically do.

OUTPUT
Final message is ONLY the JSON, no markdown, no commentary:
{"title":"short outcome title","items":[{"text":"Phase name","subtasks":["Step 1","Step 2"]}]}`

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

function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) return String((part as {text: unknown}).text ?? '')
        return ''
      })
      .join('')
  }
  return ''
}

function needsWebSearch(goal: string): boolean {
  return (
    /\b(this weekend|today|tonight|tomorrow|this week|hours|price|prices|weather|visa|deadline|deadlines|availability|open now|current|latest)\b/i.test(
      goal,
    ) || /\b20(2[5-9]|3\d)\b/.test(goal)
  )
}

function json(status: number, body: unknown) {
  return Response.json(body, {status})
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
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

  const today = new Date().toISOString().slice(0, 10)
  const search = needsWebSearch(goal)
  const payload: Record<string, unknown> = {
    model: MODEL,
    messages: [
      {role: 'system', content: SYSTEM_PROMPT},
      {role: 'user', content: `${goal}\n\nToday is ${today}.`},
    ],
    temperature: 0.5,
  }
  if (search) {
    payload.tools = [
      {
        type: 'openrouter:web_search',
        parameters: {engine: 'native', max_uses: 1},
      },
    ]
  }

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
      body: JSON.stringify(payload),
    })
  } catch {
    return json(502, {error: 'upstream'})
  }

  if (!response.ok) return json(502, {error: 'upstream'})

  const data = (await response.json().catch(() => null)) as
    | {choices?: Array<{message?: {content?: unknown}}>}
    | null
  const content = messageText(data?.choices?.[0]?.message?.content)
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
