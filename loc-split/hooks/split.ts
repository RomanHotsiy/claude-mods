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
const C_HASH: Syntax = { line: ['//', '#'], block: [['/*', '*/']], isStarred: true }
const HASH: Syntax = { line: ['#'], block: [] }
const NIX: Syntax = { line: ['#'], block: [['/*', '*/']], isStarred: true }
const PYTHON: Syntax = { line: ['#'], block: [['"""', '"""'], ["'''", "'''"]] }
const RUBY: Syntax = { line: ['#'], block: [['=begin', '=end']] }
const PERL: Syntax = { line: ['#'], block: [['=pod', '=cut'], ['=head', '=cut'], ['=begin', '=end'], ['=item', '=cut']] }
const JULIA: Syntax = { line: ['#'], block: [['#=', '=#']] }
const POWERSHELL: Syntax = { line: ['#'], block: [['<#', '#>']] }
const COFFEE: Syntax = { line: ['#'], block: [['###', '###']] }
const NIM: Syntax = { line: ['#'], block: [['#[', ']#']] }
const GRAPHQL: Syntax = { line: ['#'], block: [['"""', '"""']] }
const INI: Syntax = { line: [';', '#'], block: [] }
const SQL: Syntax = { line: ['--'], block: [['/*', '*/']], isStarred: true }
const LUA: Syntax = { line: ['--'], block: [['--[[', ']]']] }
const HASKELL: Syntax = { line: ['--'], block: [['{-', '-}']] }
const ADA: Syntax = { line: ['--'], block: [] }
const ML: Syntax = { line: [], block: [['(*', '*)']] }
const FSHARP: Syntax = { line: ['//'], block: [['(*', '*)']] }
const MARKUP: Syntax = { line: [], block: [['<!--', '-->']] }
const COMPONENT: Syntax = { line: ['//'], block: [['<!--', '-->'], ['/*', '*/']], isStarred: true }
const TEMPLATE: Syntax = { line: [], block: [['{{!--', '--}}'], ['{{!', '}}'], ['{#', '#}'], ['<!--', '-->']] }
const CSS: Syntax = { line: [], block: [['/*', '*/']], isStarred: true }
const LISP: Syntax = { line: [';'], block: [['#|', '|#']] }
const PERCENT: Syntax = { line: ['%'], block: [] }
const BANG: Syntax = { line: ['!'], block: [] }
const VB: Syntax = { line: ["'", 'REM ', 'rem '], block: [] }
const BATCH: Syntax = { line: ['::', 'REM ', 'rem ', '@REM ', '@rem '], block: [] }
const VIM: Syntax = { line: ['"'], block: [] }
const ASSEMBLY: Syntax = { line: [';', '#', '//'], block: [['/*', '*/']] }
const NONE: Syntax = { line: [], block: [] }

const BY_EXTENSION: Record<string, Syntax> = {}
const assign = (syntax: Syntax, extensions: string) => {
  for (const ext of extensions.split(/\s+/)) BY_EXTENSION[ext] = syntax
}
// JavaScript and TypeScript, the JVM, Go, Rust, the C family, C#, Swift,
// Dart, PHP, shaders and hardware languages, and the C-commented styles.
assign(
  C,
  `js jsx ts tsx mjs cjs mts cts java kt kts scala sc sbt groovy gvy gradle go rs
   c h cc cpp cxx c++ hpp hh hxx h++ ipp inl tpp m mm cs csx swift dart php phtml
   proto thrift sol zig v sv svh vala d cu cuh glsl hlsl wgsl frag vert comp geom
   metal ino pde qml hx as gleam move cairo odin prisma smithy jsonc json5 scss less
   sass styl`,
)
assign(C_HASH, 'tf tfvars hcl nomad')
assign(NIX, 'nix')
assign(
  HASH,
  `sh bash zsh fish ksh csh tcsh r yaml yml toml cmake ex exs cr mk mak make conf
   cfg properties gitignore gitattributes dockerignore npmignore prettierignore
   eslintignore env envrc bashrc zshrc profile bash_profile awk sed tcl gd bzl
   bazel star sky bats raku rakumod p6 pl6 dockerfile containerfile`,
)
assign(PYTHON, 'py pyi pyx pxd pyw')
assign(RUBY, 'rb rake gemspec ru podspec jbuilder')
assign(PERL, 'pl pm t pod')
assign(JULIA, 'jl')
assign(POWERSHELL, 'ps1 psm1 psd1')
assign(COFFEE, 'coffee')
assign(NIM, 'nim nims nimble')
assign(GRAPHQL, 'graphql gql graphqls')
assign(INI, 'ini editorconfig npmrc')
assign(SQL, 'sql psql pgsql plsql ddl')
assign(LUA, 'lua')
assign(HASKELL, 'hs elm purs dhall agda idr')
assign(ADA, 'ada adb ads vhd vhdl')
assign(ML, 'ml mli')
assign(FSHARP, 'fs fsi fsx')
assign(
  MARKUP,
  'html htm xhtml xml svg xsd xsl xslt xaml csproj fsproj vbproj props targets plist resx storyboard xib wsdl',
)
assign(COMPONENT, 'vue svelte astro')
assign(TEMPLATE, 'jinja jinja2 j2 twig njk hbs handlebars mustache')
assign(CSS, 'css pcss postcss')
assign(LISP, 'clj cljs cljc edn el lisp lsp scm ss rkt fnl')
assign(PERCENT, 'erl hrl')
assign(BANG, 'f f90 f95 f03 f08 for')
assign(VB, 'vb vbs bas')
assign(BATCH, 'bat cmd')
assign(VIM, 'vim')
assign(ASSEMBLY, 'asm s')

