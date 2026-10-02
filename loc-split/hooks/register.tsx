import type { EngineInterface, Register, RenderChildren, Timer } from 'claude-code'

import type { LocCommit, LocCount, LocReport, LocSplit } from '../types'
import { BASES, gitArgv, measureCommands } from './commands'
import {
  CATEGORIES,
  addSplits,
  emptySplit,
  isEmptySplit,
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

const GAP = 2

type Category = (typeof CATEGORIES)[number]

const LABELS: Record<Category, { full: string; short: string }> = {
  code: { full: 'code', short: 'code' },
  comments: { full: 'comments', short: 'cmt' },
  tests: { full: 'tests', short: 'test' },
  docs: { full: 'docs', short: 'doc' },
  gen: { full: 'gen', short: 'gen' },
}

/** Columns the band keeps clear of its own collapse mark. */
const BAND_CHROME = 4
/** At most this many commits show at once; the list scrolls under a fixed title and totals. */
const LIST_ROWS = 8
/** Rows around the list: title, header, the gap above net (the scroll bar's down arrow when it scrolls), net, the gap below and the summary. */
const FIXED_ROWS = 6
/** The short sha's own column, a cell wider than the sha, so subjects line up in any font. */
const SHA_CELLS = 9
/** The scroll bar's column: a gap, then the arrow or the track. */
const SCROLLBAR_CELLS = 3
/** The band's padding on both sides, the table and the summary row alike. */
const PADDING = 1
/** The padding the desktop draws inside a native button, pulled back so its label lines up with the table. */
const BUTTON_INSET = 1

/** The row's forms, widest first; the first that fits the band is drawn. */
const FITS = [
  { isWordy: true, isShort: false, hasRemoved: true },
  { isWordy: false, isShort: false, hasRemoved: true },
  { isWordy: false, isShort: true, hasRemoved: true },
  { isWordy: false, isShort: true, hasRemoved: false },
] as const

type Fit = (typeof FITS)[number]

/** Runs one read-only git command (see `measureCommands` and the README for the full list). */
function git($: EngineInterface, cwd: string, args: readonly string[]) {
  return $.process.run(gitArgv(args), { cwd, timeoutMs: 20_000 })
}

async function findBase($: EngineInterface, root: string): Promise<string | null> {
  const head = await git($, root, ['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'])
  const candidates = head.exitCode === 0 ? [...BASES, head.stdout.trim()] : BASES
  for (const ref of candidates) {
    const found = await git($, root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
    if (found.exitCode === 0) return ref
  }

  return null
}

async function tallyUntracked($: EngineInterface, root: string, listing: string) {
  const split = emptySplit()
  const paths = listing.split('\0').filter(path => path !== '')
  const texts = await Promise.all(
    paths.slice(0, UNTRACKED_LIMIT).map(path => $.fs.read(`${root}/${path}`).catch(() => '')),
  )
  texts.forEach((text, i) => tallyNewFile(paths[i] ?? '', text, split))

  return { split, isPartial: paths.length > UNTRACKED_LIMIT }
}

async function measure($: EngineInterface): Promise<LocReport | null> {
  const top = await git($, await $.session.cwd(), ['rev-parse', '--show-toplevel'])
  if (top.exitCode !== 0) return null
  const root = top.stdout.trim()
  const base = await findBase($, root)
  if (base === null) return null
  const found = await git($, root, ['merge-base', 'HEAD', base])
  if (found.exitCode !== 0) return null
  const mergeBase = found.stdout.trim()

  const commands = measureCommands(mergeBase)
  const [listed, patched, generated, counted, dirty, dirtyGenerated, net, netGenerated, others] = await Promise.all([
    git($, root, commands.listed),
    git($, root, commands.patched),
    git($, root, commands.generated),
    git($, root, commands.counted),
    git($, root, commands.dirty),
    git($, root, commands.dirtyGenerated),
    git($, root, commands.net),
    git($, root, commands.netGenerated),
    git($, root, commands.others),
  ])
  const untracked = await tallyUntracked($, root, others.stdout)

  const patchedBySha = new Map(tallyLog(patched.stdout).map(one => [one.sha, one.split]))
  const generatedBySha = tallyNumstatLog(generated.stdout)
  const commits: LocCommit[] = listed.stdout
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
    commitCount: Number(counted.stdout.trim()) || commits.length,
    uncommitted: addSplits(tallyNumstat(dirtyGenerated.stdout, tallyPatch(dirty.stdout)), untracked.split),
    net: addSplits(tallyNumstat(netGenerated.stdout, tallyPatch(net.stdout)), untracked.split),
    isPartial: untracked.isPartial || [patched, generated, dirty, net].some(run => run.isStdoutTruncated),
  }
}

let pending: Timer | null = null
let isRefreshing = false

async function refresh($: EngineInterface) {
  if (isRefreshing) return
  isRefreshing = true
  try {
    const measured = await measure($)
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

function refreshSoon($: EngineInterface, ms: number) {
  pending?.cancel()
  pending = $.clock.after(ms, () => void refresh($))
}

const isZero = (count: LocCount) => count.added === 0 && count.removed === 0

const countText = (count: LocCount): string =>
  isZero(count)
    ? '·'
    : [count.added > 0 ? `+${count.added}` : '', count.removed > 0 ? `−${count.removed}` : '']
        .filter(part => part !== '')
        .join(' ')

const truncate = (text: string, width: number): string =>
  text.length <= width ? text : `${text.slice(0, Math.max(0, width - 1))}…`

const shortRef = (ref: string) => ref.replace(/^origin\//, '')

/** The categories with any line changed; the rest stay off the row and the card. */
const changed = (split: LocSplit): Category[] => CATEGORIES.filter(category => !isZero(split[category]))

const titleOf = (r: LocReport) =>
  `vs ${shortRef(r.base)} · ${r.commitCount} commit${r.commitCount === 1 ? '' : 's'} since ${r.mergeBase.slice(0, 7)}`

/** The table's columns (the categories with changes), their names and widths, and the label column's width. */
const layout = (r: LocReport, maxWidth: number) => {
  const net = changed(r.net)
  const columns: Category[] = net.length > 0 ? net : ['code']
  const splits = [r.net, r.uncommitted, ...r.commits.map(one => one.split)]
  const sized = (form: 'full' | 'short') => {
    const names = columns.map(column => LABELS[column][form])
    const widths = columns.map((column, i) =>
      Math.max(names[i]?.length ?? 0, ...splits.map(split => countText(split[column]).length)),
    )

    return { names, widths, cells: widths.reduce((sum, width) => sum + GAP + width, 0) }
  }
  const full = sized('full')
  const { names, widths, cells } = full.cells + 24 <= maxWidth ? full : sized('short')
  const longest = Math.max(...r.commits.map(one => one.sha.length + 1 + one.subject.length), 'Σ net vs main'.length)
  const label = Math.max(12, Math.min(longest, 52, maxWidth - cells))

  return { columns, names, widths, label }
}

const countFor = (count: LocCount, fit: Fit): LocCount =>
  fit.hasRemoved || count.added === 0 ? count : { added: count.added, removed: 0 }

const toggleLabel = (r: LocReport, fit: Fit, isOpen: boolean) =>
  `${fit.isWordy ? 'commits ' : ''}↑${r.commitCount} ${isOpen ? '▾' : '▴'}`

const rowWidth = (r: LocReport, fit: Fit): number => {
  const shown = changed(r.net)
  const left = toggleLabel(r, fit, false).length + (isEmptySplit(r.uncommitted) ? 0 : 2)
  const right = shown.reduce(
    (sum, category, i) =>
      sum + (i > 0 ? 3 : 0) + LABELS[category][fit.isShort ? 'short' : 'full'].length + 1 + countText(countFor(r.net[category], fit)).length,
    0,
  )

  return left + 2 + Math.max(right, 'no changes'.length)
}

const fitFor = (r: LocReport, columns: number): Fit =>
  FITS.find(fit => rowWidth(r, fit) <= columns - BAND_CHROME) ?? FITS[FITS.length - 1]!

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'loc-split',
      description: 'Open or close the per-commit breakdown of lines changed against main',
    })
    refreshSoon($, 0)
    $.clock.every(REFRESH_MS, () => void refresh($))

    return next(e)
  })

  on('command.run', { command: 'loc-split' }, async $ => {
    await refresh($)
    if (((await $.state.get(REPORT)).value ?? null) === null) {
      return { text: 'loc-split: not in a git repository with a main or master branch.' }
    }
    await toggleExpanded($)

    return {}
  })

  on('turn.complete', ($, e, next) => {
    refreshSoon($, 0)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (MUTATING_TOOLS.has(e.tool)) refreshSoon($, 1500)

    return ran
  })

  // The band above the prompt: the summary row, and above it, when expanded,
  // the per-commit table, so it opens upward like an accordion. The commit
  // list scrolls on its own under a fixed title, header and net row.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const r = (await $.state.get(REPORT)).value ?? null
    if (r === null) return next(e)
    const isOpen = (await $.state.get(IS_EXPANDED)).value ?? false
    const { Box, Button, Text } = $.ui.resolve(e)

    const counts = (count: LocCount) =>
      isZero(count)
        ? [<Text dimColor>·</Text>]
        : [
            count.added > 0 && <Text color="success">+{count.added}</Text>,
            count.added > 0 && count.removed > 0 && ' ',
            count.removed > 0 && <Text color="error">−{count.removed}</Text>,
          ]

    const shown = changed(r.net)
    const isDirty = !isEmptySplit(r.uncommitted)
    const fit = fitFor(r, e.props.bodyColumns - 2 * PADDING)
    const summary = (
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexShrink={0} marginLeft={e.surface === 'desktop' ? -BUTTON_INSET : 0}>
          <Button key="toggle" plain label={toggleLabel(r, fit, isOpen)} onPress={() => toggleExpanded($)} />
          {isDirty && <Text color="warning"> ✎</Text>}
        </Box>
        <Box flexShrink={1} marginLeft={2}>
          <Text wrap="truncate">
            {shown.length === 0 ? (
              <Text dimColor>no changes</Text>
            ) : (
              shown.map((category, i) => [
                i > 0 && <Text dimColor> · </Text>,
                <Text dimColor>{LABELS[category][fit.isShort ? 'short' : 'full']} </Text>,
                counts(countFor(r.net[category], fit)),
              ])
            )}
          </Text>
        </Box>
      </Box>
    )
    if (!isOpen) {
      return (
        <Box key="loc-split" flexDirection="column" paddingX={PADDING}>
          {summary}
        </Box>
      )
    }

    const { columns, names, widths, label } = layout(r, e.props.bodyColumns - BAND_CHROME - 2 * PADDING - SCROLLBAR_CELLS)
    // Each cell is a box of fixed width, so the columns line up in a
    // proportional font (the desktop) as well as in a terminal's grid.
    const cells = (split: LocSplit) =>
      columns.map((column, i) => (
        <Box width={(widths[i] ?? 0) + GAP} flexShrink={0} justifyContent="flex-end">
          <Text>{counts(split[column])}</Text>
        </Box>
      ))
    const tableRow = (head: RenderChildren, split: LocSplit, marginTop = 0, bar?: RenderChildren) => (
      <Box flexDirection="row" marginTop={marginTop}>
        <Box width={label} flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          {head}
        </Box>
        {cells(split)}
        {bar}
      </Box>
    )

    const older = r.commitCount - r.commits.length
    const fixed = FIXED_ROWS + (isDirty ? 1 : 0) + (older > 0 ? 1 : 0)
    const room = e.props.maxRows - fixed
    const listRows = Math.max(2, Math.min(LIST_ROWS, room))
    const canScroll = r.commits.length > listRows
    const lastOffset = Math.max(0, r.commits.length - listRows)
    const offset = Math.min((await $.state.get(SCROLL)).value ?? 0, lastOffset)
    const visible = r.commits.slice(offset, offset + listRows)
    const page = Math.max(1, listRows - 1)

    // A scroll bar beside the list: an arrow above and below a track of dots
    // whose bright run is as long, and sits as far down, as the window over
    // the commits. Dots, centered, read the same in a terminal's grid and in
    // the desktop's proportional font, where line glyphs never join up.
    const thumb = Math.max(1, Math.round((listRows * listRows) / Math.max(1, r.commits.length)))
    const thumbAt = lastOffset === 0 ? 0 : Math.round((offset / lastOffset) * (listRows - thumb))
    const barCell = (child: RenderChildren) => (
      <Box width={SCROLLBAR_CELLS} flexShrink={0} justifyContent="center">
        {child}
      </Box>
    )
    const track = (row: number) =>
      canScroll &&
      barCell(row >= thumbAt && row < thumbAt + thumb ? <Text>•</Text> : <Text dimColor>·</Text>)

    return (
      <Box key="loc-split" flexDirection="column" paddingX={PADDING}>
        <Box flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold wrap="truncate">
              {titleOf(r)}
            </Text>
            {canScroll && (
              <Box flexShrink={0} marginLeft={2}>
                <Text dimColor>
                  {offset + 1}–{offset + visible.length} of {r.commits.length}
                </Text>
              </Box>
            )}
          </Box>
          <Box flexDirection="row">
            <Box width={label} flexGrow={1} flexShrink={1} />
            {names.map((name, i) => (
              <Box width={(widths[i] ?? 0) + GAP} flexShrink={0} justifyContent="flex-end">
                <Text dimColor>{name}</Text>
              </Box>
            ))}
            {canScroll &&
              barCell(<Button key="up" plain dimColor={offset === 0} label="↑" onPress={() => scrollBy($, -page, lastOffset)} />)}
          </Box>
          {visible.map((one, row) =>
            tableRow(
              <Box flexDirection="row" minWidth={0} overflow="hidden">
                <Box width={SHA_CELLS} flexShrink={0}>
                  <Text dimColor>{one.sha}</Text>
                </Box>
                <Box flexShrink={1} minWidth={0} overflow="hidden" marginRight={1}>
                  <Text wrap="truncate-end">{one.subject}</Text>
                </Box>
              </Box>,
              one.split,
              0,
              track(row),
            ),
          )}
          {canScroll && (
            <Box flexDirection="row">
              <Box flexGrow={1} />
              {barCell(<Button key="down" plain dimColor={offset === lastOffset} label="↓" onPress={() => scrollBy($, page, lastOffset)} />)}
            </Box>
          )}
          {older > 0 && (
            <Text dimColor>
              … {older} older commit{older === 1 ? '' : 's'} not listed
            </Text>
          )}
          {isDirty && tableRow(<Text color="warning">✎ uncommitted</Text>, r.uncommitted)}
          {tableRow(<Text bold>Σ net vs {shortRef(r.base)}</Text>, r.net, canScroll ? 0 : 1)}
          {r.isPartial && <Text dimColor>partial: git output was cut</Text>}
        </Box>
        {summary}
      </Box>
    )
  })
}
