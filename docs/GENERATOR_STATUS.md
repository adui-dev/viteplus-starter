# 生成器能力与验收范围

更新日期：2026-10-30。本项目是 Vite+ 项目生成器；大屏、UI、Three 和模型查看页面是集成验收入口，不是独立业务产品。验收页已有最小渲染、点击和清理能力，不优先扩展旋转缩放等查看器体验。

本阶段只验收 Windows，按用户 2026-10-30 的明确要求不再推进 Linux/macOS；其他系统未验证，也不作为本阶段阻塞项。

Windows V1 本地候选的操作说明与集中交付核对已整理：[Windows 指南](WINDOWS_GUIDE.md) 提供按执行目录组织的命令，[V1 清单](V1_ACCEPTANCE.md) 区分历史实测、本地检查和未覆盖范围。仓库仍为 0.0.0/private，未发布；后续按实际 Windows 项目试用反馈修复生成器，不自动扩大功能。

## 需求核对

| 需求              | 当前能力                                                                   | 尚未完成或范围限制                                                   |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FR-001 官方模板   | Vue/React × TS/JS；官方 Application/Monorepo 入口已实测                    | 不维护自有框架工程模板                                               |
| FR-002 交互       | 名称、框架、语言、UI/CSS、大屏、Three/Cesium/Babylon、模型保护与确认/取消  | 交互多选已接入                                                       |
| FR-003 UI         | Vue Element Plus/Ant Design Vue/TDesign，React Ant Design/TDesign 生成计划 | 五种框架/UI 均有代表组合真实组件渲染；未穷举 TS/JS 与 CSS 的全部组合 |
| FR-004 CSS        | UnoCSS/Tailwind 配置及代表组合已验收                                       | 未逐一真实构建全部 UI/CSS 组合                                       |
| FR-005 大屏       | 四种模式、坐标换算、浮层、全屏及三种引擎的原生像素层                       | Vue TS / React JS 两引擎 DPR、全屏及卸载重挂已验收；其余组合待验收   |
| FR-006 引擎       | 按应用选择 none/three/cesium/babylon、按需加载、实例清理与 GLB 适配        | 三引擎模型范围各自验收；不提供同页混合运行时                         |
| FR-007 模型保护   | 三引擎 .adui 授权解密、自动构建与 KEY 脚本                                 | FBX/OBJ 与压缩格式待接入；客户端密钥仍可逆向提取                     |
| FR-008 工作区隔离 | 官方 pnpm apps/*，逐应用和批量配置、不同框架/语言/预设                     | 自定义布局与其他包管理器未支持                                       |
| FR-009 UI 验收页  | Vue 三种 UI / React 两种 UI，TS/JS、点击及 CSS 验收                        | 新增 Vue Element Plus/Ant Design Vue、React TDesign 已有代表组合验收 |
| FR-010 批量生成   | 严格 JSON、全量预检、顺序执行、dry-run 和失败摘要                          | 无自动回滚或覆盖式续跑                                               |
| FR-011 本地 GLB   | 贴图、相机适配、替换/清除/卸载，用户模型已实测                             | 仅自包含 GLB，非业务查看器路线                                       |
| NFR-001 可靠性    | 名称/选项校验、路径保护、重复输出拒绝、安装后复查                          | 失败保留依赖安装和现场；不承诺事务性或抵御恶意并发文件系统替换       |
| NFR-002 本地验证  | 单元测试、文档检查、Vite+ 检查及代表项目构建                               | 全部手动本地执行，无流水线或发布                                     |
| NFR-003 维护      | 需求、设计、索引、ADR 与实施记录                                           | 每次新增预设同步更新覆盖范围                                         |

具体实现和历史实测记录分别见 [需求](REQUIREMENTS.md)、[代码索引](CODEBASE_MAP.md)、[状态记录](PROJECT_CONTEXT.md)。

## 运行时支持范围

根与 create 包已将原 >=22 修正为当前锁定 Vite+ 1.4.0 的 `^22.18.0 || ^24.11.0 || >=26.0.0`。Windows Node 22.18.0 已通过 210 项测试、文档校验、8 个示例/20 个应用预览、462 个组合计划及根 vp check；计划工具的实际构建计数仍为 0。共享模型插件另用原 DamagedHelmet 验证 embedded/external 真实构建解密、HTTP 拦截及变更失效通过，不能据此称全部引擎页面已在此版本渲染。

复验步骤见 [Harness](HARNESS.md#node-22-最低版本复验)，实际生成项目与环境边界见 [V1 清单](V1_ACCEPTANCE.md)。不将声明范围等同于所有运行时版本均已穷举验证；其他系统不在当前交付范围。

官方新工作区 adui-node22-acceptance 已完成 Vue/React × TS/JS 四应用和两个 UI 页生成。托管 Node 22 环境离线冻结安装、禁用缓存 ready 11/11、两个 UI 双入口构建及最终 vp check 通过。首轮 UI 安装曾由系统 Node 24 的 Corepack 转发，后续托管 PATH 和显式 Node 22 Corepack 调用均复验冻结安装；这一区别保留在 V1 清单，不扩大为首次全链路安装或新增浏览器验收。已有应用恢复执行跳过四项，48 项保护文件与 19 项官方默认成员原文件哈希一致。

Windows 中文及空格父目录、配置路径已补验：初始创建 Vue TS/Ant Design Vue/UnoCSS，再由缺失应用恢复入口新建 React JS/Ant Design/Tailwind，原应用跳过。无缓存 ready 8/8、两 UI 双入口及最终 check 通过；重复执行跳过两应用，重复批量/验收页拒绝，33 项维护期间文件、14 项原应用文件和 19 项默认成员原文件哈希保持。边界与完整证据见 [V1 清单](V1_ACCEPTANCE.md#windows-中文空格路径与恢复验收2026-10-30)。

## 组合计划验证

运行 `node scripts/verify-generator-matrix.mjs`。矩阵覆盖 Vue 的 4 种 UI 选择、React 的 3 种 UI 选择，TS/JS、3 种 CSS、11 种增强配置，共 462 个有效组合。

十一种增强配置分别为：不启用大屏、只启用大屏，以及 Three/Babylon/Cesium 各自的关闭保护、embedded、external。验证官方命令与语言模板、按框架隔离依赖、已有 Vite 字段及入口保留、新增文件不冲突、无输出路径越界及模型计划不含密钥。

| 项目            | 计划数量 | 实际创建/构建数量 |
| --------------- | -------- | ----------------- |
| 总组合          | 462      | 本命令为 0        |
| 支持的 UI Smoke | 330      | 本命令为 0        |
| 大屏            | 420      | 本命令为 0        |
| Three           | 126      | 本命令为 0        |
| Cesium          | 126      | 本命令为 0        |
| Babylon         | 126      | 本命令为 0        |
| 模型保护        | 252      | 本命令为 0        |

计划验证不会安装依赖、创建项目或生成 KEY。它不能证明全部组合在当前依赖版本下可构建或渲染。真实生成项目必须另跑 vp check、vp run build；需要组件效果时还要浏览器验收。

## UI 补验代表项目（含后续组件渲染补验）

以下四个项目在仓库外使用官方入口创建，均通过 vp check 与 vp run build；详细记录见 [本轮状态记录](PROJECT_CONTEXT.md)。

| 项目                    | 配置                                       | 本轮验证层次                                                                |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| audit-element-vue-js    | Vue JS / Element Plus / Tailwind           | 安装/配置/检查/首页及 UI 双入口构建；Element Plus 渲染、点击和 CSS 已补验   |
| audit-antd-vue-ts       | Vue TS / Ant Design Vue / UnoCSS           | 安装/配置/检查/首页及 UI 双入口构建；Ant Design Vue 渲染、点击和 CSS 已补验 |
| audit-tdesign-react-js  | React JS / TDesign / UnoCSS                | 安装/配置/检查/首页及 UI 双入口构建；TDesign 渲染、点击和 CSS 已补验        |
| audit-preserve-react-ts | React TS / Ant Design / Tailwind，首次补装 | 配置增量集成、检查/构建及无关文件不被格式化                                 |

已完成的其他代表组合与混合工作区验收见 [UI_SMOKE](UI_SMOKE.md)、[BATCH_CONFIG](BATCH_CONFIG.md)、[MODEL_BUILD](MODEL_BUILD.md) 和状态记录；不将它们扩大为全部 462 组合已实测。

## 文件保护回归

`packages/create/test/file-protection.test.mjs` 在受控临时目录验证：四种框架语言的 UI 输出 junction、入口父目录 junction、悬空创建目标、祖先链接、安装期间新增冲突文件或修改入口。拒绝时不得写入站外目录、覆盖用户入口/配置或继续格式化。依赖安装的已发生变化保留，不宣称回滚安装。

UI/CSS 仅格式化本次新增/修改的源文件、配置和 package.json；大屏/Three/UI Smoke 继续定向格式化。原有业务 App、文档及兄弟应用不是格式化目标。

Ant Design Vue 另补充 pnpm 的 core-js: false 构建脚本规则并定向格式化根 YAML，保留已有明确策略。首次依赖安装被 pnpm 拒绝时保留现场，通过 --apply-existing 重试后检查/构建通过，不放开全局脚本权限。

## 后续主线

三引擎逐应用预设、多引擎选择、GLB/.adui 与 env 自动构建加载已接入；真实检查、构建与浏览器证据以状态记录为准，详见 [CESIUM](CESIUM.md)、[BABYLON](BABYLON.md)。Cesium/Babylon 的 Vue TS、React JS 代表组合已补验大屏缩放、DPR、原生全屏和卸载重挂。新增三种 UI 的验收页生成与代表组合渲染已补齐，生成失败报告、只读预检/规划及显式新建缺失应用已接入。Windows 本地候选交付说明已收尾，下一阶段进入实际项目试用和问题修复；不扩展模型查看器体验。新增需求另行明确，基础工程来源保持官方模板。

2026-10-29：CLI/JSON 多引擎编排已接入，交互已支持逗号多选，联合构建与浏览器证据分开记录，见 [说明](MULTI_ENGINE.md)。

## 已有工作区恢复边界

已实现失败阶段报告 → 只读 --inspect-workspace → 人工 --plan-recovery → 显式 --execute-recovery。执行入口仅新建缺失应用，初始人工阻塞零执行，已存在应用跳过，逐应用重检、失败即停；部分完成应用仍需人工处理，不提供覆盖式续跑或自动回滚。Vue JS 与 React TS 的官方真实新建、验收页生成、重复跳过、构建和检查已有记录。V1 帮助、示例和验收入口见 [集中清单](V1_ACCEPTANCE.md)；不增加恢复模式或演示页功能。
