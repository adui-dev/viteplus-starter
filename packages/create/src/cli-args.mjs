const VALUE_OPTIONS = new Set(['--name', '--type', '--framework', '--ui', '--css'])

export function parseCliArgs(argv) {
  const options = { name: undefined, type: undefined, framework: undefined, ui: undefined, css: undefined, dryRun: false, applyExisting: false }
  const seen = new Set()

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === '--help' || token === '-h') return { help: true }
    if (token === '--apply-existing') {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`)
      options.applyExisting = true
      seen.add(token)
      continue
    }
    if (token === '--dry-run') {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`)
      options.dryRun = true
      seen.add(token)
      continue
    }
    if (VALUE_OPTIONS.has(token)) {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`)
      const value = argv[++i]
      if (!value || value.startsWith('--')) {
        throw new Error(`${token} 缺少参数`)
      }
      options[token.slice(2)] = value
      seen.add(token)
      continue
    }
    throw new Error(`未知参数: ${token}`)
  }

  return options
}
