# 代码索引

## 2026-10-26 P3 结构更新

- `packages/create/src/format-config.mjs`：向 Vite+ 根 `fmt.ignorePatterns` 安全合并 Vue 自动生成的 `src/components.d.ts`。
- `packages/create/test/format-config.test.mjs`：默认 fmt、已有格式规则、幂等、异常结构测试。

- `packages/create/src/vite-config.mjs`：内联 Vite 插件和已知旧版 `starter.plugins` 引用迁移。
- `packages/create/src/integrations.mjs`：执行 `vp fmt . --write`，提供不重装依赖的旧项目修复函数。
- `packages/create/bin/cli.mjs`：新增 `--repair-existing`，保留 `--apply-existing`。
- 新生成项目不再创建 `starter.plugins.ts`；该文件仅可能存在于旧版本，修复后保留 `.bak` 备份。

> 本文件仅列出本次初始化实际新增的关键路径。规划模块不视为已存在。

| 路径                                                 | 作用                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| `package.json`                                       | 工作区根信息及本地检查入口                                            |
| `pnpm-workspace.yaml`                                | packages 工作区声明                                                   |
| `vite.config.ts`                                     | 根部 Vite+ 最小配置，尚未做完整构建验证                               |
| `packages/create/bin/cli.mjs`                        | 初始化 CLI 入口                                                       |
| `packages/create/src/cli-args.mjs`                   | 参数白名单和重复参数校验                                              |
| `packages/create/src/prompts.mjs`                    | 项目交互选择、确认和取消                                              |
| `packages/create/test/cli.test.mjs`                  | 交互流程与参数解析单元测试                                            |
| `packages/create/src/integrations.mjs`               | UI/CSS 依赖计划、配置与样式生成、安装接入                             |
| `packages/create/src/vite-config.mjs`                | 安全识别官方 Vite+ 顶层插件字段、兼容 lazyPlugins 并注入 Starter 插件 |
| `packages/create/test/vite-config.test.mjs`          | 插件字段多形态识别、嵌套字段与未知结构回归测试                        |
| `packages/create/test/integrations.test.mjs`         | UI/CSS 兼容规则和生成文件单元测试                                     |
| `packages/create/src/options.mjs`                    | 创建选项白名单校验及官方命令组装                                      |
| `packages/create/test/options.test.mjs`              | 创建选项基础单元测试                                                  |
| `scripts/validate-docs.mjs`                          | 本地文档检查                                                          |
| `.agents/skills/starter-preset-development/SKILL.md` | 本项目可复用的集成预设开发工作流                                      |
| `AGENTS.md`                                          | Agent 规则及导航入口                                                  |
| `docs/`                                              | 需求、架构、设计、状态、Skills、Harness、ADR                          |

UI/CSS 已在 `integrations.mjs` 实现；大屏核心见 `packages/screen`；Three.js 核心见 packages/three；其他引擎与生产授权服务尚未实现；.adui 加解密见文末。

## P4 Monorepo 多应用

- `packages/create/src/workspace.mjs`：工作区预检、安全成员路径、同名包检查和根声明忽略规则增量合并。
- `packages/create/test/workspace.test.mjs`：官方命令参数、配置隔离、目录与 junction 保护、真实 CLI dry-run/覆盖拒绝。
- `docs/MONOREPO.md`：逐应用创建、检查及边界说明。
- `packages/create/src/batch.mjs`：JSON 严格校验、无写入批量计划、官方顺序执行与失败摘要。
- `packages/create/test/batch.test.mjs`：真实 CLI dry-run、冲突与路径保护、顺序执行及失败保留现场测试。
- `examples/monorepo.batch.json`、`docs/BATCH_CONFIG.md`：可执行配置样例与字段/运行说明。

## UI Smoke 验收工具

- `packages/create/src/ui-smoke.mjs`：在已有应用内生成隔离 UI 验收页，React 组件与挂载入口分离，不覆盖业务文件。
- `packages/create/test/ui-smoke.test.mjs`：涵盖 Vue/React、JS/TS、依赖预检、文件覆盖保护。
- `docs/UI_SMOKE.md`：独立页面的运行、人工验收和清理说明。

## P5：分层大屏适配

- `packages/screen/src/core.mjs`：纯布局、独立轴比例、设计单位内缩、坐标反算；controller.mjs 负责 DOM 测量、合帧、全屏与清理。
- `packages/screen/src/vue.mjs`、react.mjs 与对应声明：框架组件、上下文、分层插槽与公开操作；style.css 定义引擎/HUD/浮层。
- `packages/create/src/screen-options.mjs`：CLI/批量严格输入归一化；screen.mjs：源码快照和独立页面预检/写入；screen-demo.mjs：Vue/React 演示。
- `packages/screen/test/screen.test.mjs`、`packages/create/test/screen.test.mjs`：布局边界、坐标、控制器清理、四种生成组合、路径/覆盖与批量参数保护。
- [SCREEN](SCREEN.md)、[配置示例](../examples/screen.batch.json)：API、迁移和验收边界。

