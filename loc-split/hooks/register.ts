import type { EngineInterface, On, Timer } from 'claude-code'

import type { LocCommit, LocReport, LocSplit } from '../types'
import { drawBand } from './band'
import { ATTRIBUTE_PROBE, BASES, CHECK_ATTRIBUTES, gitArgv, measureCommands } from './commands'
import {
  addSplits,
  emptySplit,
  markedGenerated,
  tallyLog,
  tallyNewFile,
  tallyNumstat,
  tallyNumstatLog,
  tallyPatch,
} from './split'

const REPORT = { plugin: 'loc-split', key: 'report' } as const
const IS_EXPANDED = { plugin: 'loc-split', key: 'isExpanded' } as const
/** The first commit the expanded list shows; 0 is the newest. */
const SCROLL = { plugin: 'loc-split', key: 'scroll' } as const

const UNTRACKED_LIMIT = 500
const REFRESH_MS = 20_000
const MUTATING_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit', 'Bash'])

const GIT_TIMEOUT_MS = 20_000

type GitRun = { exitCode: number; stdout: string; isStdoutTruncated: boolean }

/** The report, from the git runs `refresh` made; no `$` here. */
const assemble = (
  base: string,
  mergeBase: string,
  runs: Record<'listed' | 'patched' | 'generated' | 'counted' | 'dirty' | 'dirtyGenerated' | 'net' | 'netGenerated', GitRun>,
  untracked: LocSplit,
  isUntrackedCut: boolean,
): LocReport => {
  const patchedBySha = new Map(tallyLog(runs.patched.stdout).map(one => [one.sha, one.split]))
  const generatedBySha = tallyNumstatLog(runs.generated.stdout)
  const commits: LocCommit[] = runs.listed.stdout
    .split('\n')
    .filter(line => line !== '')
    .map(line => {
      const [sha = '', subject = ''] = line.split('\x1f')
      const split = addSplits(patchedBySha.get(sha) ?? emptySplit(), generatedBySha.get(sha) ?? emptySplit())

      return { sha: sha.slice(0, 7), subject, split }
    })

  return {
    base,
    mergeBase,
    commits,
    commitCount: Number(runs.counted.stdout.trim()) || commits.length,
    uncommitted: addSplits(tallyNumstat(runs.dirtyGenerated.stdout, tallyPatch(runs.dirty.stdout)), untracked),
    net: addSplits(tallyNumstat(runs.netGenerated.stdout, tallyPatch(runs.net.stdout)), untracked),
    isPartial: isUntrackedCut || [runs.patched, runs.generated, runs.dirty, runs.net].some(run => run.isStdoutTruncated),
  }
}

let pending: Timer | null = null
let isRefreshing = false
/** Whether this git takes `.gitattributes` pathspecs; asked once per load. */
let canFilterByAttribute: boolean | null = null

/**
 * Measures the branch against main and stores the report. Every `$` call is
 * written here, in one function, so what the mod runs and reads is all in
 * one place: read-only git commands (listed in the README) and the text of
 * untracked files.
 */
