// The TUI never talks to OpenRouter and never sees the API key.
// Generation goes through a Vercel function that holds the key.

const GENERATE_URL =
  process.env.CHECKLIST_API_URL ?? 'https://checklist-tui.vercel.app/api/generate'

export type AiChecklist = {title: string; items: Array<{text: string; subtasks: string[]}>}

export type GenErrorCode = 'NETWORK' | 'SERVICE' | 'BAD_RESPONSE' | 'RATE_LIMITED'

export class GenerationError extends Error {
  code: GenErrorCode
  detail?: string
  constructor(code: GenErrorCode, message: string, detail?: string) {
    super(message)
    this.code = code
    this.detail = detail
    this.name = 'GenerationError'
  }
}

/** Turn a one-line goal into a structured checklist. Throws GenerationError. */
export async function generateChecklist(goal: string, signal?: AbortSignal): Promise<AiChecklist> {
  let response: Response
  try {
    response = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({goal}),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new GenerationError('NETWORK', 'Could not reach the service', 'network request failed')
  }

  if (response.status === 429) {
    throw new GenerationError('RATE_LIMITED', 'Too many requests', 'rate limited')
  }

  if (!response.ok) {
    throw new GenerationError('SERVICE', 'Service returned an error', `HTTP ${response.status}`)
  }

  const data = (await response.json().catch(() => null)) as AiChecklist | null
  if (!data || typeof data.title !== 'string' || !Array.isArray(data.items)) {
    throw new GenerationError('BAD_RESPONSE', 'Unexpected shape', 'missing title/items')
  }
  return data
}
