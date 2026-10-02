import { describe, expect, test } from 'claude-code/testing'

import { classify, emptySplit, markedGenerated, tallyLines } from '../hooks/split'

const CLASSIFIED: [string, ReturnType<typeof classify>][] = [
  // Tests, by name
  ['src/button.test.tsx', 'tests'],
  ['src/button.spec.ts', 'tests'],
  ['src/api.e2e-spec.ts', 'tests'],
  ['cypress/e2e/login.cy.ts', 'tests'],
  ['src/types.test-d.ts', 'tests'],
  ['pkg/server/handler_test.go', 'tests'],
  ['app/test_models.py', 'tests'],
  ['app/models_test.py', 'tests'],
  ['conftest.py', 'tests'],
  ['blog/tests.py', 'tests'],
  ['src/main/java/com/acme/OrderServiceTest.java', 'tests'],
  ['src/main/kotlin/OrderServiceIT.kt', 'tests'],
  ['src/OrderSpec.scala', 'tests'],
  ['Acme.Orders/OrderTests.cs', 'tests'],
  ['Sources/OrderTests.swift', 'tests'],
  ['src/OrderTest.php', 'tests'],
  ['src/parser_unittest.cc', 'tests'],
  ['lib/parser_spec.rb', 'tests'],
  ['spec/spec_helper.rb', 'tests'],
  ['test/parser_test.exs', 'tests'],
  ['lib/parser_test.dart', 'tests'],
  ['spec/parser_spec.lua', 'tests'],
  ['test/cli.bats', 'tests'],
  ['t/basic.t', 'tests'],
  ['tests/testthat/test-parse.R', 'tests'],
  // Tests, by folder
  ['src/__tests__/button.tsx', 'tests'],
  ['crates/core/tests/integration.rs', 'tests'],
  ['app/src/androidTest/java/MainTest.kt', 'tests'],
  ['integration_test/app_test.dart', 'tests'],
  ['Acme.Orders.Tests/Helpers.cs', 'tests'],
  ['spec/support/factories.rb', 'tests'],
  ['src/fixtures/user.json', 'tests'],
  // An API spec is not a test
  ['spec/openapi.yaml', 'code'],
  // Docs
  ['README.md', 'docs'],
  ['docs/guide/setup.mdx', 'docs'],
  ['CHANGELOG', 'docs'],
  ['docs/architecture.png', 'docs'],
  ['paper/main.tex', 'docs'],
  ['requirements.txt', 'code'],
  // Generated: lockfiles
  ['package-lock.json', 'gen'],
  ['apps/web/pnpm-lock.yaml', 'gen'],
  ['yarn.lock', 'gen'],
  ['bun.lock', 'gen'],
  ['Cargo.lock', 'gen'],
  ['go.sum', 'gen'],
  ['poetry.lock', 'gen'],
  ['uv.lock', 'gen'],
  ['Gemfile.lock', 'gen'],
  ['composer.lock', 'gen'],
  ['ios/Podfile.lock', 'gen'],
  ['Package.resolved', 'gen'],
  ['pubspec.lock', 'gen'],
  ['flake.lock', 'gen'],
  ['.terraform.lock.hcl', 'gen'],
  // Generated: migrations, ORMs, snapshots
  ['drizzle/meta/0003_snapshot.json', 'gen'],
  ['drizzle/meta/_journal.json', 'gen'],
  ['drizzle/0003_add_users.sql', 'code'],
  ['prisma/migrations/migration_lock.toml', 'gen'],
  ['blog/migrations/0004_auto_20260101_1200.py', 'gen'],
  ['blog/migrations/__init__.py', 'code'],
  ['db/schema.rb', 'gen'],
  ['Data/Migrations/20260101_Init.Designer.cs', 'gen'],
  ['internal/db/queries.sql.go', 'gen'],
  ['src/__snapshots__/button.test.tsx.snap', 'gen'],
  ['tests/snapshots/parse__basic.snap', 'gen'],
  ['tests/__snapshots__/test_api.ambr', 'gen'],
  // Generated: codegen, bundles, vendored
  ['src/routeTree.gen.ts', 'gen'],
  ['src/gql/__generated__/types.ts', 'gen'],
  ['api/v1/orders.pb.go', 'gen'],
  ['api/v1/orders_pb2.py', 'gen'],
  ['web/orders_pb.d.ts', 'gen'],
  ['lib/models/user.g.dart', 'gen'],
  ['lib/models/user.freezed.dart', 'gen'],
  ['Forms/Main.Designer.cs', 'gen'],
  ['pkg/apis/v1/zz_generated.deepcopy.go', 'gen'],
  ['App.xcodeproj/project.pbxproj', 'gen'],
  ['next-env.d.ts', 'gen'],
  ['dist/index.js', 'gen'],
  ['public/app.min.js', 'gen'],
  ['public/app.js.map', 'gen'],
  ['vendor/github.com/pkg/errors/errors.go', 'gen'],
  ['.pnp.cjs', 'gen'],
  // Code
  ['src/index.ts', 'code'],
  ['internal/vendor/notes.go', 'code'],
]

