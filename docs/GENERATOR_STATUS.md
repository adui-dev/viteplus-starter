# 生成器能力与验收范围

更新日期：2026-10-28。本项目是 Vite+ 项目生成器；大屏、UI、Three 和模型查看页面是集成验收入口，不是独立业务产品。验收页已有最小渲染、点击和清理能力，不优先扩展旋转缩放等查看器体验。

## 需求核对

| 需求              | 当前能力                                                                   | 尚未完成或范围限制                                                                       |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| FR-001 官方模板   | Vue/React × TS/JS；官方 Application/Monorepo 入口已实测                    | 不维护自有框架工程模板                                                                   |
| FR-002 交互       | 名称、框架、语言、UI/CSS、大屏、Three/Cesium、模型保护与确认/取消          | 尚无引擎多选                                                                             |
| FR-003 UI         | Vue Element Plus/Ant Design Vue/TDesign，React Ant Design/TDesign 生成计划 | 实际组件渲染仅验收 Vue TDesign、React Ant Design；不把依赖安装或首页构建视为组件渲染完成 |
| FR-004 CSS        | UnoCSS/Tailwind 配置及代表组合已验收                                       | 未逐一真实构建全部 UI/CSS 组合                                                           |
| FR-005 大屏       | 四种模式、坐标换算、浮层、全屏及 Three/Cesium 原生像素引擎层               | Cesium 全屏/DPR 专项与 Babylon 适配仍待验收                                              |
| FR-006 引擎       | 按应用选择 none/three/cesium、按需加载、实例清理                           | Babylon、多引擎多选未实现；Cesium 首期仅本地椭球                                         |
| FR-007 模型保护   | GLB → .adui、自动构建/加载、按应用密钥、KEY 脚本及关闭选项                 | FBX/OBJ、压缩格式及其他引擎未实现；客户端拆分提高复用门槛，不能视为不可提取              |
| FR-008 工作区隔离 | 官方 pnpm apps/*，逐应用和批量配置、不同框架/语言/预设                     | 自定义布局与其他包管理器未支持                                                           |
| FR-009 UI 验收页  | Vue TDesign / React Ant Design，TS/JS、点击及 CSS 验收                     | 工具不支持其他 UI 组件库的渲染验收                                                       |
| FR-010 批量生成   | 严格 JSON、全量预检、顺序执行、dry-run 和失败摘要                          | 无自动回滚或覆盖式续跑                                                                   |
| FR-011 本地 GLB   | 贴图、相机适配、替换/清除/卸载，用户模型已实测                             | 仅自包含 GLB，非业务查看器路线                                                           |
| NFR-001 可靠性    | 名称/选项校验、路径保护、重复输出拒绝、安装后复查                          | 失败保留依赖安装和现场；不承诺事务性或抵御恶意并发文件系统替换                           |
| NFR-002 本地验证  | 单元测试、文档检查、Vite+ 检查及代表项目构建                               | 全部手动本地执行，无流水线或发布                                                         |
| NFR-003 维护      | 需求、设计、索引、ADR 与实施记录                                           | 每次新增预设同步更新覆盖范围                                                             |

具体实现和历史实测记录分别见 [需求](REQUIREMENTS.md)、[代码索引](CODEBASE_MAP.md)、[状态记录](PROJECT_CONTEXT.md)。

## 组合计划验证

运行 `node scripts/verify-generator-matrix.mjs`。矩阵覆盖 Vue 的 4 种 UI 选择、React 的 3 种 UI 选择，TS/JS、3 种 CSS、6 种增强配置，共 252 个有效组合。

六种增强配置分别为：不启用大屏、只启用大屏、Cesium、Three + 关闭保护、Three + embedded、Three + external。验证官方命令与语言模板、按框架隔离依赖、已有 Vite 字段及入口保留、新增文件不冲突、无输出路径越界及模型计划不含密钥。

| 项目            | 计划数量 | 实际创建/构建数量 |
| --------------- | -------- | ----------------- |
| 总组合          | 252      | 本命令为 0        |
| 支持的 UI Smoke | 72       | 本命令为 0        |
| 大屏            | 210      | 本命令为 0        |
| Three           | 126      | 本命令为 0        |
| Cesium          | 42       | 本命令为 0        |
| 模型保护        | 84       | 本命令为 0        |

计划验证不会安装依赖、创建项目或生成 KEY。它不能证明全部组合在当前依赖版本下可构建或渲染。真实生成项目必须另跑 vp check、vp run build；需要组件效果时还要浏览器验收。

## 本轮补验项目

以下四个项目在仓库外使用官方入口创建，均通过 vp check 与 vp run build；详细记录见 [本轮状态记录](PROJECT_CONTEXT.md)。

| 项目                    | 配置                                       | 本轮验证层次                                                             |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------------------ |
| audit-element-vue-js    | Vue JS / Element Plus / Tailwind           | 依赖安装、配置生成、检查及正式首页构建；不含 Element Plus 组件渲染声明   |
| audit-antd-vue-ts       | Vue TS / Ant Design Vue / UnoCSS           | 依赖安装、配置生成、检查及正式首页构建；不含 Ant Design Vue 组件渲染声明 |
| audit-tdesign-react-js  | React JS / TDesign / UnoCSS                | 依赖安装、配置生成、检查及正式首页构建；不含 TDesign 组件渲染声明        |
| audit-preserve-react-ts | React TS / Ant Design / Tailwind，首次补装 | 配置增量集成、检查/构建及无关文件不被格式化                              |

已完成的其他代表组合与混合工作区验收见 [UI_SMOKE](UI_SMOKE.md)、[BATCH_CONFIG](BATCH_CONFIG.md)、[MODEL_BUILD](MODEL_BUILD.md) 和状态记录；不将它们扩大为全部 252 组合已实测。

## 文件保护回归

`packages/create/test/file-protection.test.mjs` 在受控临时目录验证：四种框架语言的 UI 输出 junction、入口父目录 junction、悬空创建目标、祖先链接、安装期间新增冲突文件或修改入口。拒绝时不得写入站外目录、覆盖用户入口/配置或继续格式化。依赖安装的已发生变化保留，不宣称回滚安装。

UI/CSS 仅格式化本次新增/修改的源文件、配置和 package.json；大屏/Three/UI Smoke 继续定向格式化。原有业务 App、文档及兄弟应用不是格式化目标。

Ant Design Vue 另补充 pnpm 的 core-js: false 构建脚本规则并定向格式化根 YAML，保留已有明确策略。首次依赖安装被 pnpm 拒绝时保留现场，通过 --apply-existing 重试后检查/构建通过，不放开全局脚本权限。

## 后续主线

Cesium 首期已实现，四种框架/语言双入口构建及混合工作区检查通过；Vue/React 代表页面完成本地椭球和卸载重挂验收，详见 [CESIUM](CESIUM.md) 与状态记录。接下来推进 Babylon 生成预设，再设计多引擎选项。新增预设仍通过官方基础模板增强，不把验收页面体验当作生成器功能完成条件。
