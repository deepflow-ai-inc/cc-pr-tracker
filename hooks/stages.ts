// Our pipeline's stages, for the repos that run it: each check falls in the first stage whose rule
// matches its workflow and name, and the row shows one mark per stage in place of the counts.
import type { Check } from '../types'

export type StageState = 'pass' | 'fail' | 'pending' | 'none'
type Rule = { stage: string; match: (workflow: string, name: string) => boolean }

// deepflow: E2E runs on the PR's preview after it is built and deployed; the preview workflow's
// other jobs (build, deploy, wake-lock, teardown) are the preview stage; everything else is checks
const DEEPFLOW: Rule[] = [
  { stage: 'unit', match: (_w, n) => /unit tests?/i.test(n) },
  { stage: 'e2e', match: (_w, n) => /\be2e\b/i.test(n) },
  { stage: 'preview', match: w => w === 'preview' },
  { stage: 'checks', match: () => true },
]
// the old name still redirects, so a PR URL may carry either
const PIPELINES: [RegExp, Rule[]][] = [[/^(deepflow-ai-inc\/deepflow|ai8-io\/fractal-os)$/i, DEEPFLOW]]

// a check's key is its lineage: typename, app slug, workflow name, event, name (REST has no workflow)
const workflowOf = (c: Check) => c.key.split('\u0000')[2] ?? ''

// failing beats running beats passed; a stage of only skipped checks, or none, has not run
export function stagesFor(repo: string, checks: Check[]): { stage: string; state: StageState }[] | undefined {
  const rules = PIPELINES.find(([re]) => re.test(repo))?.[1]
  if (!rules) return
  const by = new Map<string, Check[]>(rules.map(r => [r.stage, []]))
  for (const c of checks) by.get(rules.find(r => r.match(workflowOf(c), c.name))?.stage ?? 'checks')?.push(c)
  // shown in pipeline order, not rule order
  return ['checks', 'unit', 'preview', 'e2e'].filter(s => by.has(s)).map(stage => {
    const cs = by.get(stage) ?? []
    const state: StageState = cs.some(c => c.bucket === 'fail' || c.bucket === 'cancel') ? 'fail'
      : cs.some(c => c.bucket === 'pending') ? 'pending'
      : cs.some(c => c.bucket === 'pass') ? 'pass' : 'none'
    return { stage, state }
  })
}

export const STAGE_ICON: Record<StageState, [string, string]> = { pass: ['✓', 'green'], fail: ['✗', 'red'], pending: ['●', 'yellow'], none: ['–', 'gray'] }
