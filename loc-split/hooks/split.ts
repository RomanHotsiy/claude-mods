import type { LocCount, LocSplit } from '../types'

export type Category = 'code' | 'tests' | 'docs' | 'gen'

export const CATEGORIES = ['code', 'comments', 'tests', 'docs', 'gen'] as const

type Syntax = {
  line: readonly string[]
  block: readonly (readonly [string, string])[]
  /** C-style `* ...` continuation lines of a block opened outside the hunk. */
  isStarred?: boolean
}

const C: Syntax = { line: ['//'], block: [['/*', '*/']], isStarred: true }
const HASH: Syntax = { line: ['#'], block: [] }
const PYTHON: Syntax = { line: ['#'], block: [['"""', '"""'], ["'''", "'''"]] }
const RUBY: Syntax = { line: ['#'], block: [['=begin', '=end']] }
const SQL: Syntax = { line: ['--'], block: [['/*', '*/']] }
const LUA: Syntax = { line: ['--'], block: [['--[[', ']]']] }
const HASKELL: Syntax = { line: ['--'], block: [['{-', '-}']] }
const MARKUP: Syntax = { line: [], block: [['<!--', '-->']] }
const COMPONENT: Syntax = { line: ['//'], block: [['<!--', '-->'], ['/*', '*/']], isStarred: true }
const CSS: Syntax = { line: [], block: [['/*', '*/']], isStarred: true }
const LISP: Syntax = { line: [';'], block: [] }
const PERCENT: Syntax = { line: ['%'], block: [] }
const NONE: Syntax = { line: [], block: [] }

const BY_EXTENSION: Record<string, Syntax> = {}
const assign = (syntax: Syntax, extensions: string) => {
  for (const ext of extensions.split(' ')) BY_EXTENSION[ext] = syntax
}
assign(
  C,
  'js jsx ts tsx mjs cjs mts cts java kt kts scala go rs c h cc cpp cxx hpp hh m mm cs swift dart php groovy gradle proto sol zig scss less jsonc json5 v',
)
assign(HASH, 'sh bash zsh fish pl pm r yaml yml toml tf tfvars hcl cmake ex exs nim conf cfg ini properties ps1 mk gitignore dockerignore')
assign(PYTHON, 'py pyi pyx')
assign(RUBY, 'rb rake gemspec')
assign(SQL, 'sql')
assign(LUA, 'lua')
assign(HASKELL, 'hs elm')
assign(MARKUP, 'html htm xml xhtml svg')
assign(COMPONENT, 'vue svelte astro')
assign(CSS, 'css')
assign(LISP, 'clj cljs cljc edn el lisp scm rkt')
assign(PERCENT, 'erl hrl tex sty m4')

const BY_NAME: Record<string, Syntax> = {
  dockerfile: HASH,
  makefile: HASH,
  gemfile: RUBY,
  rakefile: RUBY,
  podfile: RUBY,
  brewfile: RUBY,
  'cmakelists.txt': HASH,
}

export const syntaxFor = (path: string): Syntax => {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const byName = BY_NAME[name] ?? (name.startsWith('dockerfile') ? HASH : undefined)
  if (byName !== undefined) return byName
  const dot = name.lastIndexOf('.')

  return dot === -1 ? NONE : BY_EXTENSION[name.slice(dot + 1)] ?? NONE
}

const TEST_FILE =
  /([._-](test|tests|spec|specs|e2e)\.[^/]+$)|((^|\/)test_[^/]+\.py$)|((^|\/)conftest\.py$)|([^/](Test|Tests|Spec|IT)\.(java|kt|scala|cs|swift|groovy|php|m)$)|(_test\.(go|exs?|dart)$)|(_spec\.rb$)/
const TEST_DIR =
  /(^|\/)(tests?|__tests__|__mocks__|__snapshots__|__fixtures__|specs?|e2e|testdata|test-data|testing|fixtures|cypress|playwright)\//i
const DOC_FILE = /\.(md|mdx|markdown|rst|adoc|asciidoc|txt|org|rdoc|textile)$/i
const DOC_NAME = /(^|\/)(readme|changelog|changes|contributing|license|licence|authors|notice|history|code_of_conduct|security)(\.[^/]*)?$/i
const NOT_DOC = /(^|\/)(requirements[^/]*\.txt|constraints[^/]*\.txt|cmakelists\.txt|robots\.txt|llms\.txt)$/i
const DOC_DIR = /(^|\/)(docs?|documentation|wiki|man)\//i

