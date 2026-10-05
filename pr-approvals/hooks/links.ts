import { prUrlsIn } from './github'

/**
 * Which tool calls link a PR to the session, live or replayed from the
 * session's transcript. Pure: no `$` here; `register.ts` runs the greps.
 */

/** A command that opens a PR and prints its URL. */
const OPENS_PR = /\bgh\s+pr\s+create\b/

/**
 * How a tool call links PRs: `create` (`gh pr create`, the URLs in its
 * output), `bind` (the desktop app's `bind_pr`, the URL it was given) or
 * `status` (the app's `get_status` for this session, the PR it reports).
 */
export type LinkKind = 'create' | 'bind' | 'status'

export const linkKindOf = (tool: string, input: Record<string, unknown>): LinkKind | null => {
  if (tool === 'Bash' && typeof input.command === 'string' && OPENS_PR.test(input.command)) return 'create'
  if (tool.startsWith('mcp__') && tool.endsWith('__bind_pr') && typeof input.url === 'string') return 'bind'
  if (tool.startsWith('mcp__') && tool.endsWith('__get_status') && (input.session_id ?? 'self') === 'self') return 'status'

  return null
}

/** The PR URLs one linking call names: from its input for `bind`, from its output otherwise. */
export const urlsOf = (kind: LinkKind, input: Record<string, unknown>, output: string): string[] =>
  kind === 'bind' ? prUrlsIn(String(input.url)) : prUrlsIn(output)

/** The transcript lines that may hold a linking call: a superset, parsed after. */
export const usesArgv = (transcript: string) => ['grep', '-E', 'gh pr create|__bind_pr|__get_status', transcript]

/** The transcript lines that mention any of the tool-use ids: their results among them. */
export const resultsArgv = (transcript: string, ids: string[]) => ['grep', '-F', ...ids.flatMap(id => ['-e', id]), transcript]

type Block = { type?: unknown; id?: unknown; name?: unknown; input?: unknown; tool_use_id?: unknown; content?: unknown }

const blocksIn = (stdout: string): Block[] =>
  stdout.split('\n').flatMap(line => {
    try {
      const content = (JSON.parse(line) as { message?: { content?: unknown } }).message?.content

      return Array.isArray(content) ? (content.filter(block => block !== null && typeof block === 'object') as Block[]) : []
    } catch {
      return []
    }
  })

export type TranscriptUse = { id: string; kind: LinkKind; input: Record<string, unknown> }

/** The linking tool calls among what `usesArgv` printed, in transcript order. */
export const usesIn = (stdout: string): TranscriptUse[] =>
  blocksIn(stdout).flatMap(block => {
    if (block.type !== 'tool_use' || typeof block.id !== 'string' || typeof block.name !== 'string') return []
    const input = block.input !== null && typeof block.input === 'object' ? (block.input as Record<string, unknown>) : {}
    const kind = linkKindOf(block.name, input)

    return kind === null ? [] : [{ id: block.id, kind, input }]
  })

/** The PR URLs the linking calls name, given what `resultsArgv` printed for their ids; in transcript order, once each. */
export const linkedIn = (uses: TranscriptUse[], resultsStdout: string): string[] => {
  const outputs = new Map<string, string>()
  for (const block of blocksIn(resultsStdout)) {
    if (block.type === 'tool_result' && typeof block.tool_use_id === 'string' && !('is_error' in block && block.is_error === true)) {
      outputs.set(block.tool_use_id, typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? ''))
    }
  }
  const urls = uses.flatMap(use => (use.kind === 'bind' || outputs.has(use.id) ? urlsOf(use.kind, use.input, outputs.get(use.id) ?? '') : []))

  return [...new Set(urls)]
}
