import { expect, test } from 'claude-code/testing'
import { stagesFor } from './hooks/stages'

// a check as the poll keys it: typename, app slug, workflow name, event, name
const c = (workflow: string, name: string, bucket: string) => ({ key: ['CheckRun', 'github-actions', workflow, 'pull_request', name].join('\u0000'), name, bucket, link: '' })
const show = (repo: string, checks: ReturnType<typeof c>[]) => stagesFor(repo, checks)?.map(s => `${s.stage} ${s.state}`)

test('stagesFor: deepflow checks fall into checks, unit, preview and e2e, in pipeline order', () => {
  expect(show('deepflow-ai-inc/deepflow', [
    c('e2e', 'apple-e2e', 'skipping'),
    c('preview', 'e2e / E2E Tests', 'pending'),
    c('preview', 'deploy', 'pass'),
    c('DeepFlow FastAPI Server Unit Tests', 'DeepFlow FastAPI Server / Unit tests', 'pass'),
    c('Deepflow ML Unit Tests', 'Deepflow ML / Unit tests', 'fail'),
    c('pr-checks', 'pr-checks', 'pass'),
  ])).toEqual(['checks pass', 'unit fail', 'preview pass', 'e2e pending'])
})

test('stagesFor: a stage with only skipped checks, or none, has not run', () => {
  expect(show('ai8-io/fractal-os', [c('pr-checks', 'pr-checks', 'pending'), c('preview', 'e2e', 'skipping')]))
    .toEqual(['checks pending', 'unit none', 'preview none', 'e2e none'])
})

test('stagesFor: other repos keep the plain counts', () => {
  expect(stagesFor('org/repo', [c('ci', 'lint', 'pass')])).toBeUndefined()
})