async function refresh($: EngineInterface) {
  if (isRefreshing) return
  isRefreshing = true
  try {
    let measured: LocReport | null = null
    measure: {
      const cwd = await $.session.cwd()
      const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd, timeoutMs: GIT_TIMEOUT_MS })
      if (top.exitCode !== 0) break measure
      const root = top.stdout.trim()
      const options = { cwd: root, timeoutMs: GIT_TIMEOUT_MS }

      const head = await $.process.run(['git', 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], options)
      let base: string | null = null
      for (const ref of head.exitCode === 0 ? [...BASES, head.stdout.trim()] : BASES) {
        const found = await $.process.run(['git', 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`], options)
        if (found.exitCode === 0) {
          base = ref
          break
        }
      }
      if (base === null) break measure
      const found = await $.process.run(['git', 'merge-base', 'HEAD', base], options)
      if (found.exitCode !== 0) break measure
      const mergeBase = found.stdout.trim()

      if (canFilterByAttribute === null) {
        const probe = await $.process.run(gitArgv(ATTRIBUTE_PROBE), options)
        canFilterByAttribute = probe.exitCode === 0 || probe.exitCode === 1
      }
      const commands = measureCommands(mergeBase, canFilterByAttribute)
      const [listed, patched, generated, counted, dirty, dirtyGenerated, net, netGenerated, others] = await Promise.all([
        $.process.run(gitArgv(commands.listed), options),
        $.process.run(gitArgv(commands.patched), options),
        $.process.run(gitArgv(commands.generated), options),
        $.process.run(gitArgv(commands.counted), options),
        $.process.run(gitArgv(commands.dirty), options),
        $.process.run(gitArgv(commands.dirtyGenerated), options),
        $.process.run(gitArgv(commands.net), options),
        $.process.run(gitArgv(commands.netGenerated), options),
        $.process.run(gitArgv(commands.others), options),
      ])

      const paths = others.stdout.split('\0').filter(path => path !== '')
      const readable = paths.slice(0, UNTRACKED_LIMIT)
      const attributes =
        readable.length === 0
          ? null
          : await $.process.run(gitArgv(CHECK_ATTRIBUTES), { ...options, stdin: `${readable.join('\0')}\0` })
      const marked = markedGenerated(attributes?.exitCode === 0 ? attributes.stdout : '')
      const untracked = emptySplit()
      for (const path of readable) {
        let text = ''
        try {
          text = await $.fs.read(`${root}/${path}`)
        } catch {
          text = ''
        }
        tallyNewFile(path, text, untracked, marked.has(path))
      }

      measured = assemble(
        base,
        mergeBase,
        { listed, patched, generated, counted, dirty, dirtyGenerated, net, netGenerated },
        untracked,
        paths.length > UNTRACKED_LIMIT,
      )
    }

    const held = await $.state.get(REPORT)
    if (JSON.stringify(measured) !== JSON.stringify(held.value ?? null)) {
      await $.state.set(REPORT, measured)
    }
  } finally {
    isRefreshing = false
  }
}

/** Opens or closes the per-commit table. */
async function toggleExpanded($: EngineInterface) {
  const held = await $.state.get(IS_EXPANDED)
  await $.state.set(IS_EXPANDED, !(held.value ?? false), { ifVersion: held.version })
}

/** Moves the commit list's window by `by` rows, kept within `[0, lastOffset]`. */
async function scrollBy($: EngineInterface, by: number, lastOffset: number) {
  const held = await $.state.get(SCROLL)
  const at = Math.min(held.value ?? 0, lastOffset)
  await $.state.set(SCROLL, Math.max(0, Math.min(lastOffset, at + by)), { ifVersion: held.version })
}

export function register(on: On) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'loc-split',
      description: 'Open or close the per-commit breakdown of lines changed against main',
    })
    pending?.cancel()
    pending = $.clock.after(0, () => void refresh($))
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'loc-split' }, async ($, e, next) => {
    await refresh($)
    if (((await $.state.get(REPORT)).value ?? null) === null) {
      return { text: 'loc-split: not in a git repository with a main or master branch.' }
    }
    await toggleExpanded($)

    return {}
  })

  on('turn.complete', ($, e, next) => {
    pending?.cancel()
    pending = $.clock.after(0, () => void refresh($))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (MUTATING_TOOLS.has(e.tool)) {
      pending?.cancel()
      pending = $.clock.after(1500, () => void refresh($))
    }

    return ran
  })

  // The band above the prompt: the summary row, and above it, when expanded,
  // the per-commit table, so it opens upward like an accordion. The commit
  // list scrolls on its own under a fixed title, header and net row.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const r = (await $.state.get(REPORT)).value ?? null
    if (r === null) return next(e)
    const isOpen = (await $.state.get(IS_EXPANDED)).value ?? false
    const offset = (await $.state.get(SCROLL)).value ?? 0
    const { Box, Button, Text } = $.ui.resolve(e)

    return drawBand(
      { Box, Button, Text },
      r,
      { isOpen, offset, surface: e.surface, bodyColumns: e.props.bodyColumns, maxRows: e.props.maxRows },
      {
        toggle: () => void toggleExpanded($),
        scrollBy: (by, lastOffset) => void scrollBy($, by, lastOffset),
      },
    )
  })
}
