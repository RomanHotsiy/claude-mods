import { expect, mock, test } from 'claude-code/testing'

import { FILES, ROOT, RUNS } from './fixture'

test('band row, accordion and command split lines against main', async ($, on) => {
  mock.clock(on)
  on('session.cwd', () => ({ value: ROOT }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('process.run', ($, e) => ({
    value: RUNS[e.argv.join(' ')] ?? {
      exitCode: 1,
      stdout: '',
      stderr: `no fixture: ${e.argv.join(' ')}`,
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('fs.read', ($, e) => {
    const text = FILES[e.path]
    if (text === undefined) throw new Error(`no file fixture: ${e.path}`)

    return { value: text }
  })

  const band = (bodyColumns: number, surface: 'terminal' | 'desktop', maxRows = 20) =>
    $.ui.mount({
      plugin: 'loc-split',
      surface,
      component: 'AbovePrompt',
      props: {
        hasSurvey: false,
        isWorking: false,
        maxRows,
        bodyColumns,
        scroll: { offset: 0, bodyRows: maxRows },
        view: {},
      },
      viewport: { columns: bodyColumns, rows: 40 },
    })
  const textOf = async (drawn: Awaited<ReturnType<typeof band>>) => (await drawn.find({ key: 'loc-split' }))?.text ?? ''

  // The command measures and opens the breakdown.
  expect((await $.command.run({ command: 'loc-split' })).text).toBeUndefined()

  for (const surface of ['terminal', 'desktop'] as const) {
    const wide = await band(140, surface)
    expect(await textOf(wide)).toContain('vs main · 3 commits since')
    expect(await textOf(wide)).not.toContain('feature')
    expect(await textOf(wide)).toMatch(/codecommentstestsdocsgen/)
    expect(await textOf(wide)).toMatch(/7b89a43Docs tweak.*af096edTests, docs, sql.*be0b0d0Add b\.ts and c\.py\+5\+8···/)
    expect(await textOf(wide)).toContain('✎ uncommitted+3 −1+2···')
    expect(await textOf(wide)).toContain('Σ net vs main+9 −2+10 −1+2+3+1')
    expect(await textOf(wide)).not.toContain(' of 3')

    await wide.press({ key: 'toggle' })
    expect(await textOf(wide)).not.toContain('7b89a43')
    expect(await textOf(wide)).toContain('commits ↑3 ▴ ✎')
    expect(await textOf(wide)).toContain('code +9 −2 · comments +10 −1 · tests +2 · docs +3 · gen +1')

    // Open again: the state is the session's, so what follows starts open.
    await wide.press({ key: 'toggle' })
    expect(await textOf(wide)).toContain('commits ↑3 ▾')
    await wide.unmount()

    // A short band: two commits at a time, scrolled by its own arrows while
    // the title, the totals and the summary row stay put.
    const short = await band(140, surface, 8)
    expect(await textOf(short)).toContain('1–2 of 3')
    expect(await textOf(short)).toMatch(/gen↑7b89a43.*•af096ed.*·↓/)
    expect(await textOf(short)).not.toContain('be0b0d0')
    await short.press({ key: 'down' })
    expect(await textOf(short)).toContain('2–3 of 3')
    expect(await textOf(short)).toMatch(/af096ed.*·be0b0d0.*•↓/)
    expect(await textOf(short)).not.toContain('7b89a43')
    expect(await textOf(short)).toContain('Σ net vs main')
    expect(await textOf(short)).toContain('commits ↑3 ▾')
    await short.press({ key: 'up' })
    expect(await textOf(short)).toContain('1–2 of 3')
    await short.unmount()

    const narrow = await band(60, surface)
    const row = await textOf(narrow)
    expect(row).toContain('↑3 ▾ ✎')
    expect(row).not.toContain('commits ↑')
    expect(row).toContain('code +9 · cmt +10 · test +2 · doc +3 · gen +1')
    expect(row).toMatch(/codecmttestdocgen/)
    await narrow.unmount()
  }
})
