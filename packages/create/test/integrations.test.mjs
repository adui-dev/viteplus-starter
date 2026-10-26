import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planIntegrations, generateIntegration } from '../src/integrations.mjs'

const vueConfig = "import vue from '@vitejs/plugin-vue'\nexport default defineConfig({\n  plugins: [vue()],\n})\n"
const reactConfig = "import react from '@vitejs/plugin-react'\nexport default defineConfig({\n  plugins: [react()],\n})\n"

test('Vue + Element Plus + UnoCSS 生成正确依赖清单', () => {
  const result = planIntegrations({type:'application',framework:'vue',ui:'element-plus',css:'unocss'})
  assert.deepEqual(result.dependencies, ['element-plus'])
  assert.deepEqual(result.devDependencies, ['unplugin-vue-components','unocss'])
})
test('React 拒绝 Element Plus', () => {
  assert.throws(() => planIntegrations({type:'application',framework:'react',ui:'element-plus',css:'none'}))
})
test('Monorepo 不允许全局 UI/CSS', () => {
  assert.throws(() => planIntegrations({type:'monorepo',ui:'tdesign',css:'none'}))
})
test('Vue + TDesign + Tailwind 生成 Vite 插件与样式', () => {
  const generated = generateIntegration({framework:'vue',ui:'tdesign',css:'tailwindcss'}, vueConfig, "import App from './App.vue'\n")
  assert.match(generated.config, /\.\.\.starterPlugins\(\)/)
  assert.match(generated.files['starter.plugins.ts'], /TDesignResolver/)
  assert.match(generated.files['starter.plugins.ts'], /tailwindcss\(\)/)
  assert.match(generated.files['src/main.ts'], /tdesign-vue-next/)
  assert.match(generated.files['src/main.ts'], /starter.tailwind.css/)
})
test('React + Ant Design 仅需入口样式', () => {
  const generated = generateIntegration({framework:'react',ui:'antd',css:'none'}, reactConfig, 'console.log(1)')
  assert.equal(generated.config, reactConfig)
  assert.match(generated.files['src/main.tsx'], /antd\/dist\/reset.css/)
})
test('未知模板布局应拒绝修改', () => {
  assert.throws(() => generateIntegration({framework:'vue',ui:'antd',css:'none'}, 'export default {}', ''))
})
