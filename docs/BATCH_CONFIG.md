# JSON 批量创建 Monorepo

一份 JSON 配置描述新工作区及其中的 Vue/React 应用。根使用 Vite+ 官方 `vite:monorepo`，应用使用 `vite:application`，保留官方 website/utils；不创建 CI/CD。

## 配置

仓库提供 [可执行样例](../examples/monorepo.batch.json)：

```json
{
  "version": 1,
  "name": "adui-batch-demo",
  "apps": [
    { "name": "admin", "framework": "vue", "ui": "tdesign", "css": "unocss", "uiSmoke": true },
    {
      "name": "portal",
      "framework": "react",
      "language": "js",
      "ui": "antd",
      "css": "tailwindcss",
      "uiSmoke": true
    }
  ]
}
```

| 字段             | 必填 | 规则                                                                       |
| ---------------- | ---- | -------------------------------------------------------------------------- |
| version          | 是   | 数字 1                                                                     |
| name             | 是   | 新工作区名称，安全的小写 kebab-case                                        |
| apps             | 是   | 1–32 个应用，严格按数组顺序创建                                            |
| apps[].name      | 是   | 应用名，不能重名、与根同名或使用 website/utils                             |
| apps[].framework | 是   | vue / react                                                                |
| apps[].language  | 否   | ts / js，默认 ts                                                           |
| apps[].ui        | 否   | none / element-plus / antd / tdesign，默认 none；React 不支持 element-plus |
| apps[].css       | 否   | none / unocss / tailwindcss，默认 none                                     |
| apps[].uiSmoke   | 否   | 布尔值，默认 false；true 仅支持 Vue/TDesign、React/Ant Design              |

apps[].screen 支持大屏预设，apps[].engine 支持 three/cesium/babylon，apps[].modelProtection 支持 embedded/external/none；Three 默认 embedded，Cesium/Babylon 暂不接入模型保护，显式 embedded/external 拒绝。根不能统一设置模型保护。示例见 [模型五应用配置](../examples/models.batch.json)、[Cesium 配置](../examples/cesium.batch.json)。

未知字段、null/错误类型会报错，不忽略拼错的选项。根不允许设置 framework/language/UI/CSS。名称不允许路径或 Windows 保留设备名称；根也不能与默认 website/utils 包重名。仅支持最大 1 MiB 的 JSON，接受 UTF-8 BOM。

## 预览与执行

在仓库上级目录执行，输出为**当前目录下的配置 name**，与配置文件所在目录无关；目标必须不存在，不能在已有 workspace 内嵌套创建。

```powershell
cd D:\Workspace\adui-studio
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json
```

dry-run 输出规范化选项、官方根命令、每应用的 CLI argv/官方模板命令、cwd/target、UI/CSS 依赖，以及可选验收页文件，**不创建目录或安装依赖**。`--config` 只能与 `--dry-run` 同用；已有工作区逐应用维护请继续用 `--workspace`。

执行时先校验全部配置和目标，再生成官方根，随后统一检查真实根和全部成员路径，最后按以下顺序执行：

1. 工作区 adui-batch-demo（保留 website/utils）。
2. Vue TS 的 apps/admin，及其可选 UI Smoke。
3. React JS 的 apps/portal，及其可选 UI Smoke。

每个应用复用现有 CLI 的插件、依赖、类型声明及格式兼容处理。Node 子进程使用 argv 传路径，不执行配置提供的脚本或命令；此格式没有自定义命令字段。

## 验收

```powershell
cd adui-batch-demo
vp run ready
vp check
cd apps/admin
vp dev
# 浏览器访问终端 URL 的 /ui-smoke.html；结束服务后对 ../portal 重复
```

root 的 ready 会调用检查、默认库测试和所有包的完整 build 脚本。uiSmoke 成功生成只表示验收页已写入，浏览器中的按钮、计数、CSS 和控制台仍需实际验证。

## 失败与现场保护

预检错误不会启动官方生成；已有目标（含悬空链接）直接拒绝。实际生成中某阶段失败，立即停止并报告已完成、失败与未执行阶段、保留目录。失败阶段可能已安装依赖或写入部分文件；**不自动清理、覆盖、回滚或续跑**。

不要删除未知文件后盲目重跑；先检查现场。修好已有工作区后可用逐应用 `--workspace` 命令显式处理未完成应用；再次执行相同 batch 会因根目录已存在而拒绝。不要同时向同一工作区运行多个生成命令。

## 验证状态

