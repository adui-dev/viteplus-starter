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
      '前端框架 [1] Vue 3 + TypeScript  [2] React + TypeScript (默认 1): ',
      choiceValidator({ ...FRAMEWORKS, vue: 'vue', react: 'react' }, '1'),
      report,
    )
  }

  const selected = validateProjectOptions(options)
  if (!prompted) return selected

  const description = selected.type === 'application'
    ? `Application / ${selected.framework === 'vue' ? 'Vue 3' : 'React'} / TypeScript`
    : 'Monorepo (各子应用后续独立选择框架)'
  const answer = (await ask(`\n将创建 ${selected.name} (${description})，确认吗？[Y/n]: `)).trim().toLowerCase()
  if (answer === 'n' || answer === 'no') return null
  if (answer !== '' && answer !== 'y' && answer !== 'yes') {
    throw new Error('确认选项只能是 Y 或 N，已取消创建')
  }
  return selected
}
