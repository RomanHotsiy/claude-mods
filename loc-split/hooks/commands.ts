import { GENERATED_ATTRIBUTES, generatedPathspecs, pathspecs } from './split'

export const BASES = ['origin/main', 'main', 'origin/master', 'master']
export const SHOWN_COMMITS = 50

const DIFF = ['-U0', '-M', '--no-color', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/']
const NUMSTAT = ['--numstat', '--no-renames', '--no-color', '--no-ext-diff']

export const gitArgv = (args: readonly string[]) => ['git', '-c', 'core.quotePath=false', ...args]

/**
 * Whether this git takes `.gitattributes` pathspecs in diff and log: exit 0
 * or 1 (no difference, or some), never the 128 of a pathspec it refuses.
 */
export const ATTRIBUTE_PROBE = ['diff', '--quiet', 'HEAD', '--', `:(top,attr:${GENERATED_ATTRIBUTES[0]})`]

/** The untracked paths `.gitattributes` marks generated or vendored; the paths go in on stdin. */
export const CHECK_ATTRIBUTES = ['check-attr', '-z', '--stdin', ...GENERATED_ATTRIBUTES]

/** Every git run one measurement makes once the merge base is known, by name. */
export const measureCommands = (mergeBase: string, withAttributes: boolean) => {
  const range = `${mergeBase}..HEAD`
  const recent = ['--no-merges', `--max-count=${SHOWN_COMMITS}`]
  const authored = pathspecs(withAttributes)
  const generated = generatedPathspecs(withAttributes)

  return {
    listed: ['log', ...recent, '--format=%H%x1f%s', range],
    patched: ['log', ...recent, '-p', ...DIFF, '--format=%x00%H%x1f%s', range, '--', ...authored],
    generated: ['log', ...recent, ...NUMSTAT, '--format=%x00%H', range, '--', ...generated],
    counted: ['rev-list', '--no-merges', '--count', range],
    dirty: ['diff', ...DIFF, 'HEAD', '--', ...authored],
    dirtyGenerated: ['diff', ...NUMSTAT, 'HEAD', '--', ...generated],
    net: ['diff', ...DIFF, mergeBase, '--', ...authored],
    netGenerated: ['diff', ...NUMSTAT, mergeBase, '--', ...generated],
    others: ['ls-files', '--others', '--exclude-standard', '-z'],
  } as const
}
