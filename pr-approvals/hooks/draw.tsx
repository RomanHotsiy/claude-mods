import type { ElementTable } from 'claude-code'

import type { PrReview } from '../types'
import { type Verdict, verdictOf } from './github'

/**
 * The chip in the prompt footer and the details pane it opens. Pure drawing:
 * no `$` here; `register.ts` reads the state, resolves the surface's elements
 * and hands over plain callbacks.
 */

/** The element constructors both drawings use; the terminal and the desktop carry all four. */
export type DrawUi = Pick<ElementTable<'terminal' | 'desktop'>, 'Box' | 'Text' | 'Button' | 'Link'>

type Color = 'success' | 'error' | 'warning'

const LOOKS: Record<Verdict, { mark: string; word: string; color?: Color }> = {
  approved: { mark: '✓', word: 'approved', color: 'success' },
  changes: { mark: '✗', word: 'changes requested', color: 'error' },
  waiting: { mark: '', word: 'not approved', color: 'warning' },
  merged: { mark: '', word: 'merged' },
  closed: { mark: '', word: 'closed' },
}

const isOpen = (pr: PrReview) => pr.state === 'OPEN'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** What one PR still lacks, in words: `approved`, `needs 1 approval`, `changes requested`. */
const standing = (pr: PrReview): string => {
  const verdict = verdictOf(pr)
  if (verdict === 'waiting' && pr.required !== null && pr.required > pr.approvedBy.length) {
    return `needs ${plural(pr.required - pr.approvedBy.length, 'approval')}`
  }

  return LOOKS[verdict].word
}

/** The color of the dot before the chip: red if any open PR has changes requested, green if all are approved. */
const dotColor = (prs: PrReview[]): Color | undefined => {
  const verdicts = prs.filter(isOpen).map(verdictOf)
  if (verdicts.length === 0) return undefined
  if (verdicts.includes('changes')) return 'error'

  return verdicts.every(verdict => verdict === 'approved') ? 'success' : 'warning'
}

/**
 * The chip's text, a summary over every PR: one PR is named
 * (`#28707 approved · 2 pending`), several are counted
 * (`PRs 1/3 approved · 4 pending`). Merged and closed ones count only when
 * nothing is open.
 */
export const chipLabel = (prs: PrReview[]): string => {
  const open = prs.filter(isOpen)
  const pending = open.reduce((sum, pr) => sum + pr.waitingOn.length, 0)
  const tail = pending > 0 ? ` · ${pending} pending` : ''
  const lone = open.length === 1 ? open[0] : undefined
  if (lone !== undefined) return `#${lone.number}${lone.isDraft ? ' draft' : ''} ${standing(lone)}${tail}`
  if (open.length === 0) {
    const last = prs.length === 1 ? prs[0] : undefined

    return last !== undefined ? `#${last.number} ${LOOKS[verdictOf(last)].word}` : `PRs ${prs.length} done`
  }
  const approved = open.filter(pr => verdictOf(pr) === 'approved').length
  const changes = open.filter(pr => verdictOf(pr) === 'changes').length

  return `PRs ${approved}/${open.length} approved${changes > 0 ? ` · ${changes} changes` : ''}${tail}`
}

export type ChipActions = { open: () => void }

/** The footer: the engine's mode labels, as it draws them, then the chip. */
export function drawChip(ui: DrawUi, prs: PrReview[], modes: readonly string[], actions: ChipActions) {
  const { Box, Button, Text } = ui
  const color = dotColor(prs)

  return (
    <Box key="pr-approvals-footer" flexDirection="row">
      {modes.length > 0 && (
        <Box marginRight={2}>
          <Text dimColor>{modes.join(' & ')}</Text>
        </Box>
      )}
      <Box marginRight={1}>
        <Text color={color} dimColor={color === undefined}>
          ●
        </Text>
      </Box>
      <Button key="pr-chip" plain dimColor label={chipLabel(prs)} onPress={actions.open} />
    </Box>
  )
}

export type DetailsActions = { refresh: () => void; close: () => void }

/** The details pane: each PR's status line, title, and who approved, asked for changes or is still asked. */
export function drawDetails(ui: DrawUi, prs: PrReview[], actions: DetailsActions) {
  const { Box, Button, Link, Text } = ui
  const isMixed = new Set(prs.map(pr => pr.repo)).size > 1
  // Margins rather than spaces: a surface may trim a Text's edge spaces.
  const dot = () => (
    <Box marginX={1}>
      <Text dimColor>·</Text>
    </Box>
  )
  const people = (label: string, names: string[], color?: Color) =>
    names.length > 0 && (
      <Text wrap="truncate-end">
        <Text color={color} dimColor={color === undefined}>
          {label}:{' '}
        </Text>
        {names.join(', ')}
      </Text>
    )

  return (
    <Box key="pr-approvals" flexDirection="column">
      {prs.length === 0 && <Text dimColor>No PR for this branch and none linked. Add one with /pr-approvals add &lt;PR URL&gt;.</Text>}
      {prs.map((pr, i) => {
        const verdict = verdictOf(pr)
        const look = LOOKS[verdict]

        return (
          <Box key={`pr-${pr.url}`} flexDirection="column" marginTop={i > 0 ? 1 : 0}>
            <Box flexDirection="row">
              <Link href={pr.url} label={`${isMixed ? pr.repo.split('/')[1] : ''}#${pr.number}`} />
              {pr.isDraft && [dot(), <Text dimColor>draft</Text>]}
              {dot()}
              <Text color={look.color} dimColor={look.color === undefined}>
                {look.mark === '' ? '' : `${look.mark} `}
                {standing(pr)}
              </Text>
              {isOpen(pr) &&
                pr.required !== null && [
                  dot(),
                  <Text dimColor>
                    {pr.approvedBy.length}/{pr.required} approvals
                  </Text>,
                ]}
            </Box>
            {pr.title !== '' && <Text wrap="truncate-end">{pr.title}</Text>}
            {people('approved', pr.approvedBy, 'success')}
            {people('changes requested', pr.changesBy, 'error')}
            {isOpen(pr) && people('pending', pr.waitingOn, 'warning')}
            {isOpen(pr) && pr.approvedBy.length + pr.changesBy.length + pr.waitingOn.length === 0 && (
              <Text dimColor>no reviewers yet</Text>
            )}
          </Box>
        )
      })}
      <Box flexDirection="row" marginTop={1}>
        <Button key="refresh" hotkey="r" label="Refresh" onPress={actions.refresh} />
        <Box marginLeft={2}>
          <Button key="close" role="dismiss" label="Close" onPress={actions.close} />
        </Box>
      </Box>
    </Box>
  )
}

/** Rows the details pane wants, so it opens no taller than it needs. */
export const detailsRows = (prs: PrReview[]): number =>
  2 +
  Math.max(1, prs.length) +
  prs.reduce(
    (sum, pr, i) =>
      sum +
      (i > 0 ? 1 : 0) +
      (pr.title !== '' ? 1 : 0) +
      (pr.approvedBy.length > 0 ? 1 : 0) +
      (pr.changesBy.length > 0 ? 1 : 0) +
      (isOpen(pr) && (pr.waitingOn.length > 0 || pr.approvedBy.length + pr.changesBy.length === 0) ? 1 : 0),
    0,
  )
