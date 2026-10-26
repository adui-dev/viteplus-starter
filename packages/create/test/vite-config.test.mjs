import { test } from 'node:test'
import assert from 'node:assert/strict'
import { injectStarterPlugins } from '../src/vite-config.mjs'

test('普通插件数组可安全扩展', () => {
  const output = injectStarterPlugins("import { defineConfig } from 'vite-plus'\nexport default defineConfig({plugins: [vue()]})")
  assert.match(output, /plugins:\s*\[\s*\.\.\.starterPlugins\(\),/)
})
test('lazyPlugins 回调中插入插件', () => {
  const output = injectStarterPlugins("import { defineConfig, lazyPlugins } from 'vite-plus'\nexport default defineConfig({plugins:lazyPlugins(() => [vue()])})")
  assert.match(output, /lazyPlugins\(\(\) => \[\s*\.\.\.starterPlugins\(\),/)
})
test('无插件数组可新增 Vite+ lazyPlugins', () => {
  const output = injectStarterPlugins("import { defineConfig } from 'vite-plus'\nexport default defineConfig({staged:{'*':'vp check --fix'}})")
  assert.match(output, /plugins: lazyPlugins\(\(\) => starterPlugins\(\)\)/)
  assert.match(output, /staged:/)
})
test('嵌套 lint.plugins 不会被当成 Vite 插件', () => {
  const output = injectStarterPlugins("import { defineConfig } from 'vite-plus'\nexport default defineConfig({lint:{plugins:['typescript']}})")
  assert.match(output, /plugins: lazyPlugins/)
  assert.match(output, /lint:\{plugins:\['typescript'\]\}/)
})
test('未知结构保守拒绝修改', () => {
  assert.throws(() => injectStarterPlugins('export default {plugins: []}'))
  assert.throws(() => injectStarterPlugins('export default defineConfig({plugins: makePlugins()})'))
})
