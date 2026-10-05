import { expect, mock, test } from 'claude-code/testing'

import { chipLabel } from '../hooks/draw'
import { protectionArgv, rulesArgv, viewArgv } from '../hooks/github'
import type { PrReview } from '../types'

const ROOT = '/work/app'
const BRANCH_PR = 'https://github.com/acme/app/pull/28707'
const CREATED_PR = 'https://github.com/acme/cli/pull/3185'

const ok = (stdout: string) => ({ exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
const failed = (stderr: string) => ({ exitCode: 1, stdout: '', stderr, isStdoutTruncated: false, isStderrTruncated: false })

// What `gh` printed for two real PRs, renamed: one approved with two team
// reviews still requested, one waiting with nobody's review in.
const VIEW_BRANCH = JSON.stringify({
  base: 'main',
  isDraft: false,
  number: 28707,
  requested: ['Lightsabers', 'Staff engineers'],
  reviewDecision: 'APPROVED',
  reviews: [{ state: 'APPROVED', who: 'jlekawa' }],
  state: 'OPEN',
  title: 'Localize navigation on translated pages',
  url: BRANCH_PR,
})
const VIEW_CREATED = JSON.stringify({
  base: 'main',
  isDraft: false,
  number: 3185,
  requested: ['Technical Writers', 'Dark Side'],
  reviewDecision: 'REVIEW_REQUIRED',
  reviews: [],
  state: 'OPEN',
  title: 'Document the lint command',
  url: CREATED_PR,
})

const RUNS: Record<string, ReturnType<typeof ok>> = {
  [viewArgv().join(' ')]: ok(VIEW_BRANCH),
  [viewArgv(BRANCH_PR).join(' ')]: ok(VIEW_BRANCH),
  [viewArgv(CREATED_PR).join(' ')]: ok(VIEW_CREATED),
  [rulesArgv('acme/app', 'main').join(' ')]: ok('1\n'),
  [protectionArgv('acme/app', 'main').join(' ')]: failed('gh: Branch not protected (HTTP 404)'),
  // No ruleset asks for reviews here, and protection is unreadable: the count stays unknown.
  [rulesArgv('acme/cli', 'main').join(' ')]: ok(''),
  [protectionArgv('acme/cli', 'main').join(' ')]: failed('gh: Not Found (HTTP 404)'),
}

test('footer chip summarizes the PRs and opens their details', async ($, on) => {
  mock.clock(on)
  on('session.cwd', () => ({ value: ROOT }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('process.run', ($, e) => ({ value: RUNS[e.argv.join(' ')] ?? failed(`no fixture: ${e.argv.join(' ')}`) }))
  on('tool.call', () => ({ result: { stdout: `${CREATED_PR}\n` }, text: `Creating pull request\n${CREATED_PR}\n` }))
  let isUp = false
  on('ui.open', () => {
    isUp = true

    return { value: { isPlaced: true as const } }
  })
  on('ui.close', () => {
    isUp = false

    return { value: undefined }
  })
  on('ui.panes', () => ({ value: isUp ? [{ id: 'pr-approvals', title: 'Pull requests', isPlaced: true }] : [] }) as never)

  // The kit types `command.run` with the fields the engine stamps; it stamps them here too.
  const run = (args = '') => $.command.run({ command: 'pr-approvals', args } as Parameters<typeof $.command.run>[0])
  const footer = (surface: 'terminal' | 'desktop', modes: string[] = []) =>
    $.ui.mount({ plugin: 'pr-approvals', surface, component: 'SessionMode', props: { modes } })
  const details = (surface: 'terminal' | 'desktop') =>
    $.ui.mount({
      plugin: 'pr-approvals',
      surface,
      component: 'Pane',
      requestId: 'pr-approvals',
      props: {
        title: 'Pull requests',
        isFocused: true,
        bodyColumns: 100,
        placement: 'inline',
        scroll: { offset: 0, bodyRows: 20 },
        view: {},
      },
      viewport: { columns: 100, rows: 40 },
    })
  const textOf = async (drawn: { find: Awaited<ReturnType<typeof footer>>['find'] }, key: string) => (await drawn.find({ key }))?.text ?? ''

  // The branch's PR alone: named in the chip, the engine's modes before it.
  expect((await run()).text).toBeUndefined()
  expect(isUp).toBe(true)
  await run()
  expect(isUp).toBe(false)
  for (const surface of ['terminal', 'desktop'] as const) {
    const chip = await footer(surface, ['focus'])
    expect(await textOf(chip, 'pr-approvals-footer')).toBe('focus🟢 #28707 approved · 2 pending')
    await chip.unmount()
  }

  // Claude opens a second PR in another repository: the chip counts both.
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill', description: 'Open a PR' })
  await run('add https://github.com/acme/cli/pull/3185')
  for (const surface of ['terminal', 'desktop'] as const) {
    const chip = await footer(surface)
    expect(await textOf(chip, 'pr-approvals-footer')).toBe('🟡 PRs 1/2 approved · 4 pending')

    // A click on the chip opens the details; each PR with who reviewed and who is asked.
    await chip.press({ key: 'pr-chip' })
    expect(isUp).toBe(true)
    const pane = await details(surface)
    const text = await textOf(pane, 'pr-approvals')
    expect(text).toContain('app#28707·✓ approved·1/1 approvals')
    expect(text).toContain('Localize navigation on translated pages')
    expect(text).toContain('approved: jlekawa')
    expect(text).toContain('pending: Lightsabers, Staff engineers')
    expect(text).toContain('cli#3185·not approved')
    expect(text).toContain('pending: Technical Writers, Dark Side')
    await pane.press({ key: 'close' })
    expect(isUp).toBe(false)
    await pane.unmount()
    await chip.unmount()
  }

  // Removing it by number leaves the branch's PR.
  expect((await run('remove #3185')).text).toBeUndefined()
  const after = await footer('terminal')
  expect(await textOf(after, 'pr-approvals-footer')).toBe('🟢 #28707 approved · 2 pending')
  await after.unmount()
})

test('the chip names a waiting PR by its mark and pending count alone', async () => {
  const pr: PrReview = {
    url: 'https://github.com/acme/app/pull/28642',
    repo: 'acme/app',
    number: 28642,
    title: 'Translate the sidebar',
    state: 'OPEN',
    isDraft: false,
    decision: 'REVIEW_REQUIRED',
    approvedBy: [],
    changesBy: [],
    waitingOn: ['Lightsabers'],
    required: 1,
  }
  expect(chipLabel([pr])).toBe('🟡 #28642 · 1 pending')
  expect(chipLabel([{ ...pr, waitingOn: [] }])).toBe('🟡 #28642')
  expect(chipLabel([{ ...pr, decision: 'CHANGES_REQUESTED', changesBy: ['jlekawa'], waitingOn: [] }])).toBe('🔴 #28642 changes requested')
  expect(chipLabel([{ ...pr, state: 'MERGED' }])).toBe('🟣 #28642 merged')
})
