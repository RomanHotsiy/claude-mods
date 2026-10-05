import type { PrDecision, PrReview } from '../types'

/**
 * The `gh` command lines and the parsing of what they print. Pure: no `$`
 * here; `register.ts` runs the commands.
 */

const PR_URL = /https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/g

/** Every PR URL in the text, normalized and once each, in the order they appear. */
export const prUrlsIn = (text: string): string[] => {
  const urls = [...text.matchAll(PR_URL)].map(([, repo, number]) => `https://github.com/${repo}/pull/${number}`)

  return [...new Set(urls)]
}

const FIELDS = 'number,title,url,state,isDraft,reviewDecision,latestReviews,reviewRequests,baseRefName'
// Only what the chip needs, so review bodies never cross the process boundary.
const SHAPE =
  '{number,title,url,state,isDraft,reviewDecision,base:.baseRefName,reviews:[.latestReviews[] | {who:.author.login,state}],requested:[.reviewRequests[] | (.login // .name // .slug)]}'

/** `gh pr view` of one PR, or, with no target, of the current branch's PR. */
export const viewArgv = (target?: string) => ['gh', 'pr', 'view', ...(target === undefined ? [] : [target]), '--json', FIELDS, '--jq', SHAPE]

/** The approvals the repository's rulesets require on a branch; prints nothing when none do. */
export const rulesArgv = (repo: string, base: string) => [
  'gh',
  'api',
  `repos/${repo}/rules/branches/${base}`,
  '--jq',
  '[.[] | select(.type == "pull_request") | .parameters.required_approving_review_count] | max // empty',
]

/** The approvals classic branch protection requires; reading it takes admin rights, so it often fails. */
export const protectionArgv = (repo: string, base: string) => [
  'gh',
  'api',
  `repos/${repo}/branches/${base}/protection/required_pull_request_reviews`,
  '--jq',
  '.required_approving_review_count // empty',
]

export type PrView = Omit<PrReview, 'required'> & { base: string }

const DECISIONS: readonly string[] = ['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED'] satisfies PrDecision[]
const STATES: readonly string[] = ['OPEN', 'MERGED', 'CLOSED'] satisfies PrReview['state'][]

/** What `viewArgv` printed, or null when it is not a PR. */
export const parseView = (stdout: string): PrView | null => {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(stdout) as Record<string, unknown>
  } catch {
    return null
  }
  if (raw === null || typeof raw !== 'object' || typeof raw.url !== 'string' || typeof raw.number !== 'number') return null
  const repo = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\//.exec(raw.url)?.[1]
  if (repo === undefined) return null
  const reviews = (Array.isArray(raw.reviews) ? raw.reviews : []).filter(
    (review): review is { who: string; state: string } =>
      review !== null && typeof review === 'object' && typeof review.who === 'string' && typeof review.state === 'string',
  )
  const byState = (state: string) => reviews.filter(review => review.state === state).map(review => review.who)
  const decision = typeof raw.reviewDecision === 'string' && DECISIONS.includes(raw.reviewDecision) ? raw.reviewDecision : null
  const state = typeof raw.state === 'string' && STATES.includes(raw.state) ? raw.state : 'OPEN'

  return {
    url: raw.url,
    repo,
    number: raw.number,
    title: typeof raw.title === 'string' ? raw.title : '',
    state: state as PrReview['state'],
    isDraft: raw.isDraft === true,
    decision: decision as PrDecision | null,
    approvedBy: byState('APPROVED'),
    changesBy: byState('CHANGES_REQUESTED'),
    waitingOn: Array.isArray(raw.requested) ? raw.requested.filter((name): name is string => typeof name === 'string') : [],
    base: typeof raw.base === 'string' ? raw.base : '',
  }
}

/** A count `rulesArgv` or `protectionArgv` printed, or null for nothing or a failure. */
export const parseCount = (run: { exitCode: number; stdout: string }): number | null => {
  if (run.exitCode !== 0) return null
  const count = Number.parseInt(run.stdout.trim(), 10)

  return Number.isFinite(count) ? count : null
}

export type Verdict = 'approved' | 'changes' | 'waiting' | 'merged' | 'closed'

/** Where the PR stands, GitHub's decision first; without one, the reviews themselves. */
export const verdictOf = (pr: PrReview): Verdict => {
  if (pr.state === 'MERGED') return 'merged'
  if (pr.state === 'CLOSED') return 'closed'
  if (pr.decision === 'CHANGES_REQUESTED' || (pr.decision === null && pr.changesBy.length > 0)) return 'changes'
  if (pr.decision === 'APPROVED' || (pr.decision === null && pr.approvedBy.length > 0)) return 'approved'

  return 'waiting'
}
