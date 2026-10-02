import type { ElementTable, RenderChildren } from 'claude-code'

import type { LocCount, LocReport, LocSplit } from '../types'
import { CATEGORIES, isEmptySplit } from './split'

/**
 * The band above the prompt: the summary row, and above it, when expanded,
 * the per-commit table, so it opens upward like an accordion. The commit
 * list scrolls on its own under a fixed title, header and net row.
 *
 * Pure drawing: no `$` here. `register.ts` reads the state, resolves the
 * surface's elements and hands over plain callbacks for the two controls.
 */

/** The element constructors the band draws with; the terminal and the desktop carry all three. */
export type BandUi = Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button'>

export type BandView = {
  isOpen: boolean
  /** The first commit the list shows, as stored; clamped here. */
  offset: number
  surface: 'terminal' | 'desktop'
  bodyColumns: number
  maxRows: number
}

export type BandActions = {
  toggle: () => void
  scrollBy: (by: number, lastOffset: number) => void
}

const GAP = 2

type Category = (typeof CATEGORIES)[number]

const LABELS: Record<Category, { full: string; short: string }> = {
  code: { full: 'code', short: 'code' },
  comments: { full: 'comments', short: 'cmt' },
  tests: { full: 'tests', short: 'test' },
  docs: { full: 'docs', short: 'doc' },
  gen: { full: 'gen', short: 'gen' },
}

/** Columns the terminal's band keeps clear for its own `[-]` collapse mark at the right edge; the desktop draws none. */
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

/** The row's forms, widest first; the first that fits the band is drawn. "commits" is the last word to go. */
const FITS = [
  { isWordy: true, isShort: false, hasRemoved: true },
  { isWordy: true, isShort: true, hasRemoved: true },
  { isWordy: true, isShort: true, hasRemoved: false },
  { isWordy: false, isShort: true, hasRemoved: false },
] as const

type Fit = (typeof FITS)[number]

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
  FITS.find(fit => rowWidth(r, fit) <= columns) ?? FITS[FITS.length - 1]!

export function drawBand(ui: BandUi, r: LocReport, view: BandView, actions: BandActions) {
  const { Box, Button, Text } = ui
  const { isOpen } = view

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
  // The terminal draws the band's collapse mark at its edge; the desktop does not.
  const chrome = view.surface === 'terminal' ? BAND_CHROME : 0
  const fit = fitFor(r, view.bodyColumns - chrome - 2 * PADDING)
  const summary = (
    <Box flexDirection="row" justifyContent="space-between">
      <Box flexShrink={0} marginLeft={view.surface === 'desktop' ? -BUTTON_INSET : 0}>
        <Button key="toggle" plain label={toggleLabel(r, fit, isOpen)} onPress={actions.toggle} />
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
      <Box key="loc-split" flexDirection="column" paddingLeft={PADDING} paddingRight={PADDING + chrome}>
        {summary}
      </Box>
    )
  }

  const { columns, names, widths, label } = layout(r, view.bodyColumns - chrome - 2 * PADDING - SCROLLBAR_CELLS)
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
  const room = view.maxRows - fixed
  const listRows = Math.max(2, Math.min(LIST_ROWS, room))
  const canScroll = r.commits.length > listRows
  const lastOffset = Math.max(0, r.commits.length - listRows)
  const offset = Math.min(view.offset, lastOffset)
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
    <Box key="loc-split" flexDirection="column" paddingLeft={PADDING} paddingRight={PADDING + chrome}>
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
            barCell(<Button key="up" plain dimColor={offset === 0} label="↑" onPress={() => actions.scrollBy(-page, lastOffset)} />)}
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
            {barCell(<Button key="down" plain dimColor={offset === lastOffset} label="↓" onPress={() => actions.scrollBy(page, lastOffset)} />)}
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
}
