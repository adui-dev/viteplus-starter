const PROJECT_TYPES = new Set(['application', 'monorepo'])

export function validateProjectOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('项目配置必须是对象')
  }

  const { name, type } = options

  if (
    typeof name !== 'string' ||
    name.length > 64 ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)
  ) {
    throw new Error('项目名只能使用小写字母、数字和中划线，须以字母开头，长度不超过 64')
  }

  if (!PROJECT_TYPES.has(type)) {
    throw new Error('项目类型必须为 application 或 monorepo')
  }

  return { name, type }
}

export function buildVpCommand(options) {
  const { name, type } = validateProjectOptions(options)
  return {
    command: 'vp',
    args: [
      'create',
      type === 'monorepo' ? 'vite:monorepo' : 'vite:application',
      '--directory',
      name,
      '--package-manager',
      'pnpm',
      '--git',
    ],
  }
}
