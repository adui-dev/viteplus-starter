import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVpCommand, validateProjectOptions } from '../src/options.mjs'

test('Vue Application 使用官方 vite:application 和 vue-ts', () => {
  const result = buildVpCommand({ name: 'my-vue-app', type: 'application', framework: 'vue' })
  assert.equal(result.command, 'vp')
  assert.deepEqual(result.args, [
    'create', 'vite:application', '--directory', 'my-vue-app',
    '--package-manager', 'pnpm', '--git', '--', '--template', 'vue-ts',
  ])
})

test('React Application 使用官方 react-ts 模板', () => {
  const result = buildVpCommand({ name: 'my-react-app', type: 'application', framework: 'react' })
  assert.deepEqual(result.args.slice(-3), ['--', '--template', 'react-ts'])
})

test('Monorepo 仅生成官方工作区，不指定单一框架', () => {
  const result = buildVpCommand({ name: 'my-workspace', type: 'monorepo' })
  assert.equal(result.args[1], 'vite:monorepo')
  assert.equal(result.args.includes('--template'), false)
})

test('拒绝目录遍历、无效项目类型以及缺失/无效框架', () => {
  for (const name of ['../danger', 'Bad Name', 'a--b', '.hidden', '', 'abc&whoami']) {
    assert.throws(() => validateProjectOptions({ name, type: 'application', framework: 'vue' }))
  }
  assert.throws(() => validateProjectOptions({ name: 'valid', type: 'other' }))
  assert.throws(() => validateProjectOptions({ name: 'valid', type: 'application' }))
  assert.throws(() => validateProjectOptions({ name: 'valid', type: 'application', framework: 'angular' }))
  assert.throws(() => validateProjectOptions({ name: 'valid', type: 'monorepo', framework: 'vue' }))
})

test('UI/CSS 配置的框架兼容性校验', () => {
  assert.throws(() => validateProjectOptions({ name: 'demo', type: 'application', framework: 'react', ui: 'element-plus' }))
  assert.throws(() => validateProjectOptions({ name: 'demo', type: 'monorepo', css: 'tailwindcss' }))
  assert.throws(() => validateProjectOptions({ name: 'demo', type: 'application', framework: 'vue', css: 'unknown' }))
})
