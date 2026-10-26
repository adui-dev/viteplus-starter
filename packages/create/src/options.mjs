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
  const ui = options.ui ?? 'none'
  const css = options.css ?? 'none'

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
  if (!['none', 'element-plus', 'antd', 'tdesign'].includes(ui)) {
    throw new Error('不支持的 UI 组件库')
  }
  if (!['none', 'unocss', 'tailwindcss'].includes(css)) {
    throw new Error('不支持的 CSS 框架')
  }
  if (framework === 'react' && ui === 'element-plus') {
    throw new Error('Element Plus 不支持 React')
  }
  if (type === 'monorepo' && (ui !== 'none' || css !== 'none')) {
    throw new Error('Monorepo 根目录不配置 UI/CSS，请在各应用内选择')
  }
  return {
    name, type,
    ...(framework === undefined ? {} : { framework }),
    ...(options.ui === undefined ? {} : { ui }),
    ...(options.css === undefined ? {} : { css }),
  }
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
