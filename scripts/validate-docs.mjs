import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const required = [
  'README.md',
  'AGENTS.md',
  'docs/REQUIREMENTS.md',
  'docs/ARCHITECTURE.md',
  'docs/SDD.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/CODEBASE_MAP.md',
  'docs/SKILLS.md',
  'docs/HARNESS.md',
  'docs/adr/0001-official-viteplus-templates.md',
  '.agents/skills/starter-preset-development/SKILL.md',
]
const errors = []

for (const path of required) {
  if (!existsSync(resolve(root, path))) {
    errors.push(`缺少必要文件: ${path}`)
  }
}

for (const path of required.filter((file) => file.endsWith('.md'))) {
  const fullPath = resolve(root, path)
  if (!existsSync(fullPath)) continue
  const contents = readFileSync(fullPath, 'utf8')
  const links = contents.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)

  for (const [, rawTarget] of links) {
    const target = rawTarget.split('#')[0].trim().replace(/^<|>$/g, '')
    if (!target || /^(?:[a-z]+:|\/\/)/i.test(target)) continue
    let decoded
    try {
      decoded = decodeURIComponent(target)
    } catch {
      errors.push(`${path}: 无法解码的链接 ${target}`)
      continue
    }
    if (!existsSync(resolve(dirname(fullPath), decoded))) {
      errors.push(`${path}: 无效相对链接 ${target}`)
    }
  }
}

const requirements = resolve(root, 'docs/REQUIREMENTS.md')
if (existsSync(requirements)) {
  const content = readFileSync(requirements, 'utf8')
  const ids = [...content.matchAll(/^###\s+((?:FR|NFR)-\d{3})\b/gm)].map((m) => m[1])
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  for (const id of new Set(duplicates)) {
    errors.push(`需求定义编号重复: ${id}`)
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`)
  process.exitCode = 1
} else {
  console.log('文档静态校验通过：必要文件、相对路径、需求编号未发现问题')
}
