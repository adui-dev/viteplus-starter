import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCliArgs } from '../src/cli-args.mjs'
import { collectProjectOptions } from '../src/prompts.mjs'

test('解析框架参数与 Dry Run', () => {
  assert.deepEqual(parseCliArgs(['--name', 'hello', '--type', 'application', '--framework', 'vue', '--dry-run']), {
    name: 'hello', type: 'application', framework: 'vue', language: undefined, ui: undefined, css: undefined, dryRun: true, applyExisting: false, repairExisting: false,
  })
})

test('拒绝未知、重复和缺少值的参数', () => {
  assert.throws(() => parseCliArgs(['--bogus']))
  assert.throws(() => parseCliArgs(['--name']))
  assert.throws(() => parseCliArgs(['--name', 'one', '--name', 'two']))
})

test('交互选择 Vue Application 并确认', async () => {
  const answers = ['my-app', '1', '1', '1', '1', '1', 'y']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.deepEqual(result, { name: 'my-app', type: 'application', framework: 'vue', language: 'ts', ui: 'none', css: 'none' })
})

test('交互选择 Monorepo，不询问根框架', async () => {
  const answers = ['my-workspace', '2', 'yes']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.deepEqual(result, { name: 'my-workspace', type: 'monorepo' })
})

test('输入非法名称后重新输入', async () => {
  const messages = []
  const answers = ['../bad', 'valid-app', 'application', 'react', '1', '1', '1', '']
  const result = await collectProjectOptions({}, async () => answers.shift(), (s) => messages.push(s))
  assert.equal(result.name, 'valid-app')
  assert.equal(result.framework, 'react')
  assert.equal(messages.length, 1)
})

test('取消交互不会生成项目参数', async () => {
  const answers = ['my-app', '1', '2', '1', '1', '1', 'n']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.equal(result, null)
})

test('非交互完整配置不需要二次确认', async () => {
  const result = await collectProjectOptions({ name: 'my-app', type: 'application', framework: 'react' }, async () => { throw new Error('不应询问') })
  assert.deepEqual(result, { name: 'my-app', type: 'application', framework: 'react' })
})

test('交互选择 Vue + TDesign + UnoCSS', async () => {
  const answers = ['my-vue', '1', '1', '1', '4', '2', 'y']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.equal(result.ui, 'tdesign')
  assert.equal(result.css, 'unocss')
})

test('React 的 UI 菜单不提供 Element Plus', async () => {
  const answers = ['my-react', '1', '2', '1', '2', '3', 'y']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.equal(result.ui, 'antd')
  assert.equal(result.css, 'tailwindcss')
})

test('显式补装参数及重复补装标记校验', () => {
  const parsed = parseCliArgs(['--name', 'demo', '--type', 'application', '--framework', 'vue', '--ui', 'tdesign', '--apply-existing'])
  assert.equal(parsed.applyExisting, true)
  assert.throws(() => parseCliArgs(['--apply-existing', '--apply-existing']))
})

test('旧版修复参数可解析，不允许重复', () => {
  const result = parseCliArgs(['--name', 'demo', '--type', 'application', '--framework', 'vue', '--repair-existing'])
  assert.equal(result.repairExisting, true)
  assert.throws(() => parseCliArgs(['--repair-existing', '--repair-existing']))
})

test('解析显式 JavaScript 语言参数', () => {
  const parsed = parseCliArgs(['--name', 'demo-js', '--type', 'application', '--framework', 'vue', '--language', 'js'])
  assert.equal(parsed.language, 'js')
  assert.throws(() => parseCliArgs(['--language', 'js', '--language', 'ts']))
  assert.throws(() => parseCliArgs(['--language']))
})

test('交互式选择 Vue JavaScript', async () => {
  const answers = ['vue-js-demo', '1', '1', '2', '1', '1', 'y']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.equal(result.framework, 'vue')
  assert.equal(result.language, 'js')
  assert.equal(result.ui, 'none')
})

test('交互式选择 React JavaScript 并启用 Ant Design / Tailwind', async () => {
  const answers = ['react-js-demo', '1', '2', '2', '2', '3', 'y']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.deepEqual([result.framework, result.language, result.ui, result.css],
    ['react', 'js', 'antd', 'tailwindcss'])
})

test('交互空输入默认 TypeScript', async () => {
  const answers = ['default-ts-demo', '1', '1', '', '1', '1', 'yes']
  const result = await collectProjectOptions({}, async () => answers.shift())
  assert.equal(result.language, 'ts')
})
