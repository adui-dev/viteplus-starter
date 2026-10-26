import { spawnSync } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const UI = {
  none: [[], []],
  'element-plus': [['element-plus'], ['unplugin-vue-components']],
  antd: [['ant-design-vue'], ['unplugin-vue-components']],
  tdesign: [['tdesign-vue-next'], ['unplugin-vue-components', '@tdesign-vue-next/auto-import-resolver']],
}

export function planIntegrations({ type, framework, ui = 'none', css = 'none' }) {
  if (!['none', 'element-plus', 'antd', 'tdesign'].includes(ui) ||
      !['none', 'unocss', 'tailwindcss'].includes(css)) {
    throw new Error('无效 UI 或 CSS 选项')
  }
  if (type === 'monorepo') {
    if (ui !== 'none' || css !== 'none') throw new Error('Monorepo 根目录不可配置 UI/CSS')
    return { ui, css, dependencies: [], devDependencies: [] }
  }
  if (type !== 'application' || !['vue', 'react'].includes(framework)) {
    throw new Error('必须选择有效的 Application 框架')
  }
  if (framework === 'react' && ui === 'element-plus') {
    throw new Error('Element Plus 仅支持 Vue')
  }
  const [dependencies, devDependencies] = framework === 'vue' ? UI[ui] : [
    ui === 'antd' ? ['antd'] : ui === 'tdesign' ? ['tdesign-react'] : [], []
  ]
  return {
    ui, css,
    dependencies: [...dependencies],
    devDependencies: [...devDependencies,
      ...(css === 'unocss' ? ['unocss'] : []),
      ...(css === 'tailwindcss' ? ['tailwindcss', '@tailwindcss/vite'] : []),
    ],
  }
}

export function generateIntegration(options, viteConfig, mainSource) {
  const plan = planIntegrations({ type: 'application', ...options })
  if (plan.ui === 'none' && plan.css === 'none') return null
  if (!/plugins\s*:\s*\[/.test(viteConfig)) {
    throw new Error('无法识别 Vite+ 官方配置中的 plugins 数组，拒绝修改')
  }
  if (viteConfig.includes('starterPlugins')) throw new Error('Starter 配置已存在')
  const imports = []
  const plugins = []
  const mainImports = []
  const files = {}
  const { framework, ui = 'none', css = 'none' } = options

  if (framework === 'vue' && ui !== 'none') {
    imports.push("import Components from 'unplugin-vue-components/vite'")
    const resolvers = {
      'element-plus': ["import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'", 'ElementPlusResolver()'],
      antd: ["import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'", 'AntDesignVueResolver({ importStyle: false })'],
      tdesign: ["import { TDesignResolver } from '@tdesign-vue-next/auto-import-resolver'", "TDesignResolver({ library: 'vue-next' })"],
    }
    const [importLine, resolver] = resolvers[ui]
    imports.push(importLine)
    plugins.push(`Components({ resolvers: [${resolver}], dts: 'src/components.d.ts' })`)
    if (ui === 'tdesign') mainImports.push("import 'tdesign-vue-next/es/style/index.css'")
  }
  if (framework === 'react' && ui === 'antd') mainImports.push("import 'antd/dist/reset.css'")
  if (framework === 'react' && ui === 'tdesign') mainImports.push("import 'tdesign-react/es/style/index.css'")
  if (css === 'unocss') {
    imports.push("import UnoCSS from 'unocss/vite'")
    plugins.push('UnoCSS()')
    mainImports.push("import 'virtual:uno.css'")
    files['uno.config.ts'] = "import { defineConfig, presetWind3 } from 'unocss'\n\nexport default defineConfig({ presets: [presetWind3()] })\n"
  }
  if (css === 'tailwindcss') {
    imports.push("import tailwindcss from '@tailwindcss/vite'")
    plugins.push('tailwindcss()')
    mainImports.push("import './starter.tailwind.css'")
    files['src/starter.tailwind.css'] = '@import "tailwindcss";\n'
  }
  const entryName = framework === 'vue' ? 'src/main.ts' : 'src/main.tsx'
  files[entryName] = mainImports.length ? mainImports.join('\n') + '\n' + mainSource : mainSource
  if (!plugins.length) return { config: viteConfig, files }
  files['starter.plugins.ts'] = imports.join('\n') +
    '\n\nexport function starterPlugins() {\n  return [\n    ' + plugins.join(',\n    ') + '\n  ]\n}\n'
  const config = "import { starterPlugins } from './starter.plugins'\n" +
    viteConfig.replace(/plugins\s*:\s*\[/, (match) => match + '\n    ...starterPlugins(),')
  return { config, files }
}

function install(cwd, list, dev) {
  if (!list.length) return
  const args = ['add', ...(dev ? ['-D'] : []), ...list]
  // Package names are selected exclusively from a hardcoded allowlist.
  const result = process.platform === 'win32'
    ? spawnSync(['pnpm', ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
    : spawnSync('pnpm', args, { cwd, stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error(`安装依赖失败：pnpm ${args.join(' ')}`)
}

export async function applyIntegrations(directory, options, installer = install) {
  const plan = planIntegrations(options)
  if (!plan.dependencies.length && !plan.devDependencies.length) return false
  const configPath = join(directory, 'vite.config.ts')
  const mainPath = join(directory, 'src', options.framework === 'vue' ? 'main.ts' : 'main.tsx')
  const [config, entry] = await Promise.all([readFile(configPath, 'utf8'), readFile(mainPath, 'utf8')])
  const generated = generateIntegration(options, config, entry)
  for (const path of Object.keys(generated.files)) {
    if (path === `src/main.${options.framework === 'vue' ? 'ts' : 'tsx'}`) continue
    try {
      await access(join(directory, path))
      throw new Error(`文件已存在，拒绝覆盖：${path}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  install === installer ? install(directory, plan.dependencies, false) : installer(directory, plan.dependencies, false)
  install === installer ? install(directory, plan.devDependencies, true) : installer(directory, plan.devDependencies, true)
  for (const [path, source] of Object.entries(generated.files)) {
    await writeFile(join(directory, path), source, {
      flag: path.startsWith('src/main.') ? 'w' : 'wx',
    })
  }
  if (generated.config !== config) await writeFile(configPath, generated.config)
  return true
}
