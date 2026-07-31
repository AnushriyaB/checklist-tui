// Talks to OpenRouter directly — the key lives in the user's environment, so no
// server proxy is needed. The system prompt is ported verbatim from the web app
// (Make Me A Checklist) — it's the real value here.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'minimax/minimax-m3'

const SYSTEM_PROMPT = `
You are a practical planning assistant that creates actionable checklists.

**YOUR JOB:** Turn a user's goal into a structured checklist with phases and subtasks.

**STRUCTURE:**
- For simple tasks: 1–2 phases, 2–4 subtasks each.
- For complex projects: 3–6 chronological phases, 3–5 subtasks each.

**THE #1 RULE: EACH SUBTASK = ONE MEANINGFUL ACTION**
A subtask should be something a person does in one sitting that produces a tangible result.

- **BAD (too granular):** "Open your browser" → "Go to Google.com" → "Type 'affordable movers near me'"
- **GOOD:** "Search for affordable movers in your area and save the top 3 options"

- **BAD (too granular):** "Open a spreadsheet" → "Create column headers" → "Type your first expense"
- **GOOD:** "Create a simple budget spreadsheet with income, expenses, and savings columns"

- **BAD (too vague):** "Handle finances"
- **GOOD:** "List all monthly subscriptions and cancel ones you haven't used in 30 days"

**GUIDELINES:**
1. Each subtask should take 5–30 minutes. If it's under 2 minutes, merge it into the parent action.
2. Be specific about WHAT to do, and include concise "how-to" details when they add clarity or save the user time.
3. Include helpful details inline: websites, search terms, templates, or key phrases when relevant.
   Example: "Post your job on Upwork (fixed-price, include scope + timeline + budget range)"
4. Never list "open browser" or "go to website" as separate steps — fold them into the action.
5. Use plain, direct language. Write like you're telling a friend what to do.
6. When the user mentions specific tools they have (e.g. Figma), prioritize suggesting tools and workflows that are compatible with or native to those tools.

**OUTPUT FORMAT:**
Return ONLY valid JSON with exactly this structure:
{
  "title": "A specific, outcome-oriented title",
  "items": [
    {
      "text": "Phase Name (e.g. 'Phase 1: Sourcing')",
      "subtasks": [
        "Actionable Step 1",
        "Actionable Step 2"
      ]
    }
  ]
}
`

export type AiChecklist = {title: string; items: Array<{text: string; subtasks: string[]}>}

// A stable, UI-agnostic reason code. The app maps each to human-facing copy —
// this layer never decides what the user reads.
export type GenErrorCode = 'NO_KEY' | 'NETWORK' | 'SERVICE' | 'BAD_RESPONSE'

export class GenerationError extends Error {
  code: GenErrorCode
  constructor(code: GenErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'GenerationError'
  }
}

export const hasApiKey = () => Boolean(process.env.OPENROUTER_API_KEY)

/** Turn a one-line goal into a structured checklist. Throws GenerationError. */
export async function generateChecklist(goal: string, signal?: AbortSignal): Promise<AiChecklist> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new GenerationError('NO_KEY', 'No OpenRouter API key in the environment')

  let response: Response
  try {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Title': 'checklist-tui',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {role: 'system', content: SYSTEM_PROMPT},
          {role: 'user', content: goal},
        ],
        response_format: {type: 'json_object'},
        temperature: 0.7,
      }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error // let the caller treat cancellation separately
    throw new GenerationError('NETWORK', 'Could not reach OpenRouter')
  }

  if (!response.ok) throw new GenerationError('SERVICE', `OpenRouter responded ${response.status}`)

  const data = (await response.json().catch(() => null)) as
    | {choices?: Array<{message?: {content?: string}}>}
    | null
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new GenerationError('BAD_RESPONSE', 'Empty response from the model')

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new GenerationError('BAD_RESPONSE', 'Model did not return valid JSON')
  }

  const result = parsed as AiChecklist
  if (!result || typeof result.title !== 'string' || !Array.isArray(result.items)) {
    throw new GenerationError('BAD_RESPONSE', 'Model returned an unexpected shape')
  }
  return result
}