## Three.js 真实场景

- packages/three/src/index.mjs、index.d.mts：createThreeScene 引擎绑定与声明。
- packages/three/src/runtime.mjs、test/runtime.test.mjs：缓冲尺寸、DPR、相机、拾取、动画、异常与资源回收。
- packages/create/src/three-smoke.mjs、test/three-smoke.test.mjs：四种应用计划、固定版本安装、独立页面及覆盖/版本/链接保护。
- [THREE_SMOKE](THREE_SMOKE.md)：命令、API 与专项构建/浏览器验收。

## Three.js 选项与延迟加载

- packages/three/src/lazy.mjs、lazy.d.mts、test/lazy.test.mjs：点击后加载、去重、重试、延迟 DPR、卸载和晚到模块保护。
- packages/create/test/engine.test.mjs：CLI/JSON 严格引擎选择、阶段隔离、真实 dry-run 与组合补装保护。
- [three.batch.json](../examples/three.batch.json)：官方混合工作区完整引擎示例；使用说明见 [THREE_SMOKE](THREE_SMOKE.md)。

## GLB 模型加载

- packages/three/src/model.mjs、test/model.test.mjs：GLB 预检、包围球归一化、请求代次、晚到/失败清理、资产去重。
- runtime/index/lazy 与声明：加载/清除 API、内嵌贴图、PBR 环境、相机适配；ThreeView：本地文件选择。
- workspace.mjs/工作区测试：新 Vue JS 成员的独立声明作用域，不覆盖官方 env 或已有配置。

## .adui 模型加密

- packages/model-security/src/adui.mjs 与声明：认证封装、元数据预检、授权 grant、到期/取消和解密。
- packages/model-security/src/local-grant.mjs 与声明：仅本地验收的密钥导入与失效。
- packages/model-security/bin/cli.mjs：keygen/encrypt、安全路径和 .adui 无覆盖输出。
- packages/model-security/test/adui.test.mjs、cli.test.mjs：原生互操作、篡改、授权与真实 CLI。
- Three lazy/model/runtime：授权晚到保护、取消与清理；three-smoke：四组合密钥/模型入口。
- [MODEL_SECURITY](MODEL_SECURITY.md)：v1 格式、命令、浏览器 API 与生产授权契约。

## 模型自动打包

- model-security/src/vite.mjs、vite.d.mts、virtual-models.d.ts：env、扫描/监听、虚拟目录、拆分密钥、域名与产物检查。
- src/setup.mjs、smoke.mjs、bin/setup.mjs：增量安装、Vite 原件备份、四组合独立页面。
- src/bundled.mjs、offline-keyring.mjs 与声明：同源限长获取及可选离线解锁。
- test/vite.test.mjs、offline.test.mjs、setup.test.mjs：保护边界和安装/加载测试。
- scripts/verify-model-build.mjs：真实 Vite+ 构建、HTTP 和加密回归；[MODEL_BUILD](MODEL_BUILD.md) 为使用指南。

## 创建器模型保护与 KEY 管理

- create/src/model-protection.mjs、test/model-protection.test.mjs：无密钥计划、预检、生成集成与模式/交互/批量验证。
- create/options、cli-args、prompts、batch 与 CLI：按应用 modelProtection 默认与显式覆盖。
- model-security/src/project-key.mjs、test/project-key.test.mjs：项目 KEY 生成/备份轮换及链接/覆盖保护，复制为 adui-model-build/keygen.mjs。
- model-security/setup：追加 package 脚本和忽略规则，并备份原 package/Git 配置。
- [models.batch.json](../examples/models.batch.json)：四种框架语言 + 关闭模式，详见 [MODEL_BUILD](MODEL_BUILD.md)。

## 生成器质量核对

- create/src/safe-paths.mjs：目标及祖先路径检查；file-protection.test.mjs：链接、悬空目标、安装期间修改与站外保护。
- create/src/build-policy.mjs、test/build-policy.test.mjs：Ant Design Vue 的 core-js 安装脚本显式禁用策略，保留已有根配置与用户选择。
- scripts/verify-generator-matrix.mjs、create/test/generator-matrix.test.mjs：462 个有效组合的只读计划/配置隔离检查，不执行实际构建。
- [GENERATOR_STATUS](GENERATOR_STATUS.md)：需求状态、实测边界与主线优先级。

## Cesium 生成预设

- create/src/engine.mjs、cesium.mjs：按引擎计划、四组合页面、依赖/catalog 检查、配置备份与路径保护；test/cesium.test.mjs 覆盖安装、冲突和工作区隔离。
- packages/cesium/src/lazy.mjs、test/lazy.test.mjs：延迟导入、重试、晚到与实例清理；scene/demo：无 Token 椭球及点击入口；vite：四类静态资源映射。
- packages/cesium/src/model.mjs、test/model.test.mjs：共享 GLB/.adui 前置检查、候选 ready/error/超时、替换与取消、Blob URL/模型回收；scene 绑定公开 Model API 和示例地理位置。
- Cesium lazy/loadBundledModel：同源目录下载、默认部署 base、外部取消与模型提交；共享 setup/smoke 支持 Cesium 自动构建，model-protection 测试核对保留 Cesium 插件与旧快照拒绝。
- scripts/verify-cesium-build.mjs：双入口真实构建及 base/资源目录检查；[CESIUM](CESIUM.md)、[批量示例](../examples/cesium.batch.json)。

