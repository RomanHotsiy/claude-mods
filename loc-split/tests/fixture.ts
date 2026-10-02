// git output recorded from a scratch repository: main plus three commits, one uncommitted edit, one untracked file.
export const ROOT = "/tmp/loc-split-fixture"
export const RUNS: Record<string, { exitCode: number; stdout: string; stderr: string; isStdoutTruncated: boolean; isStderrTruncated: boolean }> = {
 "git rev-parse --show-toplevel": {
  "exitCode": 0,
  "stdout": "/tmp/loc-split-fixture\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git symbolic-ref --quiet --short refs/remotes/origin/HEAD": {
  "exitCode": 1,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git rev-parse --verify --quiet origin/main^{commit}": {
  "exitCode": 1,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git rev-parse --verify --quiet main^{commit}": {
  "exitCode": 0,
  "stdout": "388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git rev-parse --verify --quiet origin/master^{commit}": {
  "exitCode": 1,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git rev-parse --verify --quiet master^{commit}": {
  "exitCode": 1,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git merge-base HEAD origin/main": {
  "exitCode": 128,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git merge-base HEAD main": {
  "exitCode": 0,
  "stdout": "388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git merge-base HEAD origin/master": {
  "exitCode": 128,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git merge-base HEAD master": {
  "exitCode": 128,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false log --no-merges --max-count=50 --format=%H%x1f%s 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd..HEAD": {
  "exitCode": 0,
  "stdout": "7b89a43ff39b0f1ff37f451ac1132d3309f202b3\u001fDocs tweak\naf096eda6d349bf2a2373672b8ea2c1096a8f1bb\u001fTests, docs, sql\nbe0b0d02de32332da32566c33c71bbeffde6aad9\u001fAdd b.ts and c.py\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false log --no-merges --max-count=50 -p -U0 -M --no-color --no-ext-diff --src-prefix=a/ --dst-prefix=b/ --format=%x00%H%x1f%s 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd..HEAD -- :/ :(top,exclude,glob)**/package-lock.json :(top,exclude,glob)**/npm-shrinkwrap.json :(top,exclude,glob)**/yarn.lock :(top,exclude,glob)**/pnpm-lock.yaml :(top,exclude,glob)**/bun.lock :(top,exclude,glob)**/bun.lockb :(top,exclude,glob)**/deno.lock :(top,exclude,glob)**/Cargo.lock :(top,exclude,glob)**/poetry.lock :(top,exclude,glob)**/Pipfile.lock :(top,exclude,glob)**/uv.lock :(top,exclude,glob)**/Gemfile.lock :(top,exclude,glob)**/composer.lock :(top,exclude,glob)**/go.sum :(top,exclude,glob)**/flake.lock :(top,exclude,glob)**/Package.resolved :(top,exclude,glob)**/mix.lock :(top,exclude,glob)**/pubspec.lock :(top,exclude,glob)**/gradle.lockfile :(top,exclude,glob)**/packages.lock.json :(top,exclude,glob)**/.terraform.lock.hcl :(top,exclude,glob)**/meta/*_snapshot.json :(top,exclude,glob)**/meta/_journal.json :(top,exclude,glob)**/*.snap :(top,exclude,glob)**/__snapshots__/** :(top,exclude,glob)**/__generated__/** :(top,exclude,glob)**/*.gen.* :(top,exclude,glob)**/*.generated.* :(top,exclude,glob)**/*.pb.go :(top,exclude,glob)**/*_pb2.py :(top,exclude,glob)**/*_pb2_grpc.py :(top,exclude,glob)**/*.g.dart :(top,exclude,glob)**/*.freezed.dart :(top,exclude,glob)**/*.min.js :(top,exclude,glob)**/*.min.css :(top,exclude,glob)**/*.js.map :(top,exclude,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "\u00007b89a43ff39b0f1ff37f451ac1132d3309f202b3\u001fDocs tweak\n\ndiff --git a/docs/guide.md b/docs/guide.md\nindex 4653a22..50fc89b 100644\n--- a/docs/guide.md\n+++ b/docs/guide.md\n@@ -2,0 +3 @@ Docs line 2\n+Docs line 3\n\u0000af096eda6d349bf2a2373672b8ea2c1096a8f1bb\u001fTests, docs, sql\n\ndiff --git a/db/q.sql b/db/q.sql\nindex 4f26a2a..e7f8100 100644\n--- a/db/q.sql\n+++ b/db/q.sql\n@@ -1,2 +1 @@\n--- old comment\n-SELECT 1;\n+SELECT 2;\ndiff --git a/docs/guide.md b/docs/guide.md\nnew file mode 100644\nindex 0000000..4653a22\n--- /dev/null\n+++ b/docs/guide.md\n@@ -0,0 +1,2 @@\n+Docs line 1\n+Docs line 2\ndiff --git a/tests/b.test.ts b/tests/b.test.ts\nnew file mode 100644\nindex 0000000..a62d009\n--- /dev/null\n+++ b/tests/b.test.ts\n@@ -0,0 +1,2 @@\n+test(\"x\", () => {})\n+// t\n\u0000be0b0d02de32332da32566c33c71bbeffde6aad9\u001fAdd b.ts and c.py\n\ndiff --git a/src/b.ts b/src/b.ts\nnew file mode 100644\nindex 0000000..9fff204\n--- /dev/null\n+++ b/src/b.ts\n@@ -0,0 +1,7 @@\n+/**\n+ * Adds things.\n+ */\n+export function add(x: number, y: number) {\n+  // sum\n+  return x + y\n+}\ndiff --git a/src/c.py b/src/c.py\nnew file mode 100644\nindex 0000000..528bb3d\n--- /dev/null\n+++ b/src/c.py\n@@ -0,0 +1,6 @@\n+\"\"\"Module doc\n+second line\n+\"\"\"\n+# comment\n+x = 1\n+y = 2\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false log --no-merges --max-count=50 --numstat --no-renames --no-color --no-ext-diff --format=%x00%H 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd..HEAD -- :(top,glob)**/package-lock.json :(top,glob)**/npm-shrinkwrap.json :(top,glob)**/yarn.lock :(top,glob)**/pnpm-lock.yaml :(top,glob)**/bun.lock :(top,glob)**/bun.lockb :(top,glob)**/deno.lock :(top,glob)**/Cargo.lock :(top,glob)**/poetry.lock :(top,glob)**/Pipfile.lock :(top,glob)**/uv.lock :(top,glob)**/Gemfile.lock :(top,glob)**/composer.lock :(top,glob)**/go.sum :(top,glob)**/flake.lock :(top,glob)**/Package.resolved :(top,glob)**/mix.lock :(top,glob)**/pubspec.lock :(top,glob)**/gradle.lockfile :(top,glob)**/packages.lock.json :(top,glob)**/.terraform.lock.hcl :(top,glob)**/meta/*_snapshot.json :(top,glob)**/meta/_journal.json :(top,glob)**/*.snap :(top,glob)**/__snapshots__/** :(top,glob)**/__generated__/** :(top,glob)**/*.gen.* :(top,glob)**/*.generated.* :(top,glob)**/*.pb.go :(top,glob)**/*_pb2.py :(top,glob)**/*_pb2_grpc.py :(top,glob)**/*.g.dart :(top,glob)**/*.freezed.dart :(top,glob)**/*.min.js :(top,glob)**/*.min.css :(top,glob)**/*.js.map :(top,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "\u0000af096eda6d349bf2a2373672b8ea2c1096a8f1bb\n\n1\t0\tpackage-lock.json\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false rev-list --no-merges --count 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd..HEAD": {
  "exitCode": 0,
  "stdout": "3\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false diff -U0 -M --no-color --no-ext-diff --src-prefix=a/ --dst-prefix=b/ HEAD -- :/ :(top,exclude,glob)**/package-lock.json :(top,exclude,glob)**/npm-shrinkwrap.json :(top,exclude,glob)**/yarn.lock :(top,exclude,glob)**/pnpm-lock.yaml :(top,exclude,glob)**/bun.lock :(top,exclude,glob)**/bun.lockb :(top,exclude,glob)**/deno.lock :(top,exclude,glob)**/Cargo.lock :(top,exclude,glob)**/poetry.lock :(top,exclude,glob)**/Pipfile.lock :(top,exclude,glob)**/uv.lock :(top,exclude,glob)**/Gemfile.lock :(top,exclude,glob)**/composer.lock :(top,exclude,glob)**/go.sum :(top,exclude,glob)**/flake.lock :(top,exclude,glob)**/Package.resolved :(top,exclude,glob)**/mix.lock :(top,exclude,glob)**/pubspec.lock :(top,exclude,glob)**/gradle.lockfile :(top,exclude,glob)**/packages.lock.json :(top,exclude,glob)**/.terraform.lock.hcl :(top,exclude,glob)**/meta/*_snapshot.json :(top,exclude,glob)**/meta/_journal.json :(top,exclude,glob)**/*.snap :(top,exclude,glob)**/__snapshots__/** :(top,exclude,glob)**/__generated__/** :(top,exclude,glob)**/*.gen.* :(top,exclude,glob)**/*.generated.* :(top,exclude,glob)**/*.pb.go :(top,exclude,glob)**/*_pb2.py :(top,exclude,glob)**/*_pb2_grpc.py :(top,exclude,glob)**/*.g.dart :(top,exclude,glob)**/*.freezed.dart :(top,exclude,glob)**/*.min.js :(top,exclude,glob)**/*.min.css :(top,exclude,glob)**/*.js.map :(top,exclude,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "diff --git a/src/a.ts b/src/a.ts\nindex 4171549..0d08db7 100644\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1,2 @@\n-export const a = 1\n+export const a = 2\n+// note\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false diff --numstat --no-renames --no-color --no-ext-diff HEAD -- :(top,glob)**/package-lock.json :(top,glob)**/npm-shrinkwrap.json :(top,glob)**/yarn.lock :(top,glob)**/pnpm-lock.yaml :(top,glob)**/bun.lock :(top,glob)**/bun.lockb :(top,glob)**/deno.lock :(top,glob)**/Cargo.lock :(top,glob)**/poetry.lock :(top,glob)**/Pipfile.lock :(top,glob)**/uv.lock :(top,glob)**/Gemfile.lock :(top,glob)**/composer.lock :(top,glob)**/go.sum :(top,glob)**/flake.lock :(top,glob)**/Package.resolved :(top,glob)**/mix.lock :(top,glob)**/pubspec.lock :(top,glob)**/gradle.lockfile :(top,glob)**/packages.lock.json :(top,glob)**/.terraform.lock.hcl :(top,glob)**/meta/*_snapshot.json :(top,glob)**/meta/_journal.json :(top,glob)**/*.snap :(top,glob)**/__snapshots__/** :(top,glob)**/__generated__/** :(top,glob)**/*.gen.* :(top,glob)**/*.generated.* :(top,glob)**/*.pb.go :(top,glob)**/*_pb2.py :(top,glob)**/*_pb2_grpc.py :(top,glob)**/*.g.dart :(top,glob)**/*.freezed.dart :(top,glob)**/*.min.js :(top,glob)**/*.min.css :(top,glob)**/*.js.map :(top,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false diff -U0 -M --no-color --no-ext-diff --src-prefix=a/ --dst-prefix=b/ 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd -- :/ :(top,exclude,glob)**/package-lock.json :(top,exclude,glob)**/npm-shrinkwrap.json :(top,exclude,glob)**/yarn.lock :(top,exclude,glob)**/pnpm-lock.yaml :(top,exclude,glob)**/bun.lock :(top,exclude,glob)**/bun.lockb :(top,exclude,glob)**/deno.lock :(top,exclude,glob)**/Cargo.lock :(top,exclude,glob)**/poetry.lock :(top,exclude,glob)**/Pipfile.lock :(top,exclude,glob)**/uv.lock :(top,exclude,glob)**/Gemfile.lock :(top,exclude,glob)**/composer.lock :(top,exclude,glob)**/go.sum :(top,exclude,glob)**/flake.lock :(top,exclude,glob)**/Package.resolved :(top,exclude,glob)**/mix.lock :(top,exclude,glob)**/pubspec.lock :(top,exclude,glob)**/gradle.lockfile :(top,exclude,glob)**/packages.lock.json :(top,exclude,glob)**/.terraform.lock.hcl :(top,exclude,glob)**/meta/*_snapshot.json :(top,exclude,glob)**/meta/_journal.json :(top,exclude,glob)**/*.snap :(top,exclude,glob)**/__snapshots__/** :(top,exclude,glob)**/__generated__/** :(top,exclude,glob)**/*.gen.* :(top,exclude,glob)**/*.generated.* :(top,exclude,glob)**/*.pb.go :(top,exclude,glob)**/*_pb2.py :(top,exclude,glob)**/*_pb2_grpc.py :(top,exclude,glob)**/*.g.dart :(top,exclude,glob)**/*.freezed.dart :(top,exclude,glob)**/*.min.js :(top,exclude,glob)**/*.min.css :(top,exclude,glob)**/*.js.map :(top,exclude,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "diff --git a/db/q.sql b/db/q.sql\nindex 4f26a2a..e7f8100 100644\n--- a/db/q.sql\n+++ b/db/q.sql\n@@ -1,2 +1 @@\n--- old comment\n-SELECT 1;\n+SELECT 2;\ndiff --git a/docs/guide.md b/docs/guide.md\nnew file mode 100644\nindex 0000000..50fc89b\n--- /dev/null\n+++ b/docs/guide.md\n@@ -0,0 +1,3 @@\n+Docs line 1\n+Docs line 2\n+Docs line 3\ndiff --git a/src/a.ts b/src/a.ts\nindex 4171549..0d08db7 100644\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1,2 @@\n-export const a = 1\n+export const a = 2\n+// note\ndiff --git a/src/b.ts b/src/b.ts\nnew file mode 100644\nindex 0000000..9fff204\n--- /dev/null\n+++ b/src/b.ts\n@@ -0,0 +1,7 @@\n+/**\n+ * Adds things.\n+ */\n+export function add(x: number, y: number) {\n+  // sum\n+  return x + y\n+}\ndiff --git a/src/c.py b/src/c.py\nnew file mode 100644\nindex 0000000..528bb3d\n--- /dev/null\n+++ b/src/c.py\n@@ -0,0 +1,6 @@\n+\"\"\"Module doc\n+second line\n+\"\"\"\n+# comment\n+x = 1\n+y = 2\ndiff --git a/tests/b.test.ts b/tests/b.test.ts\nnew file mode 100644\nindex 0000000..a62d009\n--- /dev/null\n+++ b/tests/b.test.ts\n@@ -0,0 +1,2 @@\n+test(\"x\", () => {})\n+// t\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false diff --numstat --no-renames --no-color --no-ext-diff 388bf7b692fff3e23c6c0fc94c30dc5f7a16ffbd -- :(top,glob)**/package-lock.json :(top,glob)**/npm-shrinkwrap.json :(top,glob)**/yarn.lock :(top,glob)**/pnpm-lock.yaml :(top,glob)**/bun.lock :(top,glob)**/bun.lockb :(top,glob)**/deno.lock :(top,glob)**/Cargo.lock :(top,glob)**/poetry.lock :(top,glob)**/Pipfile.lock :(top,glob)**/uv.lock :(top,glob)**/Gemfile.lock :(top,glob)**/composer.lock :(top,glob)**/go.sum :(top,glob)**/flake.lock :(top,glob)**/Package.resolved :(top,glob)**/mix.lock :(top,glob)**/pubspec.lock :(top,glob)**/gradle.lockfile :(top,glob)**/packages.lock.json :(top,glob)**/.terraform.lock.hcl :(top,glob)**/meta/*_snapshot.json :(top,glob)**/meta/_journal.json :(top,glob)**/*.snap :(top,glob)**/__snapshots__/** :(top,glob)**/__generated__/** :(top,glob)**/*.gen.* :(top,glob)**/*.generated.* :(top,glob)**/*.pb.go :(top,glob)**/*_pb2.py :(top,glob)**/*_pb2_grpc.py :(top,glob)**/*.g.dart :(top,glob)**/*.freezed.dart :(top,glob)**/*.min.js :(top,glob)**/*.min.css :(top,glob)**/*.js.map :(top,glob)**/*.css.map": {
  "exitCode": 0,
  "stdout": "1\t0\tpackage-lock.json\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false ls-files --others --exclude-standard -z": {
  "exitCode": 0,
  "stdout": "src/new.sh\u0000",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 },
 "git -c core.quotePath=false branch --show-current": {
  "exitCode": 0,
  "stdout": "feature\n",
  "stderr": "",
  "isStdoutTruncated": false,
  "isStderrTruncated": false
 }
}
export const FILES: Record<string, string> = {"/tmp/loc-split-fixture/src/new.sh":"line1\nline2\n# c\n"}