const BY_NAME: Record<string, Syntax> = {
  dockerfile: HASH,
  containerfile: HASH,
  makefile: HASH,
  gnumakefile: HASH,
  justfile: HASH,
  procfile: HASH,
  caddyfile: HASH,
  codeowners: HASH,
  build: HASH,
  'build.bazel': HASH,
  workspace: HASH,
  'workspace.bazel': HASH,
  'module.bazel': HASH,
  tiltfile: HASH,
  pipfile: HASH,
  'cmakelists.txt': HASH,
  'requirements.txt': HASH,
  gemfile: RUBY,
  rakefile: RUBY,
  podfile: RUBY,
  brewfile: RUBY,
  vagrantfile: RUBY,
  fastfile: RUBY,
  appfile: RUBY,
  dangerfile: RUBY,
  guardfile: RUBY,
  berksfile: RUBY,
  jenkinsfile: C,
}

export const syntaxFor = (path: string): Syntax => {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  const byName =
    BY_NAME[name] ??
    (name.startsWith('dockerfile') || name.startsWith('.env') || /^requirements[^/]*\.txt$/.test(name) ? HASH : undefined)
  if (byName !== undefined) return byName
  const dot = name.lastIndexOf('.')

  return dot === -1 ? NONE : (BY_EXTENSION[name.slice(dot + 1)] ?? NONE)
}

/** Test files by name, across ecosystems. */
const TEST_FILE = new RegExp(
  [
    // foo.test.ts, foo.spec.js, foo-test.js, foo_test.go/py/rb/exs/dart/cc/rs, foo_spec.rb/lua, foo.e2e.ts, foo.e2e-spec.ts
    String.raw`[._-](test|tests|spec|specs|e2e|e2e-spec|unittest|unittests|integration-test|it)\.[^/]+$`,
    // Cypress, type tests (tsd, Vitest), Bats, Perl
    String.raw`\.cy\.[cm]?[jt]sx?$`,
    String.raw`\.test-d\.[cm]?tsx?$`,
    String.raw`\.bats$`,
    String.raw`(^|/)[^/]+\.t$`,
    // test_foo.py, test_foo.c, test_foo.sh; testthat's test-foo.R
    String.raw`(^|/)test_[^/]+$`,
    String.raw`(^|/)test-[^/]+\.[rR]$`,
    // pytest and Django; RSpec helpers
    String.raw`(^|/)(conftest|tests?)\.py$`,
    String.raw`(^|/)(spec_helper|rails_helper)\.rb$`,
    // FooTest.java, FooTests.cs, FooSpec.scala, FooIT.java, FooSuite.scala, FooTestCase.php, FooSpec.hs, FooTest.cpp
    String.raw`[^/](Test|Tests|TestCase|Spec|Specs|Suite|IT|IntegrationTest|IntegrationTests)\.(java|kt|kts|scala|groovy|cs|fs|vb|swift|m|mm|php|dart|hs|cpp|cc|cxx|h|hpp)$`,
  ].join('|'),
)
/** Directories whose files are tests, any case. */
const TEST_DIR = new RegExp(
  [
    String.raw`(^|/)(tests?|__tests?__|__mocks__|mocks?|__fixtures__|fixtures|e2e|integration[-_]tests?|integration_test|androidTest|testFixtures|testdata|test[-_]data|testing|cypress|playwright)/`,
    // .NET test projects: MyApp.Tests/, MyApp.UnitTests/, MyApp.Specs/
    String.raw`(^|/)[^/]+\.(tests?|unittests|integrationtests|specs)/`,
  ].join('|'),
  'i',
)
/** RSpec's spec/: tests, except data such as an OpenAPI spec/openapi.yaml. */
const SPEC_DIR = /(^|\/)specs?\//i
const DATA_FILE = /\.(ya?ml|json|xml|graphql|proto|csv)$/i
const DOC_FILE = /\.(md|mdx|markdown|rst|adoc|asciidoc|txt|org|rdoc|textile|tex|pod|rmd)$/i
const DOC_NAME =
  /(^|\/)(readme|changelog|changes|contributing|license|licence|authors|notice|history|code_of_conduct|security|support|governance|maintainers|citation)(\.[^/]*)?$/i
