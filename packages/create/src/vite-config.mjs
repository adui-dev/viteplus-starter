function skipQuoted(source, start) {
  const quote = source[start]
  for (let index = start + 1; index < source.length; index++) {
    if (source[index] === '\\') {
      index++
      continue
    }
    if (source[index] === quote) return index + 1
  }
  throw new Error('Vite 配置包含未闭合字符串，拒绝自动修改')
}

// 只检查 defineConfig 顶层属性，不会误匹配 lint.plugins 等嵌套字段。
function locatePlugins(source, start) {
  let curly = 0
  let square = 0
  let round = 0
  for (let index = start; index < source.length;) {
    const char = source[index]
    const next = source[index + 1]
    if (char === "'" || char === '"' || char === String.fromCharCode(96)) {
      index = skipQuoted(source, index)
      continue
    }
    if (char === '/' && next === '/') {
      index = source.indexOf('\n', index + 2)
      if (index === -1) return null
      continue
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2)
      if (end === -1) throw new Error('Vite 配置包含未闭合注释')
      index = end + 2
      continue
    }
    if (!curly && !square && !round) {
      const property = /^plugins\s*:/.exec(source.slice(index))
      if (property) return index + property[0].length
    }
    if (char === '{') curly++
    else if (char === '}') {
      if (curly === 0) return null
      curly--
    } else if (char === '[') square++
    else if (char === ']') square--
    else if (char === '(') round++
    else if (char === ')') round--
    index++
  }
  throw new Error('Vite 配置未正确闭合，拒绝自动修改')
}

export function injectStarterPlugins(viteConfig) {
  if (viteConfig.includes('starterPlugins')) throw new Error('Starter 集成已存在，拒绝重复修改')
  const root = /export\s+default\s+defineConfig\s*\(\s*\{/.exec(viteConfig)
  if (!root) throw new Error('仅支持 Vite+ 官方 defineConfig({ ... }) 配置，拒绝覆盖未知结构')
  const rootStart = root.index + root[0].length
  const valueStart = locatePlugins(viteConfig, rootStart)
  let updated = viteConfig
  if (valueStart === null) {
    updated = viteConfig.slice(0, rootStart) + '\n  plugins: lazyPlugins(() => starterPlugins()),' + viteConfig.slice(rootStart)
    if (!/import\s*\{[^}]*\blazyPlugins\b[^}]*\}\s*from\s*['"]vite-plus['"]/.test(updated)) {
      updated = "import { lazyPlugins } from 'vite-plus'\n" + updated
    }
  } else {
    const value = viteConfig.slice(valueStart)
    const supported = /^\s*(?:\[|lazyPlugins\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\[)/.exec(value)
    if (!supported) {
      throw new Error('仅支持 plugins: [...] 或 plugins: lazyPlugins(() => [...])，拒绝修改其他插件结构')
    }
    const bracket = valueStart + supported[0].lastIndexOf('[')
    updated = viteConfig.slice(0, bracket + 1) + '\n    ...starterPlugins(),' + viteConfig.slice(bracket + 1)
  }
  return "import { starterPlugins } from './starter.plugins'\n" + updated
}