2026-10-27，使用仓库样例 JSON 完整创建 `D:\Workspace\adui-studio\adui-batch-demo`，5 个生成阶段全部完成。根 `vp run ready` 的 8 项任务全部成功，构建后 `vp check` 再次通过（47 文件格式正确、20 文件无警告或 lint/type 错误）；官方 utils 构建有 TypeScript 7 API 实验性提示。

Chrome 中 Vue TS 与 React JS 两页面均通过按钮点击 0→1、CSS 颜色/圆角/内边距与无控制台 warn/error 验收。官方默认包保留，根无 UI/CSS 直接依赖，无 CI/CD。重复创建被安全拒绝，原根 manifest 哈希未变。

生成器 81 项测试、文档校验和根 `vp check` 通过；受控测试覆盖实际生成中失败即停与保留部分文件。更多证据见 [项目状态](PROJECT_CONTEXT.md)。这只覆盖代表组合，不表示所有 UI/CSS 组合均已实机验收。

## 大屏字段

应用新增可选 screen：true 使用 1920×1080 contain；对象仅允许 designWidth、designHeight、mode，尺寸为 1–32768 正整数，mode 为 contain/cover/stretch/none；省略或 false 不启用。可与 uiSmoke 同用，后者单独生成，避免重复写入。示例与 API 见 [SCREEN](SCREEN.md)。

## engine 应用字段

每应用可用 "engine":"three" 、"engine":"cesium" 或 "engine":"babylon"（none/省略不安装引擎），必须同时启用 screen。UI 验收阶段不重复传 engine/screen。运行样例见 [THREE_SMOKE](THREE_SMOKE.md)、[CESIUM](CESIUM.md)，Babylon 见 [指南](BABYLON.md) 与 [示例](../examples/babylon.batch.json)。完整 JSON 见 [three.batch.json](../examples/three.batch.json)、[cesium.batch.json](../examples/cesium.batch.json)。

应用 engines 数组与 engine 互斥，规范执行顺序及模型保护边界见 [多引擎说明](MULTI_ENGINE.md)。

## 失败后的人工恢复指引

批量失败报告增加每个未执行步骤的工作目录和 PowerShell 命令；API 的 error.recovery.pending 同时保留 command/args 数组。命令由重新校验后的原计划生成，路径和参数使用 PowerShell 单引号转义，不拼入失败原因。恢复报告不会运行命令、写入状态文件或保存密钥。

先处理失败阶段，再按顺序处理未执行步骤。失败阶段可能部分完成，报告不为该阶段生成盲目重试命令。后面的 UI Smoke 命令可能依赖失败应用恢复完成，不能直接跳过修复执行。根目录已存在时重跑同一个 batch 仍被拒绝；根目录不存在时应先确认无残留，再重新规划。

- 官方根生成失败：检查根目录、清单、工作区配置及锁文件；根未完整时不运行子应用命令。
- 应用生成或集成失败：保留现场，核对 App/main、Vite 配置、预设备份和依赖。仅确认相应预设尚未写入时才用 --apply-existing；已写入的预设不能作为通用覆盖式重试目标。
- 验收页失败：已有 HTML/目录不覆盖；检查输出和格式化错误，修复后运行 vp check。不要为重跑删除未知文件。

单应用 CLI 对官方模板、工作区准备/整理、UI/CSS、预设和验收页阶段提供失败阶段、目标目录、已完成步骤及现场保护说明。官方子进程非零退出码会保留，信号退出按失败处理。这里提供人工恢复信息，尚未实现自动断点续跑或覆盖式恢复。

恢复前可使用 --inspect-workspace <已有根> --config <原批量 JSON>，只读对照预期应用的声明和文件结构；不会因根已存在而尝试覆盖创建。not-created / blocked / present 的含义见 [Monorepo 说明](MONOREPO.md)。检查通过仍不能直接将失败阶段视为完成，需执行对应的本地验证。

## 已有工作区的逐应用操作计划

使用 --plan-recovery <已有根> --config <原批量 JSON>，不复用 --config 的新建根流程。缺失应用、已存在应用和部分完成应用分别规划为 create-missing、validate-existing、manual-review；详见 [Monorepo 操作计划](MONOREPO.md)。该命令不会执行计划，保留原有批量新建根拒绝覆盖行为。

--execute-recovery <已有根> --config <原 JSON> 是单独的显式写入入口，仅创建预检认定缺失的应用；manual-review 会阻止整次执行。它不是重跑原 batch，也不处理部分完成的已有应用。具体顺序、根共享文件变化及失败保留语义见 [Monorepo 执行说明](MONOREPO.md)。