const NOT_DOC = /(^|\/)(requirements[^/]*\.txt|constraints[^/]*\.txt|cmakelists\.txt|robots\.txt|llms\.txt)$/i
const DOC_DIR = /(^|\/)(docs?|documentation|wiki|man|guides?)\//i

/**
 * Files a tool writes, or a project vendors, rather than a person writes:
 * lockfiles, migration and ORM output, test snapshots, codegen output,
 * bundles, source maps and vendored code. Globs as git's `:(glob)` pathspec
 * magic reads them; files `.gitattributes` marks `linguist-generated` or
 * `linguist-vendored` count too (see `GENERATED_ATTRIBUTES`).
 */
export const GENERATED = [
  // JavaScript and TypeScript
  '**/package-lock.json',
  '**/npm-shrinkwrap.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/bun.lock',
  '**/bun.lockb',
  '**/deno.lock',
  '**/.pnp.cjs',
  '**/.pnp.loader.mjs',
  '**/.yarn/releases/**',
  '**/.yarn/plugins/**',
  '**/.yarn/sdks/**',
  '**/.yarn/cache/**',
  '**/next-env.d.ts',
  '**/*.tsbuildinfo',
  // Python
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/uv.lock',
  '**/pdm.lock',
  '**/pixi.lock',
  '**/conda-lock.yml',
  // Ruby, PHP, Go, Rust, Elixir, Erlang, Dart
  '**/Gemfile.lock',
  '**/composer.lock',
  '**/go.sum',
  '**/go.work.sum',
  '**/Cargo.lock',
  '**/mix.lock',
  '**/rebar.lock',
  '**/pubspec.lock',
  // JVM, .NET, Apple, C and C++
  '**/gradle.lockfile',
  '**/packages.lock.json',
  '**/paket.lock',
  '**/Package.resolved',
  '**/Podfile.lock',
  '**/Cartfile.resolved',
  '**/*.pbxproj',
  '**/conan.lock',
  // Nix, Terraform, Bazel, Julia, R, Haskell, Crystal
  '**/flake.lock',
  '**/devbox.lock',
  '**/.terraform.lock.hcl',
  '**/MODULE.bazel.lock',
  '**/Manifest.toml',
  '**/renv.lock',
  '**/stack.yaml.lock',
  '**/cabal.project.freeze',
  '**/shard.lock',
  // Migrations and ORMs: Drizzle, Prisma, Django, Rails, EF Core, sqlc
  '**/meta/*_snapshot.json',
  '**/meta/_journal.json',
  '**/migrations/migration_lock.toml',
  '**/migrations/[0-9][0-9][0-9][0-9]_*.py',
  '**/db/schema.rb',
  '**/db/structure.sql',
  '**/Migrations/*.Designer.cs',
  '**/Migrations/*ModelSnapshot.cs',
  '**/*.sql.go',
  // Test snapshots: Jest, Vitest, insta, syrupy, swift-snapshot-testing
  '**/*.snap',
  '**/*.snap.new',
  '**/*.ambr',
  '**/__snapshots__/**',
  '**/__Snapshots__/**',
  // Codegen
  '**/__generated__/**',
  '**/*.gen.*',
  '**/*.generated.*',
  '**/*_generated.*',
  '**/zz_generated.*',
  '**/*.pb.go',
  '**/*.pb.gw.go',
  '**/*_pb2.py',
  '**/*_pb2.pyi',
  '**/*_pb2_grpc.py',
  '**/*.pb.cc',
  '**/*.pb.h',
  '**/*_pb.js',
  '**/*_pb.d.ts',
  '**/*_grpc_pb.js',
  '**/*_grpc_pb.d.ts',
  '**/*.pb.swift',
  '**/*.grpc.swift',
  '**/*.pb.dart',
  '**/*.pbenum.dart',
  '**/*.pbjson.dart',
  '**/*.pbgrpc.dart',
  '**/*.g.dart',
  '**/*.freezed.dart',
  '**/*.mocks.dart',
  '**/*.g.cs',
  '**/*.g.i.cs',
  '**/*.designer.cs',
  '**/*.Designer.cs',
  // Bundles and source maps
  '**/dist/**',
  '**/*.min.js',
  '**/*.min.mjs',
  '**/*.min.css',
  '**/*.js.map',
  '**/*.mjs.map',
  '**/*.cjs.map',
  '**/*.css.map',
  '**/*.d.ts.map',
  // Vendored code
  'vendor/**',
  '**/node_modules/**',
]

