export type LocCount = { added: number; removed: number }

export type LocSplit = {
  code: LocCount
  comments: LocCount
  tests: LocCount
  docs: LocCount
  /** Lockfiles, snapshots, codegen output: counted by `--numstat`, never split. */
  gen: LocCount
}

export type LocCommit = { sha: string; subject: string; split: LocSplit }

export type LocReport = {
  /** The ref the branch is measured against, as resolved (`origin/main`). */
  base: string
  mergeBase: string
  /** Newest first, at most the ones the expanded list holds. */
  commits: LocCommit[]
  commitCount: number
  uncommitted: LocSplit
  /** Working tree (untracked files included) against the merge base. */
  net: LocSplit
  isPartial: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'loc-split': { report: LocReport | null; isExpanded: boolean; scroll: number }
  }
}
