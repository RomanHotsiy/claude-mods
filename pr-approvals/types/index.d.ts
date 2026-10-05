export type PrDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED'

export type PrReview = {
  url: string
  /** `owner/name`. */
  repo: string
  number: number
  title: string
  state: 'OPEN' | 'MERGED' | 'CLOSED'
  isDraft: boolean
  /** GitHub's review decision; null where the base branch requires no review. */
  decision: PrDecision | null
  /** Reviewers whose latest review approves. */
  approvedBy: string[]
  /** Reviewers whose latest review requests changes. */
  changesBy: string[]
  /** Review requests still open: people and teams asked who have not reviewed since. */
  waitingOn: string[]
  /** Approvals the base branch's rules require; null when they could not be read. */
  required: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'pr-approvals': {
      /** PR URLs linked to the session (opened or bound here, or added by hand), oldest first. */
      linked: string[]
      /** The current branch's PR first, then the linked ones. */
      prs: PrReview[]
    }
  }
}
