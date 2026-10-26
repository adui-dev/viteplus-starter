#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { parseCliArgs } from '../src/cli-args.mjs'
import { buildVpCommand, validateProjectOptions } from '../src/options.mjs'
import { collectProjectOptions } from '../src/prompts.mjs'
import { applyIntegrations, planIntegrations, repairExistingIntegrations } from '../src/integrations.mjs'

const usage = `ADui Vite+ Starter（P2：项目初始化交互）

用法：
  node packages/create/bin/cli.mjs
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue
  node packages/create/bin/cli.mjs --name my-react-app --type application --framework react
  node packages/create/bin/cli.mjs --name my-workspace --type monorepo
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss --apply-existing
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss --repair-existing
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --dry-run

说明：
  Application 委托 Vite+ 官方 vite:application，使用 vue-ts / react-ts 模板。
  Monorepo 使用官方 vite:monorepo；子应用的框架需分别选择。
  无参数时交互选择名称、形态、框架，并二次确认。
  --dry-run 只输出命令；必须提供全部必需参数，且不创建文件。
  UI/CSS 集成支持 None、Element Plus、Ant Design、TDesign、UnoCSS、Tailwind CSS。
  --apply-existing 用于首次补装；--repair-existing 用于修复旧版 starter.plugins 跨文件引用。
  旧插件文件会备份成 starter.plugins.ts.bak；两种模式不重装基础模板。
  大屏及 3D 集成尚未实现。
`

async function main() {
  const args = parseCliArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }

  const incomplete = !args.name || !args.type || (args.type === 'application' && !args.framework)
  let options
  if (incomplete) {
    if (args.dryRun || !stdin.isTTY) {
      throw new Error('非交互或 --dry-run 模式必须提供 --name、--type，以及 Application 的 --framework')
    }
    const rl = createInterface({ input: stdin, output: stdout })
    try {
      options = await collectProjectOptions(args, (prompt) => rl.question(prompt))
    } finally {
      rl.close()
    }
    if (options === null) {
      console.log('已取消创建，未修改任何项目文件')
      return
    }
  } else {
    options = validateProjectOptions(args)
  }

  const { command, args: vpArgs } = buildVpCommand(options)
  const integrations = planIntegrations(options)
  const target = resolve(process.cwd(), options.name)
  if (args.repairExisting && args.applyExisting) {
    throw new Error('--repair-existing 不能和 --apply-existing 同时使用')
  }
  if (args.repairExisting) {
    if (args.dryRun) throw new Error('--repair-existing 与 --dry-run 不能同时使用')
    if (options.type !== 'application') throw new Error('仅支持 Application 的旧版配置修复')
    if (!existsSync(target)) throw new Error('目标目录不存在，无法修复')
    const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
    if (!dependencies['vite-plus'] || !dependencies[options.framework]) {
      throw new Error('目标项目与所选 Vue/React 不匹配，拒绝修复')
    }
    await repairExistingIntegrations(target, options)
    console.log('旧版插件引用修复完成，旧文件已备份，请运行 vp check 和 vp build')
    return
  }
  if (args.applyExisting) {
    if (args.dryRun) throw new Error('--apply-existing 与 --dry-run 不能同时使用')
    if (options.type !== 'application') throw new Error('只能向已存在的 Application 补装插件')
    if (!existsSync(target)) throw new Error('目标目录不存在，无法补装')
    const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies }
    if (!dependencies['vite-plus'] || !dependencies[options.framework]) {
      throw new Error('现有目录不是所选 Vite+ Vue/React 应用，拒绝修改')
    }
    if (!integrations.dependencies.length && !integrations.devDependencies.length) {
      throw new Error('未选择需要安装的 UI/CSS 集成')
    }
    await applyIntegrations(target, options)
    console.log('补装完成，请在项目中执行 vp check 和 vp build')
    return
  }
  if (existsSync(target) && !args.dryRun) {
    throw new Error(`目标目录已存在: ${options.name}，为保护文件已终止`)
  }

  if (args.dryRun) {
    console.log(JSON.stringify({ command, args: vpArgs, integrations }, null, 2))
    return
  }

  console.log(options.type === 'application'
    ? `调用 Vite+ 官方 Application 模板，框架：${options.framework}`
    : '调用 Vite+ 官方 Monorepo 模板')

  // Windows 的 vp 通常是 .cmd shim；所有值在构造命令前均被白名单校验。
  // 以单个 shell 命令执行，避免 Node.js 24 在 shell:true + args[] 时的 DEP0190。
  const result = process.platform === 'win32'
    ? spawnSync([command, ...vpArgs].join(' '), { stdio: 'inherit', shell: true })
    : spawnSync(command, vpArgs, { stdio: 'inherit' })

  if (result.error) throw result.error
  if (result.status === 0 && (integrations.dependencies.length || integrations.devDependencies.length)) {
    console.log('正在安装和配置所选 UI/CSS 插件...')
    await applyIntegrations(target, options)
    console.log('UI/CSS 插件配置已写入，请运行 vp check 和 vp build 验证')
  }
  if (result.signal) {
    process.exitCode = 1
  } else if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  }
}

main().catch((error) => {
  console.error(`创建失败: ${error.message}`)
  process.exitCode = 1
})
