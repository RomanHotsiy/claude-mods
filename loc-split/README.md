# loc-split

A [Claude Code mod](https://claude.dev/blog/getting-started-with-claude-code-mods/) that shows what your branch changed against `main`, split into **code**, **comments**, **tests**, **docs** and **gen** (generated files), in a row right above the prompt.

![loc-split, collapsed and expanded](../assets/loc-split.png)

```
commits ↑7 ▴              code +788 −89 · comments +135 · tests +1210 −1 · docs +52 · gen +6
```

Click `commits ↑7` (or type `/loc-split`) to open the per-commit table above it: every commit since the branch left `main`, your uncommitted changes, and the net total. The list scrolls on its own when it is long; the totals and the row stay put.

## What it counts

The numbers are lines added and removed between the merge base with `main` and your working tree, untracked files included. The base is the first of `origin/main`, `main`, `origin/master`, `master` that exists, then whatever `origin/HEAD` points at.

| Category | Files |
| --- | --- |
| **tests** | `*.test.*`, `*.spec.*`, `*_test.go`, `test_*.py`, `*Test.java`, `*_spec.rb`, and anything under `tests/`, `__tests__/`, `spec/`, `e2e/`, `fixtures/`, … |
| **docs** | `.md`, `.mdx`, `.rst`, `.txt`, `.adoc`, README / CHANGELOG / LICENSE, and anything under `docs/` |
| **gen** | lockfiles (npm, pnpm, yarn, bun, Cargo, Poetry, uv, `go.sum`, …), Drizzle `meta/*_snapshot.json` and `_journal.json`, Jest `.snap`, `*.gen.*`, `*.generated.*`, `__generated__/`, protobuf and Dart codegen, minified bundles and source maps |
| **code** / **comments** | everything else, each changed line sorted by whether it is a comment |

Comments are told apart per language: `//` and `/* */` (JSDoc `*` lines included) for the C family, JS/TS, Go, Rust, Java, Swift, CSS and the like; `#` for Python, Ruby, shell, YAML, TOML; Python docstrings; `--` for SQL, Lua and Haskell; `<!-- -->` for HTML, XML, Vue and Svelte. A line with code before its comment counts as code.

Generated files are counted with `git diff --numstat`, so a large lockfile change costs nothing to measure, and they are left out of the comment analysis entirely.

Categories with no changed lines are left off the row. When the band is narrow the row drops the word "commits", then shortens the labels (`cmt`, `test`, `doc`), then shows added lines only.

## When it refreshes

When the session starts, a moment after Claude edits a file or runs a command, at the end of every turn, and every 20 seconds, so commits you make in your own terminal show up too.

## Install

```
/plugin marketplace add RomanHotsiy/claude-mods
/plugin install loc-split@claude-mods
/reload-plugins
```

The row shows in any session whose working directory is a git repository with a `main` or `master` branch.

A mod is code that runs inside Claude Code on your machine, with the same access Claude Code has. Read the source first: it is three files under [`hooks/`](hooks). It runs `git` read-only in your repository and reads untracked files to count their lines; it writes nothing and makes no network calls.

## Develop

```
claude --plugin-dir ./loc-split
claude plugin validate ./loc-split
claude plugin test ./loc-split
```

`tests/fixture.ts` holds git output recorded from a small scratch repository, so the test runs without git.
