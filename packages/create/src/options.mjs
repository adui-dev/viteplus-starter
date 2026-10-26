const PROJECT_TYPES = new Set(['application', 'monorepo'])
const FRAMEWORK_TEMPLATES = Object.freeze({ vue: 'vue-ts', react: 'react-ts' })

export function validateProjectName(name) {
  if (
    typeof name !== 'string' ||
    name.length > 64 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)
  ) {
    throw new Error('项目名只能使用小写字母、数字和中划线，须以字母开头，长度不超过 64')
  }
  return name
}

export function validateProjectOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('项目配置必须是对象')
  }

  const { name, type, framework } = options

  validateProjectName(name)

  if (!PROJECT_TYPES.has(type)) {
    throw new Error('项目类型必须为 application 或 monorepo')
  }

  if (type === 'application' && !Object.hasOwn(FRAMEWORK_TEMPLATES, framework)) {
    throw new Error('Application 必须通过 --framework 选择 vue 或 react')
  }
  if (type === 'monorepo' && framework !== undefined) {
    throw new Error('Monorepo 根工作区不能指定 --framework，需在创建应用时独立选择')
  }
  return { name, type, ...(framework === undefined ? {} : { framework }) }
}

export function buildVpCommand(options) {
  const { name, type, framework } = validateProjectOptions(options)
  const args = [
      'create',
      type === 'monorepo' ? 'vite:monorepo' : 'vite:application',
      '--directory',
      name,
      '--package-manager',
      'pnpm',
      '--git',
  ]
  if (type === 'application') {
    args.push('--', '--template', FRAMEWORK_TEMPLATES[framework])
  }
  return { command: 'vp', args }
}
