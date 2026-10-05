import type { EngineInterface, On, Timer, ToolCallResult } from 'claude-code'

import type { PrReview } from '../types'
import { detailsRows, drawChip, drawDetails } from './draw'
import { parseCount, parseView, prUrlsIn, protectionArgv, rulesArgv, viewArgv } from './github'

const LINKED = { plugin: 'pr-approvals', key: 'linked' } as const
const PRS = { plugin: 'pr-approvals', key: 'prs' } as const

const PANE = 'pr-approvals'

const REFRESH_MS = 5 * 60_000
/** How long a branch's required approvals are trusted before they are read again. */
const RULES_TTL_MS = 30 * 60_000
const GH_TIMEOUT_MS = 20_000
/** A command that opens a PR and prints its URL. */
const OPENS_PR = /\bgh\s+pr\s+create\b/

let pending: Timer | null = null
let isRefreshing = false
let isRefreshAgain = false
const requiredByBranch = new Map<string, { required: number | null; at: number }>()

/** The PR URLs a finished tool call linked to the session: a PR it opened or one it bound. */
const linkedBy = (e: { tool: string; [input: string]: unknown }, ran: ToolCallResult): string[] => {
  if (ran.deny !== undefined || ran.isError === true) return []
  if (e.tool === 'Bash' && typeof e.command === 'string' && OPENS_PR.test(e.command)) return prUrlsIn(ran.text ?? '')
  if (e.tool.startsWith('mcp__') && e.tool.endsWith('__bind_pr') && typeof e.url === 'string') return prUrlsIn(e.url)

  return []
}

/**
 * Reads the review status of the current branch's PR and of every linked
 * one, and stores it. Every `$.process` call is written here, in one
 * function, so what the mod runs is all in one place: read-only `gh`
 * commands (listed in the README).
 */
async function refresh($: EngineInterface) {
  if (isRefreshing) {
    isRefreshAgain = true
    return
  }
  isRefreshing = true
  try {
    const cwd = await $.session.cwd()
    const gh = async (argv: string[]) => {
      try {
        return await $.process.run(argv, { cwd, timeoutMs: GH_TIMEOUT_MS })
      } catch {
        return { exitCode: 1, stdout: '' }
      }
    }

    const ofBranch = await gh(viewArgv())
    const branchView = ofBranch.exitCode === 0 ? parseView(ofBranch.stdout) : null
    const linked = (await $.state.get(LINKED)).value ?? []
    const others = await Promise.all(
      linked.filter(url => url !== branchView?.url).map(async url => {
        const run = await gh(viewArgv(url))

        return run.exitCode === 0 ? parseView(run.stdout) : null
      }),
    )

    const now = await $.clock.now()
    const prs: PrReview[] = []
    for (const view of [branchView, ...others]) {
      if (view === null) continue
      const branch = `${view.repo}:${view.base}`
      let cached = requiredByBranch.get(branch)
      if (cached === undefined || now - cached.at > RULES_TTL_MS) {
        const [rules, protection] = await Promise.all([gh(rulesArgv(view.repo, view.base)), gh(protectionArgv(view.repo, view.base))])
        const counts = [parseCount(rules), parseCount(protection)].filter(count => count !== null)
        cached = { required: counts.length === 0 ? null : Math.max(...counts), at: now }
        requiredByBranch.set(branch, cached)
      }
      const { base, ...review } = view
      prs.push({ ...review, required: cached.required })
    }

    const held = await $.state.get(PRS)
    if (JSON.stringify(prs) !== JSON.stringify(held.value ?? [])) {
      await $.state.set(PRS, prs)
    }
  } finally {
    isRefreshing = false
  }
  if (isRefreshAgain) {
    isRefreshAgain = false
    await refresh($)
  }
}

function scheduleRefresh($: EngineInterface, ms: number) {
  pending?.cancel()
  pending = $.clock.after(ms, () => void refresh($))
}

