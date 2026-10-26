#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { buildVpCommand } from '../src/options.mjs'

const usage = `ADui Vite+ Starter（官方模板验证阶段）

用法：
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue
  node packages/create/bin/cli.mjs --name my-react-app --type application --framework react
  node packages/create/bin/cli.mjs --name my-workspace --type monorepo
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --dry-run

说明：
  Application 委托官方 vite:application，通过 vue-ts / react-ts 模板明确选择框架。
  Monorepo 使用官方 vite:monorepo，子应用的框架应分别选择。
  UI、CSS、大屏及 3D 集成尚未实现。--dry-run 不创建文件。
`

function readArgs(argv) {
  const options = { name: undefined, type: undefined, framework: undefined, dryRun: false }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--help' || token === '-h') return { help: true }
    if (token === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (token === '--name' || token === '--type' || token === '--framework') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) {
        throw new Error(`${token} 缺少参数`)
      }
      options[token.slice(2)] = value
      continue
    }
    throw new Error(`未知参数: ${token}`)
  }

  return options
}

async function main() {
  const options = readArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage)
    return
  }

  if (!options.name || !options.type || (options.type === 'application' && !options.framework)) {
    if (options.dryRun || !stdin.isTTY) {
      throw new Error('非交互或 --dry-run 模式必须提供 --name、--type，以及 Application 的 --framework')
    }
    const rl = createInterface({ input: stdin, output: stdout })
    try {
      options.name ||= (await rl.question('项目名称: ')).trim()
      options.type ||= (await rl.question('项目类型 (application/monorepo): ')).trim()
      if (options.type === 'application') {
        options.framework ||= (await rl.question('前端框架 (vue/react): ')).trim()
      }
    } finally {
      rl.close()
    }
  }

  const { command, args } = buildVpCommand(options)

  if (!options.dryRun && existsSync(resolve(process.cwd(), options.name))) {
    throw new Error(`目标目录已存在: ${options.name}，为保护文件已终止`)
  }

  if (options.dryRun) {
    console.log(JSON.stringify({ command, args }, null, 2))
    return
  }

  console.log(options.type === 'application'
    ? `调用 Vite+ 官方 Application 模板，框架：${options.framework}`
    : '调用 Vite+ 官方 Monorepo 模板')

  // Windows vp 通常是 .cmd shim；参数均经过白名单校验。
  // Windows 单个命令字符串避免 Node.js 24 的 DEP0190。
  const result = process.platform === 'win32'
    ? spawnSync([command, ...args].join(' '), { stdio: 'inherit', shell: true })
    : spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.exitCode = result.status || 1
  }
}

main().catch((error) => {
  console.error(`创建失败: ${error.message}`)
  process.exitCode = 1
})