/** `.gitattributes` attributes that mark a file generated or vendored, as GitHub reads them. */
export const GENERATED_ATTRIBUTES = ['linguist-generated', 'linguist-vendored']

const globToRegExp = (glob: string): RegExp => {
  let source = ''
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i] ?? ''
    if (glob.startsWith('**/', i)) {
      source += '(?:.*/)?'
      i += 2
    } else if (glob.startsWith('/**', i) && i + 3 === glob.length) {
      source += '/.*'
      i += 2
    } else if (char === '*') {
      source += '[^/]*'
    } else if (char === '?') {
      source += '[^/]'
    } else if (char === '[') {
      const close = glob.indexOf(']', i + 1)
      source += glob.slice(i, close + 1)
      i = close
    } else {
      source += '.+^${}()|\\'.includes(char) ? `\\${char}` : char
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
  if (SPEC_DIR.test(path) && !DATA_FILE.test(path)) return 'tests'
  if (DOC_DIR.test(path)) return 'docs'

  return 'code'
}

const attributeSpecs = (magic: string) =>
  GENERATED_ATTRIBUTES.flatMap(attribute => [`:(${magic}attr:${attribute})`, `:(${magic}attr:${attribute}=true)`])

/**
 * The whole repository less the generated files, which `--numstat` counts
 * instead. `withAttributes` adds the `.gitattributes` marks; git before
 * attribute pathspecs reached diff and log refuses them, so the caller asks.
 */
export const pathspecs = (withAttributes: boolean) => [
  ':/',
  ...GENERATED.map(glob => `:(top,exclude,glob)${glob}`),
  ...(withAttributes ? attributeSpecs('top,exclude,') : []),
]

/** Only the generated files. */
export const generatedPathspecs = (withAttributes: boolean) => [
  ...GENERATED.map(glob => `:(top,glob)${glob}`),
  ...(withAttributes ? attributeSpecs('top,') : []),
]

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
  category: Category = classify(path),
): void => {
  if (lines.length === 0) return
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

/** Counts a file git does not track yet as all added lines; `isMarkedGenerated` when `.gitattributes` says so. */
export const tallyNewFile = (path: string, text: string, split: LocSplit, isMarkedGenerated = false): void => {
  if (text.includes('\0')) return
  const lines = text.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  tallyLines(path, lines, 'added', split, isMarkedGenerated ? 'gen' : classify(path))
}

/**
 * The paths `git check-attr -z` output marks generated or vendored: records
 * of path, attribute and value, each ending in NUL.
 */
export const markedGenerated = (output: string): Set<string> => {
  const fields = output.split('\0')
  const marked = new Set<string>()
  for (let i = 0; i + 2 < fields.length; i += 3) {
    const value = fields[i + 2]
    if (value === 'set' || value === 'true') marked.add(fields[i] ?? '')
  }

  return marked
}