/**
 * Files a tool writes rather than a person: lockfiles, Drizzle snapshots and
 * journal, Jest snapshots, codegen output, minified bundles and source maps.
 * Globs as git's `:(glob)` pathspec magic reads them.
 */
export const GENERATED = [
  '**/package-lock.json',
  '**/npm-shrinkwrap.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lock',
  '**/bun.lockb',
  '**/deno.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/uv.lock',
  '**/Gemfile.lock',
  '**/composer.lock',
  '**/go.sum',
  '**/flake.lock',
  '**/Package.resolved',
  '**/mix.lock',
  '**/pubspec.lock',
  '**/gradle.lockfile',
  '**/packages.lock.json',
  '**/.terraform.lock.hcl',
  '**/meta/*_snapshot.json',
  '**/meta/_journal.json',
  '**/*.snap',
  '**/__snapshots__/**',
  '**/__generated__/**',
  '**/*.gen.*',
  '**/*.generated.*',
  '**/*.pb.go',
  '**/*_pb2.py',
  '**/*_pb2_grpc.py',
  '**/*.g.dart',
  '**/*.freezed.dart',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.js.map',
  '**/*.css.map',
]

const globToRegExp = (glob: string): RegExp => {
  let source = ''
  for (let i = 0; i < glob.length; i += 1) {
    if (glob.startsWith('**/', i)) {
      source += '(?:.*/)?'
      i += 2
    } else if (glob.startsWith('/**', i) && i + 3 === glob.length) {
      source += '/.*'
      i += 2
    } else if (glob[i] === '*') {
      source += '[^/]*'
    } else {
      source += (glob[i] ?? '').replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    }
  }

  return new RegExp(`^${source}$`)
}

const GENERATED_PATTERNS = GENERATED.map(globToRegExp)

export const isGenerated = (path: string): boolean => GENERATED_PATTERNS.some(pattern => pattern.test(path))

export const classify = (path: string): Category => {
  if (isGenerated(path)) return 'gen'
  if (TEST_FILE.test(path)) return 'tests'
  if ((DOC_FILE.test(path) || DOC_NAME.test(path)) && !NOT_DOC.test(path)) return 'docs'
  if (TEST_DIR.test(path)) return 'tests'
  if (DOC_DIR.test(path)) return 'docs'

  return 'code'
}

/** The whole repository less the generated files, which `--numstat` counts instead. */
export const PATHSPECS = [':/', ...GENERATED.map(glob => `:(top,exclude,glob)${glob}`)]

/** Only the generated files. */
export const GENERATED_PATHSPECS = GENERATED.map(glob => `:(top,glob)${glob}`)

export const emptySplit = (): LocSplit => ({
  code: { added: 0, removed: 0 },
  comments: { added: 0, removed: 0 },
  tests: { added: 0, removed: 0 },
  docs: { added: 0, removed: 0 },
  gen: { added: 0, removed: 0 },
})

export const addSplits = (into: LocSplit, from: LocSplit): LocSplit => {
  for (const key of CATEGORIES) {
    into[key].added += from[key].added
    into[key].removed += from[key].removed
  }

  return into
}

export const isEmptySplit = (split: LocSplit): boolean =>
  Object.values(split).every((count: LocCount) => count.added === 0 && count.removed === 0)

type BlockState = { close: string | null }

const isComment = (raw: string, syntax: Syntax, state: BlockState): boolean => {
  const text = raw.trim()
  if (state.close !== null) {
    if (text.includes(state.close)) state.close = null

    return true
  }
  if (text === '') return false
  for (const [open, close] of syntax.block) {
    if (text.startsWith(open)) {
      if (!text.slice(open.length).includes(close)) state.close = close

      return true
    }
  }
  if (syntax.line.some(marker => text.startsWith(marker))) return true

  return syntax.isStarred === true && (text === '*' || text.startsWith('* ') || text.startsWith('*/'))
}

/** Tallies one side of a hunk (or a whole new file) into `split`. */
export const tallyLines = (
  path: string,
  lines: readonly string[],
  side: keyof LocCount,
  split: LocSplit,
): void => {
  if (lines.length === 0) return
  const category = classify(path)
  if (category !== 'code') {
    split[category][side] += lines.length

    return
  }
  const syntax = syntaxFor(path)
  const state: BlockState = { close: null }
  for (const line of lines) {
    split[isComment(line, syntax, state) ? 'comments' : 'code'][side] += 1
  }
}

