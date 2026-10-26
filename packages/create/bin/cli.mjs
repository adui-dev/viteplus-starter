#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { buildVpCommand } from '../src/options.mjs'

const usage = `ADui Vite+ Starter（初始化骨架）

用法：
  node packages/create/bin/cli.mjs --name my-app --type application
  node packages/create/bin/cli.mjs --name my-workspace --type monorepo
  node packages/create/bin/cli.mjs --name my-app --type application --dry-run

说明：
  当前版本仅委托 Vite+ 官方 vite:application / vite:monorepo 模板。
  Vue / React 由 Vite+ 官方创建交互选择；UI、CSS、大屏及 3D 预设尚未实现。
  --dry-run 仅展示命令，不创建文件。
`

function readArgs(argv) {
  const options = { name: undefined, type: undefined, dryRun: false }

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--help' || token === '-h') return { help: true }
    if (token === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (token === '--name' || token === '--type') {
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

  if ((!options.name || !options.type) && options.dryRun) {
    throw new Error('--dry-run 必须提供 --name 和 --type')
  }

  if (!options.name || !options.type) {
    if (!stdin.isTTY) {
      throw new Error('非交互环境必须提供 --name 和 --type')
    }
    const rl = createInterface({ input: stdin, output: stdout })
    try {
      options.name ||= (await rl.question('项目名称: ')).trim()
      options.type ||= (await rl.question('项目类型 (application/monorepo): ')).trim()
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

  console.log('调用 Vite+ 官方模板；请在官方交互中选择 Vue 或 React。')
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.exitCode = result.status || 1
  }
}

main().catch((error) => {
  console.error(`创建失败: ${error.message}`)
  process.exitCode = 1
})
