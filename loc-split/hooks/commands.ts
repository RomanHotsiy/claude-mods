import { GENERATED_PATHSPECS, PATHSPECS } from './split'

export const BASES = ['origin/main', 'main', 'origin/master', 'master']
export const SHOWN_COMMITS = 50

const DIFF = ['-U0', '-M', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/']
const NUMSTAT = ['--numstat', '--no-renames', '--no-color', '--no-ext-diff']

export const gitArgv = (args: readonly string[]) => ['git', '-c', 'core.quotePath=false', ...args]

/** Every git run one measurement makes once the merge base is known, by name. */
export const measureCommands = (mergeBase: string) => {
  const range = `${mergeBase}..HEAD`
  const recent = ['--no-merges', `--max-count=${SHOWN_COMMITS}`]

  return {
    listed: ['log', ...recent, '--format=%H%x1f%s', range],
    patched: ['log', ...recent, '-p', ...DIFF, '--format=%x00%H%x1f%s', range, '--', ...PATHSPECS],
    generated: ['log', ...recent, ...NUMSTAT, '--format=%x00%H', range, '--', ...GENERATED_PATHSPECS],
    counted: ['rev-list', '--no-merges', '--count', range],
    dirty: ['diff', ...DIFF, 'HEAD', '--', ...PATHSPECS],
    dirtyGenerated: ['diff', ...NUMSTAT, 'HEAD', '--', ...GENERATED_PATHSPECS],
    net: ['diff', ...DIFF, mergeBase, '--', ...PATHSPECS],
    netGenerated: ['diff', ...NUMSTAT, mergeBase, '--', ...GENERATED_PATHSPECS],
    others: ['ls-files', '--others', '--exclude-standard', '-z'],
  } as const
}