/** Adds PR URLs to the linked list, once each; true when any was new. */
async function link($: EngineInterface, urls: string[]) {
  const held = await $.state.get(LINKED)
  const linked = held.value ?? []
  const added = urls.filter(url => !linked.includes(url))
  if (added.length === 0) return false
  await $.state.set(LINKED, [...linked, ...added], { ifVersion: held.version })

  return true
}

/** Drops linked PRs by URL or by `#number`; the number of PRs dropped. */
async function unlink($: EngineInterface, target: string) {
  const held = await $.state.get(LINKED)
  const linked = held.value ?? []
  const urls = prUrlsIn(target)
  const number = /^#?(\d+)$/.exec(target)?.[1]
  const kept = linked.filter(url => !urls.includes(url) && !(number !== undefined && url.endsWith(`/pull/${number}`)))
  if (kept.length !== linked.length) await $.state.set(LINKED, kept, { ifVersion: held.version })

  return linked.length - kept.length
}

/** Opens the details pane as a dialog: it takes the keys, and Escape closes it. */
async function openDetails($: EngineInterface) {
  const prs = (await $.state.get(PRS)).value ?? []
  await $.ui.open({ id: PANE, title: 'Pull requests', focus: true, closeOnEscape: true, rows: detailsRows(prs) })
}

/** Opens the details pane, or closes it when it is up. */
async function toggleDetails($: EngineInterface) {
  if ((await $.ui.panes()).some(pane => pane.id === PANE)) await $.ui.close({ id: PANE })
  else await openDetails($)
}

const USAGE = 'Usage: /pr-approvals [add <PR URL> | remove <PR URL or #number> | clear]'

export function register(on: On) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pr-approvals',
      description: 'Show the review status of this session\'s PRs, or add, remove or clear the PRs it tracks',
      argumentHint: '[add <url> | remove <url|#n> | clear]',
    })
    scheduleRefresh($, 0)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'pr-approvals' }, async ($, e, next) => {
    const [verb = '', ...rest] = (e.args ?? '').trim().split(/\s+/)
    const target = rest.join(' ')
    if (verb === 'add') {
      const urls = prUrlsIn(target)
      if (urls.length === 0) return { text: `no GitHub PR URL in "${target}". ${USAGE}` }
      await link($, urls)
    } else if (verb === 'remove') {
      if ((await unlink($, target)) === 0) return { text: `no linked PR matches "${target}".` }
    } else if (verb === 'clear') {
      const held = await $.state.get(LINKED)
      await $.state.set(LINKED, [], { ifVersion: held.version })
    } else if (verb !== '') {
      return { text: USAGE }
    }
    await refresh($)
    if (((await $.state.get(PRS)).value ?? []).length === 0) {
      return { text: 'no PR for this branch and none linked. Add one with /pr-approvals add <PR URL>.' }
    }
    if (verb === '') await toggleDetails($)

    return {}
  })

  on('turn.complete', ($, e, next) => {
    scheduleRefresh($, 0)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const urls = linkedBy(e, ran)
    if (urls.length > 0 && (await link($, urls))) scheduleRefresh($, 0)
    // A push or a PR command run here may have changed what the branch's PR is.
    else if (e.tool === 'Bash' && typeof e.command === 'string' && /\b(gh\s+pr|git\s+(push|checkout|switch))\b/.test(e.command)) {
      scheduleRefresh($, 1500)
    }

    return ran
  })

  // The chip, after the mode labels at the right of the prompt footer.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const prs = (await $.state.get(PRS)).value ?? []
    if (prs.length === 0) return next(e)
    const { Box, Button, Link, Text } = $.ui.resolve(e)

    return drawChip({ Box, Button, Link, Text }, prs, e.props.modes, { open: () => void toggleDetails($) })
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const prs = (await $.state.get(PRS)).value ?? []
    const { Box, Button, Link, Text } = $.ui.resolve(e)

    return drawDetails({ Box, Button, Link, Text }, prs, {
      refresh: () => void refresh($),
      close: () => void $.ui.close({ id: PANE }),
    })
  })
}