## Babylon 生成预设

- create/src/babylon.mjs、test/babylon.test.mjs：四组合页面、依赖/catalog 校验、链接与输出保护、交互和批量隔离；engine/CLI/prompts 统一入口。
- packages/babylon/src/runtime/lazy：Engine/Scene、渲染循环、延迟导入、画布与尺寸观察；test/lifecycle.test.mjs 验证异常、晚到、重试和清理。
- scene/demo：本地立方体、模型归一化与文件/授权验收入口；loader/model：动态 glTF AssetContainer 加载、替换/取消/清理，test/model.test.mjs 覆盖认证与晚到边界。
- model-security/src/glb.mjs：三引擎共用的纯 GLB 校验；生成源码及模型构建工具均复制该文件。
- Babylon lazy/loadBundledModel：同源密文下载、初始化与授权解密，取消和清除失效旧下载；共享 smoke/setup 按适配引擎生成同一个 model-smoke 页面。
- scripts/verify-model-app.mjs：生成应用双入口构建、base、密文解密一致性与原模型/KEY 字面量检查；存在 Cesium 预设时补验四类静态资源，输出 dist/model-verify。
- scripts/verify-babylon-build.mjs：[双入口专项](BABYLON.md)，[批量示例](../examples/babylon.batch.json)。

create/src/multi-engine.mjs、test/multi-engine.test.mjs：多选校验、规范顺序、失败停止、应用隔离；scripts/verify-multi-build.mjs：联合构建，见 [说明](MULTI_ENGINE.md)。

engine-prompts.test.mjs：多选解析、摘要/取消、Three 保护提示；verify-multi-build.mjs 新增静态依赖遍历，拒绝首屏依赖引擎分块。

## 2026-10-29：引擎大屏专项

- packages/screen/src/viewport.mjs：有效 DPR 限制，容器/窗口/全屏/媒体查询监听与 DPR 逐帧兜底、卸载清理。
- packages/babylon/src/resolution.mjs、packages/cesium/src/resolution.mjs：各引擎公开分辨率 API 适配；lazy 模块持有观察器清理函数。
- packages/create/src/engine-screen-smoke.mjs：Vue/React 两引擎独立验收页的模式、容器和全屏控件。
- packages/screen/test/viewport.test.mjs、packages/create/test/engine-screen-smoke.test.mjs：比例/隐藏/硬件边界、DPR 无事件兜底及清理、四种框架语言计划的回归验证。

## UI Smoke 扩展

- packages/create/src/ui-smoke.mjs：五种 UI 预设、TS/JS 独立页面、对应依赖/resolver 校验与文件保护。
- packages/create/test/ui-smoke.test.mjs、batch.test.mjs：30 个基础页面计划、新 UI 写入/拒绝及批量应用隔离回归。
- scripts/verify-ui-build.mjs：保留原配置的首页+组件验收页双入口生产构建。
- verify-generator-matrix 与对应测试：UI Smoke 计划扩展为 330，总计划仍为 462。

## 失败恢复信息

- packages/create/src/recovery.mjs：阶段错误上下文、现场保护说明、仅用于人工审阅的 argv/PowerShell 指引。
- packages/create/bin/cli.mjs：官方模板、集成和工作区整理执行阶段标记，保留官方非零退出码。
- packages/create/src/batch.mjs：从重建后的计划生成未执行步骤指引，失败步骤保留为人工检查。
- packages/create/test/recovery.test.mjs、batch.test.mjs：错误原因/退出码、无自动重试、参数转义、CLI 失败文件保留及批量阶段边界。

## 已有工作区检查

- packages/create/src/workspace-inspect.mjs：只读成员清单、预期应用的声明/文件检查与 JSON 状态；复用现有校验和生成计划。
- packages/create/src/cli-args.mjs、bin/cli.mjs：--inspect-workspace 参数及隔离的只读 CLI 分支。
- packages/create/test/workspace-inspect.test.mjs：清单/预设缺失、语言与配置歧义、重复包名、junction、路径遍历、秘密内容不输出、CLI 退出码及写入选项拒绝。

## 逐应用恢复计划

- packages/create/src/workspace-recovery.mjs：只读计划、全局/应用阻塞分类、缺失应用再次预检及条件新建步骤。
- packages/create/src/application-invocations.mjs：批量生成和恢复指引共用的逐应用 argv 构造。
- packages/create/src/workspace-inspect.mjs：共用预期 JSON 读取与同配置检查入口，不回显配置内容。
- packages/create/test/workspace-recovery.test.mjs：混合状态、全局/作用域冲突、多引擎和大屏参数、CLI 只读及参数隔离、链接拒绝。
