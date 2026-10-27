import { validateProjectName, validateProjectOptions } from './options.mjs'

const PROJECT_TYPES = { '1': 'application', '2': 'monorepo' }
const FRAMEWORKS = { '1': 'vue', '2': 'react' }

async function askUntilValid(ask, label, validate, report) {
  for (;;) {
    const value = (await ask(label)).trim()
    try {
      return validate(value)
    } catch (error) {
      report(error.message)
    }
  }
}

function choiceValidator(choices, defaultValue) {
  return (answer) => {
    const value = answer || defaultValue
    const choice = choices[value]
    if (!choice) throw new Error(`无效选项: ${value}，请按提示输入数字或选项名称`)
    return choice
  }
}

export async function collectProjectOptions(partial, ask, report = console.error) {
  const options = { ...partial }
  // 基础参数齐全时按非交互调用处理；UI/CSS 缺省为 None。
  if (options.name && options.type &&
      (options.type === 'monorepo' || options.framework)) {
    return validateProjectOptions(options)
  }
  let prompted = false

  if (!options.name) {
    prompted = true
    options.name = await askUntilValid(ask, '项目名称: ', validateProjectName, report)
  }

  if (!options.type) {
    prompted = true
    options.type = await askUntilValid(
      ask,
      '项目类型 [1] Application  [2] Monorepo (默认 1): ',
      choiceValidator({ ...PROJECT_TYPES, application: 'application', monorepo: 'monorepo' }, '1'),
      report,
    )
  }

  if (options.type === 'application' && !options.framework) {
    prompted = true
    options.framework = await askUntilValid(
      ask,
      '前端框架 [1] Vue 3  [2] React (默认 1): ',
      choiceValidator({ ...FRAMEWORKS, vue: 'vue', react: 'react' }, '1'),
      report,
    )
  }

  if (options.type === 'application') {
    if (!options.language) {
      prompted = true
      options.language = await askUntilValid(
        ask,
        '开发语言 [1] TypeScript  [2] JavaScript (默认 1): ',
        choiceValidator({ '1': 'ts', '2': 'js', ts: 'ts', js: 'js' }, '1'),
        report,
      )
    }
    if (!options.ui) {
      prompted = true
      const values = options.framework === 'vue'
        ? { '1': 'none', '2': 'element-plus', '3': 'antd', '4': 'tdesign', none: 'none', 'element-plus': 'element-plus', antd: 'antd', tdesign: 'tdesign' }
        : { '1': 'none', '2': 'antd', '3': 'tdesign', none: 'none', antd: 'antd', tdesign: 'tdesign' }
      const label = options.framework === 'vue'
        ? 'UI 组件库 [1] None  [2] Element Plus  [3] Ant Design Vue  [4] TDesign (默认 1): '
        : 'UI 组件库 [1] None  [2] Ant Design  [3] TDesign (默认 1): '
      options.ui = await askUntilValid(ask, label, choiceValidator(values, '1'), report)
    }
    if (!options.css) {
      prompted = true
      options.css = await askUntilValid(
        ask,
        'CSS 框架 [1] None  [2] UnoCSS  [3] Tailwind CSS (默认 1): ',
        choiceValidator({ '1': 'none', '2': 'unocss', '3': 'tailwindcss', none: 'none', unocss: 'unocss', tailwindcss: 'tailwindcss' }, '1'),
        report,
      )
    }
  }
  const selected = validateProjectOptions(options)
  if (!prompted) return selected

  const description = selected.type === 'application'
    ? `Application / ${selected.framework === 'vue' ? 'Vue 3' : 'React'} / ${selected.language === 'js' ? 'JavaScript' : 'TypeScript'} / UI: ${selected.ui ?? 'none'} / CSS: ${selected.css ?? 'none'}`
    : 'Monorepo (各子应用后续独立选择框架)'
  const destination = selected.workspace ? `${selected.workspace}/apps/${selected.name}` : selected.name
  const answer = (await ask(`\n将创建 ${destination} (${description})，确认吗？[Y/n]: `)).trim().toLowerCase()
  if (answer === 'n' || answer === 'no') return null
  if (answer !== '' && answer !== 'y' && answer !== 'yes') {
    throw new Error('确认选项只能是 Y 或 N，已取消创建')
  }
  return selected
}
