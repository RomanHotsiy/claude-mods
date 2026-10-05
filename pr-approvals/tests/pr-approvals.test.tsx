import { expect, mock, test } from 'claude-code/testing'

import { chipLabel } from '../hooks/draw'
import { protectionArgv, rulesArgv, viewArgv } from '../hooks/github'
import { resultsArgv, usesArgv } from '../hooks/links'
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
    expect(await textOf(chip, 'pr-approvals-footer')).toBe('focus•\u00a0#28707 approved · 2 pending')
    await chip.unmount()
  }

  // Claude opens a second PR in another repository: the chip counts both.
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill', description: 'Open a PR' })
  await run('add https://github.com/acme/cli/pull/3185')
  for (const surface of ['terminal', 'desktop'] as const) {
    const chip = await footer(surface)
    expect(await textOf(chip, 'pr-approvals-footer')).toBe('•\u00a0PRs 1/2 approved · 4 pending')

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
  expect(await textOf(after, 'pr-approvals-footer')).toBe('•\u00a0#28707 approved · 2 pending')
  await after.unmount()
})

test('the chip names a waiting PR by its pending count alone', async () => {
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
  expect(chipLabel([pr])).toBe('#28642 · 1 pending')
  expect(chipLabel([{ ...pr, waitingOn: [] }])).toBe('#28642')
  expect(chipLabel([{ ...pr, decision: 'CHANGES_REQUESTED', changesBy: ['jlekawa'], waitingOn: [] }])).toBe('#28642 changes requested')
  expect(chipLabel([{ ...pr, state: 'MERGED' }])).toBe('#28642 merged')
})

// A session that opened three PRs in one command, then asked the app for its
// bound PR, before the mod was loaded; and one `gh pr edit` that links nothing.
const TRANSCRIPT = '/home/me/.claude/projects/app/session.jsonl'
const PR = (n: number) => `https://github.com/acme/app/pull/${n}`
const line = (role: string, content: unknown[]) => JSON.stringify({ type: role, message: { role, content } })
const USE_LINES = [
  line('assistant', [{ type: 'tool_use', id: 'toolu_create', name: 'Bash', input: { command: 'gh pr create --draft --head a && gh pr create --draft --head b && gh pr create --draft --head c' } }]),
  line('assistant', [{ type: 'tool_use', id: 'toolu_status', name: 'mcp__ccd_pr__get_status', input: {} }]),
  line('user', [{ type: 'text', text: 'and then gh pr create for the rest?' }]),
].join('\n')
const RESULT_LINES = [
  line('user', [{ type: 'tool_result', tool_use_id: 'toolu_create', content: `${PR(32)}\n${PR(35)}\n${PR(33)}\n` }]),
  line('user', [{ type: 'tool_result', tool_use_id: 'toolu_status', content: [{ type: 'text', text: JSON.stringify({ pr: { url: PR(33) } }) }] }]),
].join('\n')

test('PRs linked before the mod loaded are found in the transcript', async ($, on) => {
  mock.clock(on)
  on('session.cwd', () => ({ value: ROOT }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  const runs: Record<string, ReturnType<typeof ok>> = {
    [usesArgv(TRANSCRIPT).join(' ')]: ok(USE_LINES),
    [resultsArgv(TRANSCRIPT, ['toolu_create', 'toolu_status']).join(' ')]: ok(RESULT_LINES),
  }
  for (const n of [32, 33, 35]) {
    runs[viewArgv(PR(n)).join(' ')] = ok(JSON.stringify({ base: 'main', isDraft: true, number: n, requested: [], reviewDecision: 'REVIEW_REQUIRED', reviews: [], state: 'OPEN', title: `PR ${n}`, url: PR(n) }))
  }
  runs[rulesArgv('acme/app', 'main').join(' ')] = ok('1\n')
  on('process.run', ($, e) => ({ value: runs[e.argv.join(' ')] ?? failed(`no fixture: ${e.argv.join(' ')}`) }))

  on('classic.SessionStart', () => ({}))
  await $.classic.SessionStart({ source: 'resume', transcript_path: TRANSCRIPT })
  // The replay runs in the background; a refresh through the command waits for it to have linked.
  await $.command.run({ command: 'pr-approvals', args: 'add ' + PR(32) } as Parameters<typeof $.command.run>[0])
  const chip = await $.ui.mount({ plugin: 'pr-approvals', surface: 'desktop', component: 'SessionMode', props: { modes: [] } })
  expect((await chip.find({ key: 'pr-approvals-footer' }))?.text).toBe('•\u00a0PRs 0/3 approved')
  await chip.unmount()
})