const unquote = (spelled: string): string => {
  const path = spelled.replace(/\t$/, '')
  if (!path.startsWith('"')) return path
  const bytes: number[] = []
  const encoder = new TextEncoder()
  for (let i = 1; i < path.length - 1; i += 1) {
    const char = path[i] ?? ''
    if (char !== '\\') {
      bytes.push(...encoder.encode(char))
      continue
    }
    const next = path[i + 1] ?? ''
    if (/[0-7]/.test(next)) {
      bytes.push(parseInt(path.slice(i + 1, i + 4), 8))
      i += 3
      continue
    }
    const escapes: Record<string, string> = { n: '\n', t: '\t', '"': '"', '\\': '\\', a: '\x07', b: '\b', f: '\f', r: '\r', v: '\v' }
    bytes.push(...encoder.encode(escapes[next] ?? next))
    i += 1
  }

  return new TextDecoder().decode(new Uint8Array(bytes))
}

const pathOf = (header: string): string | null => {
  const path = unquote(header)
  if (path === '/dev/null') return null

  return path.replace(/^[ab]\//, '')
}

const HUNK = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/

/**
 * Tallies a unified diff made with `-U0 --src-prefix=a/ --dst-prefix=b/`
 * into `split`. Hunk bodies are read by their header's counts, so a removed
 * `-- comment` line is never taken for a file header.
 */
export const tallyPatch = (patch: string, split: LocSplit = emptySplit()): LocSplit => {
  const lines = patch.split('\n')
  let oldPath: string | null = null
  let path: string | null = null
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    i += 1
    if (line.startsWith('diff --git ')) {
      oldPath = null
      path = null
    } else if (line.startsWith('--- ')) {
      oldPath = pathOf(line.slice(4))
    } else if (line.startsWith('+++ ')) {
      path = pathOf(line.slice(4)) ?? oldPath
    } else if (path !== null && line.startsWith('@@ ')) {
      const counts = HUNK.exec(line)
      if (counts === null) continue
      let minus = counts[1] === undefined ? 1 : Number(counts[1])
      let plus = counts[2] === undefined ? 1 : Number(counts[2])
      const removed: string[] = []
      const added: string[] = []
      while (i < lines.length && (minus > 0 || plus > 0)) {
        const body = lines[i] ?? ''
        if (body.startsWith('-') && minus > 0) {
          removed.push(body.slice(1))
          minus -= 1
        } else if (body.startsWith('+') && plus > 0) {
          added.push(body.slice(1))
          plus -= 1
        } else if (body.startsWith(' ')) {
          minus -= 1
          plus -= 1
        } else if (!body.startsWith('\\')) {
          break
        }
        i += 1
      }
      tallyLines(path, removed, 'removed', split)
      tallyLines(path, added, 'added', split)
    }
  }

  return split
}

/** `git log -p --format=%x00%h%x1f%s` output, one entry per commit, newest first. */
export const tallyLog = (log: string): { sha: string; subject: string; split: LocSplit }[] =>
  log
    .split('\0')
    .slice(1)
    .map(entry => {
      const newline = entry.indexOf('\n')
      const head = newline === -1 ? entry : entry.slice(0, newline)
      const [sha = '', subject = ''] = head.split('\x1f')

      return { sha, subject, split: tallyPatch(newline === -1 ? '' : entry.slice(newline + 1)) }
    })

/** Adds `--numstat` lines (`added<TAB>removed<TAB>path`) to `gen`; binary files read `-`. */
export const tallyNumstat = (numstat: string, split: LocSplit = emptySplit()): LocSplit => {
  for (const line of numstat.split('\n')) {
    const [added = '', removed = ''] = line.split('\t')
    if (!/^\d+$/.test(added) || !/^\d+$/.test(removed)) continue
    split.gen.added += Number(added)
    split.gen.removed += Number(removed)
  }

  return split
}

/** `git log --numstat --format=%x00%H` output, by commit. */
export const tallyNumstatLog = (log: string): Map<string, LocSplit> =>
  new Map(
    log
      .split('\0')
      .slice(1)
      .map(entry => {
        const newline = entry.indexOf('\n')
        const sha = (newline === -1 ? entry : entry.slice(0, newline)).split('\x1f')[0] ?? ''

        return [sha, tallyNumstat(newline === -1 ? '' : entry.slice(newline + 1))] as const
      }),
  )

/** Counts a file git does not track yet as all added lines. */
export const tallyNewFile = (path: string, text: string, split: LocSplit): void => {
  if (text.includes('\0')) return
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  tallyLines(path, lines, 'added', split)
}
