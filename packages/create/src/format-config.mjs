function skipQuoted(source, start) {
  const quote = source[start]
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') {
      i++
      continue
    }
    if (source[i] === quote) return i + 1
  }
  throw new Error('Vite+ 格式配置存在未闭合字符串，拒绝修改')
}

function findTopLevelField(source, start, field) {
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
      if (end === -1) throw new Error('Vite+ 配置存在未闭合注释')
      index = end + 2
      continue
    }
    if (!curly && !square && !round) {
      const match = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(source.slice(index))
      if (match && match[1] === field) return index + match[0].length
    }
    if (char === '{') curly++
    else if (char === '}') {
      if (!curly) return null
      curly--
    } else if (char === '[') square++
    else if (char === ']') square--
    else if (char === '(') round++
    else if (char === ')') round--
    index++
  }
  throw new Error('Vite+ 配置未正确闭合，拒绝修改')
}

export function ignoreGeneratedVueComponentDeclarations(viteConfig) {
  const root = /export\s+default\s+defineConfig\s*\(\s*\{/.exec(viteConfig)
  if (!root) throw new Error('仅支持 Vite+ 官方 defineConfig({ ... })')
  const rootStart = root.index + root[0].length
  const fmtPosition = findTopLevelField(viteConfig, rootStart, 'fmt')
  const ignoreEntry = "'src/components.d.ts'"

  if (fmtPosition === null) {
    return viteConfig.slice(0, rootStart) +
      '\n  fmt: { ignorePatterns: [' + ignoreEntry + '] },' +
      viteConfig.slice(rootStart)
  }

  const fmtOpening = /^\s*\{/.exec(viteConfig.slice(fmtPosition))
  if (!fmtOpening) throw new Error('现有 fmt 配置不是对象字面量，拒绝覆盖')
  const fmtBody = fmtPosition + fmtOpening[0].length
  const ignorePosition = findTopLevelField(viteConfig, fmtBody, 'ignorePatterns')

  if (ignorePosition === null) {
    return viteConfig.slice(0, fmtBody) +
      '\n    ignorePatterns: [' + ignoreEntry + '],' +
      viteConfig.slice(fmtBody)
  }

  const arrayOpening = /^\s*\[/.exec(viteConfig.slice(ignorePosition))
  if (!arrayOpening) throw new Error('现有 fmt.ignorePatterns 不是数组，拒绝覆盖')
  const arrayContentStart = ignorePosition + arrayOpening[0].length
  const arrayEnd = viteConfig.indexOf(']', arrayContentStart)
  if (arrayEnd < 0) throw new Error('fmt.ignorePatterns 数组未闭合')
  const already = viteConfig.slice(arrayContentStart, arrayEnd)
  if (/(?:['"])src\/components\.d\.ts(?:['"])/.test(already)) return viteConfig
  return viteConfig.slice(0, arrayContentStart) + ignoreEntry + ', ' + viteConfig.slice(arrayContentStart)
}
