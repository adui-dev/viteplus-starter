import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVpCommand, validateProjectOptions } from '../src/options.mjs'

test('Application 委托 Vite+ 官方应用模板', () => {
  const result = buildVpCommand({ name: 'my-app', type: 'application' })
  assert.equal(result.command, 'vp')
  assert.deepEqual(result.args, [
    'create', 'vite:application', '--directory', 'my-app',
    '--package-manager', 'pnpm', '--git',
  ])
})

test('Monorepo 委托 Vite+ 官方工作区模板', () => {
  const result = buildVpCommand({ name: 'my-workspace', type: 'monorepo' })
  assert.equal(result.args[1], 'vite:monorepo')
})

test('拒绝目录遍历和无效项目类型', () => {
  for (const name of ['../danger', 'Bad Name', 'a--b', '.hidden', '']) {
    assert.throws(() => validateProjectOptions({ name, type: 'application' }))
  }
  assert.throws(() => validateProjectOptions({ name: 'valid', type: 'other' }))
})