describe('classify', () => {
  test('sorts paths across ecosystems', async () => {
    for (const [path, category] of CLASSIFIED) {
      expect(`${path} → ${classify(path)}`).toBe(`${path} → ${category}`)
    }
  })
})

/** Comment lines and code lines, as a file of the given name adds them. */
const counted = (path: string, source: string) => {
  const split = emptySplit()
  tallyLines(path, source.split('\n'), 'added', split)

  return { comments: split.comments.added, code: split.code.added }
}

const COMMENTED: [string, string, { comments: number; code: number }][] = [
  ['a.ts', '/**\n * Docs.\n */\nexport const a = 1 // trailing\n// note', { comments: 4, code: 1 }],
  ['a.go', '// Package a.\npackage a', { comments: 1, code: 1 }],
  ['a.rs', '/// Doc.\n//! Crate.\nfn main() {}', { comments: 2, code: 1 }],
  ['a.py', '"""Module.\n\nMore.\n"""\n# note\nx = 1', { comments: 5, code: 1 }],
  ['a.rb', '# note\n=begin\nblock\n=end\nputs 1', { comments: 4, code: 1 }],
  ['a.pl', '# note\n=pod\ndoc\n=cut\nprint 1;', { comments: 4, code: 1 }],
  ['a.sh', '#!/bin/sh\n# note\necho hi', { comments: 2, code: 1 }],
  ['a.yaml', '# note\nkey: value', { comments: 1, code: 1 }],
  ['main.tf', '# note\n// note\n/* block */\nresource "x" "y" {}', { comments: 3, code: 1 }],
  ['default.nix', '# note\n/* block */\n{ pkgs }: pkgs.hello', { comments: 2, code: 1 }],
  ['a.jl', '#= block\nstill =#\n# note\nx = 1', { comments: 3, code: 1 }],
  ['a.ps1', '<# block\n#>\n# note\nWrite-Host hi', { comments: 3, code: 1 }],
  ['a.sql', '-- note\n/* block */\nSELECT 1;', { comments: 2, code: 1 }],
  ['a.lua', '--[[ block\n]]\n-- note\nprint(1)', { comments: 3, code: 1 }],
  ['a.hs', '{- block -}\n-- note\nmain = pure ()', { comments: 2, code: 1 }],
  ['a.ml', '(* note *)\nlet x = 1', { comments: 1, code: 1 }],
  ['a.fs', '// note\n(* block *)\nlet x = 1', { comments: 2, code: 1 }],
  ['a.ex', '# note\ndefmodule A do end', { comments: 1, code: 1 }],
  ['a.erl', '% note\n-module(a).', { comments: 1, code: 1 }],
  ['a.clj', '; note\n#| block |#\n(def a 1)', { comments: 2, code: 1 }],
  ['a.html', '<!-- note -->\n<p>hi</p>', { comments: 1, code: 1 }],
  ['a.vue', '<!-- note -->\n// note\n<template></template>', { comments: 2, code: 1 }],
  ['a.jinja', '{# note #}\n<p>{{ x }}</p>', { comments: 1, code: 1 }],
  ['a.hbs', '{{!-- note --}}\n<p>{{x}}</p>', { comments: 1, code: 1 }],
  ['a.css', '/* note */\na { color: red }', { comments: 1, code: 1 }],
  ['a.graphql', '"""Doc."""\n# note\ntype A { id: ID }', { comments: 2, code: 1 }],
  ['a.f90', '! note\nprogram a', { comments: 1, code: 1 }],
  ['a.vb', "' note\nDim a = 1", { comments: 1, code: 1 }],
  ['a.bat', 'REM note\n:: note\necho hi', { comments: 2, code: 1 }],
  ['a.vim', '" note\nset number', { comments: 1, code: 1 }],
  ['Dockerfile', '# note\nFROM node', { comments: 1, code: 1 }],
  ['Makefile', '# note\nall:', { comments: 1, code: 1 }],
  ['.env.local', '# note\nA=1', { comments: 1, code: 1 }],
]

describe('comments', () => {
  test('are told apart per language', async () => {
    for (const [path, source, expected] of COMMENTED) {
      expect({ path, ...counted(path, source) }).toEqual({ path, ...expected })
    }
  })
})

describe('markedGenerated', () => {
  test('reads git check-attr -z output', async () => {
    const output = [
      'schema.ts', 'linguist-generated', 'set',
      'api/client.ts', 'linguist-generated', 'true',
      'legacy.ts', 'linguist-generated', 'unset',
      'third/lib.js', 'linguist-vendored', 'set',
      'main.ts', 'linguist-generated', 'unspecified',
      '',
    ].join('\0')

    expect([...markedGenerated(output)].sort()).toEqual(['api/client.ts', 'schema.ts', 'third/lib.js'])
  })
})
