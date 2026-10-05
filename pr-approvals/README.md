# pr-approvals

A [Claude Code mod](https://claude.dev/blog/getting-started-with-claude-code-mods/) that shows where your session's pull requests stand in review: a small chip at the right of the prompt footer, and a details dialog when you click it.

```
• #28642 · 1 pending                  one PR, waiting on review
• #28707 approved · 2 pending         one PR, approved
• PRs 1/3 approved · 4 pending        several
```

The dot is green when every open PR is approved, red when any has changes requested, orange while reviews are still asked for, and violet once they are all merged. `pending` counts the review requests still open: people and teams asked who have not reviewed since. A PR still waiting on review shows just its orange dot and pending count; the details say how many approvals it still needs, counted against what the base branch's rules require.

Click the chip (or type `/pr-approvals`) to open the details: for each PR, its status and approvals against what is required, its title, and who approved, who asked for changes and whose review is pending. Click a PR's number to open it on GitHub; `r` refreshes, Escape closes.

```
#28707 · ✓ approved · 1/1 approvals
Localize navigation on translated pages
approved: jlekawa
pending: Lightsabers, Staff engineers
```

Where a repository's rules require no reviews, a PR counts as approved once someone approves it.

## Which PRs it shows

- the current branch's PR, whatever `gh pr view` finds for it;
- a PR Claude opens in the session with `gh pr create`;
- a PR Claude links to the session with the desktop app's `bind_pr` tool, or the one its `get_status` tool reports for this session;
- the same, from earlier in the session: when the session starts (a new one, or a resumed one after you installed the mod) it looks for those calls in the session's transcript;
- a PR you add with `/pr-approvals add <PR URL>`.

`/pr-approvals` refreshes and opens or closes the details; `/pr-approvals remove <PR URL or #number>` and `/pr-approvals clear` drop linked PRs. The current branch's PR always shows while it exists.

Claude Code mods can't draw into the desktop app's own PR chips in the session header, so the chip sits in the prompt footer instead, after the mode labels (`focus`, `memory paused`) the footer already shows.

## When it refreshes

When the session starts, at the end of every turn, right after a PR is linked, a moment after Claude runs `gh pr`, `git push`, `git checkout` or `git switch`, and every 5 minutes, so reviews that land while you are away show up; press `r` in the details or type `/pr-approvals` to refresh sooner. Each refresh is a few `gh` calls per PR.

## Install

### Claude desktop app

1. Open **Settings**.
2. Type `plugins` and press Enter.
3. In the top right corner, click **Add**.
4. Enter `RomanHotsiy/claude-mods` and click **Sync**.
5. You should now see **Pr approvals** in the list.

### Claude Code in a terminal

```
/plugin marketplace add RomanHotsiy/claude-mods
/plugin install pr-approvals@claude-mods
/reload-plugins
```

It needs the [GitHub CLI](https://cli.github.com) installed and signed in (`gh auth login`).

## What it runs, reads and sends

A mod is code that runs inside Claude Code on your machine, with the same access Claude Code has; read the source before you install one. This one is four files under [`hooks/`](hooks): `register.ts` (the hooks, and every call it makes), `draw.tsx` (the chip and the details), `github.ts` (the `gh` command lines and parsing their output) and `links.ts` (which tool calls link a PR, live or in the transcript).

**Sends: requests to GitHub, through `gh`.** It reads PRs and branch rules with your `gh` login, and nothing else leaves your machine. The model sees nothing from it apart from the one line `/pr-approvals` prints when it has no PR to show or you typed it wrong. It writes no files: what it reads is kept in the session's memory and drawn in the footer and the details.

**Runs: `gh`, read-only.** Every call is in one function, `refresh` in [`hooks/register.ts`](hooks/register.ts):

| Command | Why |
| --- | --- |
| `gh pr view --json … --jq …` | the current branch's PR |
| `gh pr view <url> --json … --jq …` | each linked PR: state, draft, review decision, each reviewer's latest review state, open review requests, base branch |
| `gh api repos/<owner>/<repo>/rules/branches/<base> --jq …` | approvals the repository's rulesets require on the base branch |
| `gh api repos/<owner>/<repo>/branches/<base>/protection/required_pull_request_reviews --jq …` | approvals classic branch protection requires; this needs admin rights, so it often fails and the rulesets answer alone |
| `grep -E 'gh pr create\|__bind_pr\|__get_status' <transcript>` and `grep -F -e <tool-use id> … <transcript>` | once, when the session starts: the PR-linking calls in the session's own transcript, then their results (in `replay`) |

The `--jq` filters keep only names and states, so review comments never reach the mod. Each branch's required approvals are read once every 30 minutes.

**Reads from the conversation:** only to spot a linked PR. After a `Bash` call whose command runs `gh pr create`, it takes the PR URLs from the output; after a `bind_pr` call, the URL Claude passed; after a `get_status` call for this session, the PR it reports. When the session starts it finds the same calls in the session's transcript with the two `grep` runs above, so it sees only those lines and their results. It reads no prompts or replies.

**Hooks:**

| Event | What it does |
| --- | --- |
| `session.start` | registers `/pr-approvals`, reads once, and starts a 5-minute refresh timer |
| `classic.SessionStart` | replays the session's transcript for PRs linked before the mod was loaded |
| `tool.call` | lets every tool call through unchanged; after one finishes it may link a PR (above) or schedule a refresh. It never changes the call's input or result |
| `turn.complete` | schedules a refresh |
| `command.run` for `/pr-approvals` | refreshes and opens or closes the details, or adds, removes or clears linked PRs |
| `ui.render` for `SessionMode` | draws the footer's mode labels as the engine does, then the chip; with no PR it leaves the footer alone |
| `ui.render` for its own `Pane` | draws the details dialog |

## Develop

```
claude --plugin-dir ./pr-approvals
claude plugin validate ./pr-approvals
claude plugin test ./pr-approvals
```

`tests/pr-approvals.test.tsx` holds `gh` output recorded from two real PRs, renamed, so the test runs without GitHub.
