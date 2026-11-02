# V1 本地验收与交付范围

本项目交付 Vite+ 项目生成器及逐应用预设。当前为本地已验证能力的收尾清单；没有据此发布 npm/Release，也不将所有组合标为完成。详细实测证据见 [项目状态](PROJECT_CONTEXT.md)，当前覆盖见 [能力表](GENERATOR_STATUS.md)。

当前交付验收平台为 Windows（用户于 2026-10-30 明确）；Linux/macOS 不在本阶段要求内，也未验证，不作为 Windows 交付的阻塞条件。

本文中的本地项目路径和“现场/产物保留”描述记录各轮验收当时的状态，不要求测试工程永久保留。用户于 2026-11-02 要求清理之前创建的测试项目，后续目录清理情况见 [项目状态](PROJECT_CONTEXT.md)；清理不表示重新执行或扩大此前的验收范围。

## 独立 CLI 本地包验收（2026-11-02）

后续键盘交互改版：使用 Vite+ 官方提示组件 1.4.0，Windows TTY 的 Vue/React 方向键单选、空格勾选引擎、空引擎列表、方向键选择 No 和 Ctrl+C 取消均已验证，无目标写入。包新增提示运行时依赖声明，旧数字菜单 tgz 不会自动更新；268 项回归和冻结安装通过，详见项目状态。此轮没有重新创建用户项目或扩大应用构建/渲染声明。

已验证自包含 tgz 的真实离线安装、Windows 命令 shim、npm exec 与 vp dlx 调用、两框架完整向导选择后取消。代表 Vue TS/Element Plus/Tailwind/大屏应用经 tgz 入口实际创建，check、完整类型/首页构建、tgz 入口生成 UI 页及双入口构建通过；临时安装、缓存和应用均清理。详细环境、首次网络重试和未覆盖范围见 [CLI 本地包实测](CLI_DISTRIBUTION.md#2026-11-02-本地包实测)。该包仍 private/0.0.0，未发布 npm/Release，GitHub 模板下载仍是两步流程。

## 正常编码应用补装与构建复验（2026-11-02）

新建隔离 D:/Workspace/adui-studio/adui-clean-maintenance-vue-ts-20261102，由当前 CLI 委托官方 vite:application 的 vue-ts 模板生成；Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0。应用清单为无 BOM UTF-8，原 test-vue、BOM 对照副本及其他实际工程未改动。

在父目录用 --apply-existing 首次补装 Element Plus/Tailwind CSS，再用 --ui-smoke 创建独立页，两次均退出 0，新编码预检正常放行。实际安装为 Element Plus 2.14.7、Tailwind/@tailwindcss/vite 4.3.3、unplugin-vue-components 32.1.0；这些是新验收工程的依赖，生成器仓库依赖和锁文件未变。

应用 vp run build 的 vue-tsc -b 与首页构建 2/2 通过，verify-ui-build 的 /ui-check/ 首页+UI 双入口构建通过，最终 vp check 为 20 格式/8 代码文件通过，无 lint/类型警告或错误。保留双入口构建的插件耗时提示，产物在 dist 和 dist/ui-verify，临时 verify-ui.config.mjs 已清理。

正式入口仍先导入本地 normalize.css，再导入 starter.tailwind.css 和原样式；从官方创建后、补装前保存的 App.vue、HelloWorld.vue、style.css、normalize.css 和 MIT 许可共 5 项文件，其内容 SHA256 与 mtime 在补装及构建后均保持。正式 main、Vite 配置和依赖按所选 UI/CSS 增量修改，未写入业务首页内容。

构建后不选择 UI/CSS 的 --apply-existing 退出 0 且未重复写入；重复选择相同 UI/CSS 补装、重复 --ui-smoke 均退出 1，分别报告补装预检及 UI 验收页阶段。三次维护前后 30 项 Git 可见文件的 SHA256 与 mtime 一致。工作区和产物保留，该创建/构建轮未进行浏览器验收，后续浏览器结果见下；未增加新预设或编码转换行为。

2026-11-02 后续浏览器补验：通过 127.0.0.1:4399/ui-check/ 预览同一 dist/ui-verify 产物，在 Windows 内嵌浏览器默认 411×612 视口验证 UI 页。按钮是原生 BUTTON，类名 el-button/el-button--primary，背景 rgb(64, 158, 255)，点击次数 0→1。Tailwind 区域为 bg-emerald-100/text-emerald-800，实际背景 oklch(0.95 0.052 163.051)、文字 oklch(0.432 0.095 166.913)、圆角 8px、内边距 16px，截图确认浅绿色区域和深绿色文字可见。

同一生产产物的正式首页显示官方 Get started 页面，Count is 0→1；两个页面观察到的 warn/error 日志均为空。验收后与先前 30 项 Git 可见文件基线比较，内容 SHA256 和 mtime 全部保持。UI 点击后截图 adui-clean-maintenance-vue-ts-20261102-ui-smoke-visible-20261102.jpg、首页截图 adui-clean-maintenance-vue-ts-20261102-home-20261102.jpg 保留在 D:/Workspace/adui-studio 仓库外。本轮临时标签和 4399 服务已关闭，未设置视口覆盖，未改动生成器源码、应用文件或依赖；仅补齐同一代表配置的浏览器证据，不扩大为全部环境/组合通过。

## 应用清单 BOM 工具链实测（2026-11-02）

隔离目录 D:/Workspace/adui-studio/adui-bom-app-probe-20261102 复制既有官方 React JS 测试工程的 Git 可见源码，仅用于编码对照，不作为新的生成模板；未复制 node_modules 或 .git。Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0 下，vp install --offline --frozen-lockfile 下载 0 项、复用 88 项，check 11 格式/3 代码文件及完整 vp run build 通过。prepare 提示找不到 .git，未将其计为 Git hooks 验收。

只在该副本 package.json 字节前添加 UTF-8 BOM 后，命令结果如下：

| 命令                                    | 退出码 | 结果                                                  |
| --------------------------------------- | ------ | ----------------------------------------------------- |
| vp check                                | 0      | 格式、lint 和类型检查通过                             |
| vp fmt src/styles/normalize.css --write | 0      | 指定静态 CSS 可格式化                                 |
| vp run build                            | 1      | Failed to resolve vite command / Unexpected token BOM |
| vp install --offline --frozen-lockfile  | 1      | Install error: expected value at line 1 column 1      |

这些命令未改写带 BOM 清单的内容。由此增加 CLI 写入前兼容性预检：补装、旧修复及 UI/Three 验收页在原阶段中先拒绝应用 BOM 清单，报告路径并提示人工保存为 UTF-8 无 BOM；只读 API 和预览继续支持读取，不自动转换用户文件。

修复后的真实 CLI 对该副本执行 --apply-existing，退出 1、阶段为补装预检、已完成为无，20 项复制源文件的 SHA256 和 mtime 均保持。五种维护入口另有隔离回归，含独立/工作区、多引擎及只读预览。副本与产物保留，BOM 未移除；没有修改原测试工程、安装 UI/引擎、浏览器验收或新增 CI/CD。

## BOM 工作区真实工具链验收（2026-10-30）

隔离目录 D:/Workspace/adui-studio/adui-bom-validation-20261030 由官方 vite:monorepo 创建，使用 Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0。保留默认 website/utils，在根 JSON 和首行为 allowBuilds/core-js:false 的 YAML 中加入 BOM，验证生成器之外的真实工具链。

首次 Vue 调用在官方模板阶段报 expected value at line 1 column 1，应用目录尚未生成，但旧顺序已准备 peer。仅在该隔离目录人工去除根 package.json BOM、保留 YAML BOM 后重试，官方 Vue TS/Ant Design Vue/UnoCSS 创建及 UI 页成功；不称为首次无干预全链路成功。此发现补充了编码预检：根 JSON 带 BOM 且目标缺失时，直接创建与恢复规划提前拒绝，不写 peer 或自动转换用户清单；只读检查和全部已有应用跳过继续可用。

随后用带 BOM 的预期 JSON 规划并执行恢复，仅新建 React JS/Ant Design/Tailwind 及 UI 页，Vue 跳过。YAML BOM 在 Vue 集成、React 恢复及最终检查后均保留，allowBuilds/packageExtensions 各一个块，core-js:false 保持，根无框架/UI/CSS 直接依赖。两应用的本地 normalize 仍是正式入口首条导入，未添加 normalize npm 包。

无缓存 vp run --no-cache ready 8/8 成功，包含默认库测试、Vue 类型检查与两应用完整构建；Vue /ui-check/、React ./ 两组首页+UI 双入口构建通过，最终 vp check 为 49 格式/20 代码文件通过。保留 TypeScript 7 API 实验性、UnoCSS 多入口和构建性能提示，没有关闭检查规则。本轮没有浏览器渲染或点击验收。

官方默认成员 19 项文件及恢复前 Vue 的 25 项文件内容与 mtime 保持；最终检查/规划/重复恢复均通过，恢复 completed=[]、skipped=2。两组重复创建与重复 UI 页共四次拒绝，维护前后 74 项 Git 可见文件内容及 mtime 一致，临时构建配置均清理。工作区及构建产物保留，临时预期 JSON/哈希记录清理；原 test-vue 与其他既有工作区未改。

生成器全量 252/252 测试、文档校验和根 vp check 通过；新增回归确认根 BOM 的新建限制发生在共享配置写入前。以上证据覆盖 YAML BOM 的这两组实际路径，JSON BOM 的安全读取与官方创建限制分别记录，不推广为所有 BOM/预设组合均可构建。

日常创建、添加应用、验收页、模型与恢复命令集中在 [Windows 操作指南](WINDOWS_GUIDE.md)。本清单记录验收层次与证据；后面的日期记录是历史实测，不代表每次文档更新都重新生成或验证全部项目。

## 本地交付核对

当前按 Windows V1 本地候选范围提供源码和操作说明，仓库版本仍为 0.0.0/private，未发布 npm/Release。

| 核对项               | 当前证据与边界                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- |
| 官方工程来源         | Vue/React × TS/JS、官方 Monorepo 与默认成员保留已有真实创建/完整构建证据；见项目状态      |
| UI/CSS               | 五种框架/UI 均有代表真实渲染，UnoCSS/Tailwind 有代表证据；未穷举所有组合                  |
| 大屏与三引擎         | 逐应用按需集成、独立页面、DPR/原生全屏/卸载已有代表实测；不提供同页混合引擎运行时         |
| 模型与 KEY           | 自包含 GLB/.adui、两种保护模式、KEY 生成/轮换及构建检查已有记录；不宣称客户端密钥无法提取 |
| 工作区与恢复         | 新建、只读检查/规划、仅新建缺失应用及重复跳过均有记录；部分完成应用人工处理               |
| Windows 路径与运行时 | Node 22.18.0 专项及中文/空格路径的创建、恢复、完整构建和保护哈希记录见下文                |
| 本地检查             | 执行下文仓库检查，示例/矩阵始终只计计划；真实构建与浏览器记录分开                         |
| 未纳入当前交付       | 其他系统、自定义布局、覆盖式恢复、其他模型格式/解码器、发布及部署                         |

本地候选范围的主要流程已具备代表实测证据，后续进入实际 Windows 项目试用及问题修复。新增需求另行明确；不为继续开发而自动扩展演示功能、引擎或发布流程。

## 入口选择

| 目标                  | CLI 入口                                               | 是否写入                       |
| --------------------- | ------------------------------------------------------ | ------------------------------ |
| 新建单应用            | --name / --type application / --framework，语言默认 ts | 是，委托官方模板               |
| 新建官方工作区        | --name / --type monorepo                               | 是，根不指定语言               |
| JSON 新建工作区与应用 | --config，先配 --dry-run 预览                          | 实际执行时写入                 |
| 已有工作区添加应用    | --workspace 加逐应用选项                               | 是，目标必须不存在             |
| 已有应用首次补装预设  | --apply-existing                                       | 是，已有输出冲突拒绝           |
| 查看已有工作区        | --inspect-workspace，可配 --config                     | 只读                           |
| 规划逐应用恢复        | --plan-recovery，必须 --config                         | 只读                           |
| 显式新建缺失应用      | --execute-recovery，必须 --config                      | 是；已有应用跳过，部分完成阻塞 |
| 组件库独立验收        | --ui-smoke，带对应框架/语言/UI/CSS                     | 只添加验收文件                 |
| 旧版引用修复          | --repair-existing                                      | 修复已知旧配置，保留旧插件备份 |

检查/规划/恢复入口互斥，不与单项目创建参数混用。恢复执行不运行保存的计划 JSON 或 PowerShell 展示文本。参数详见 node packages/create/bin/cli.mjs --help；完整示例见 [示例索引](../examples/README.md)。

## 生成器仓库检查

```powershell
node --test
node scripts/validate-docs.mjs
node scripts/verify-examples.mjs
node scripts/verify-generator-matrix.mjs
vp check
```

示例工具只预览 8 个 JSON、20 个应用计划；组合工具只验证 462 个计划（含 330 个 UI Smoke 计划），二者 actualBuilds 都为 0。它们与单元测试分别检查真实 CLI 预览、选项/输出计划和失败边界，不能代替下述实际创建与运行。

## 端到端验收顺序

1. 在生成器仓库上级目录，使用 examples/monorepo.batch.json 先 dry-run，再实际新建一个不存在的目标。新建根与应用都必须经官方 Vite+ 入口，保留 website/utils。
2. 在新工作区运行 vp run ready、vp check。Vue TS/JS、React TS/JS 需至少分别执行各自完整 build 脚本；类型检查不能只用一个 vp build 代替。UI/CSS 及预设依赖留在各自应用。
3. UI 项目运行 verify-ui-build；大屏/引擎和模型按各自专项脚本验证独立入口与部署 base。临时构建配置结束清理，不与同一工作区其他构建并行。详见 [Harness](HARNESS.md)。
4. 浏览器验证实际组件、点击、CSS；大屏验证模式、容器尺寸、原生全屏与 canvas 缓冲区；模型用自包含 GLB 与对应 .adui 验证加载及清理。只运行正式首页构建不算独立验收页已渲染。
5. 用原 JSON 对已有工作区运行 inspect、plan；确认结构完整的已有应用只给出验证建议，部分完成应用列明人工处理，只有不存在且预检无冲突的应用才列出新建步骤。
6. 明确需要补齐缺失应用时运行 execute。确认原有应用文件保持、每阶段前后检查有效；重复执行应无新建步骤。故障/冲突使用受控临时测试验证，失败即停、保留现场，不破坏业务项目制造故障。
7. 核对根/应用清单、App/main、Vite 配置及备份；区分新增应用带来的共享锁/catalog 更新与已有应用源文件修改。保留实际命令退出码、构建和浏览器证据，再更新状态表。

普通 UI、CSS、大屏与三引擎的代表项目、模型加密构建及恢复执行均已有历史真实验证，见各专项文档和 PROJECT_CONTEXT；本轮只核对说明/示例，不重复声称重新完成全部浏览器验收。

## 范围与剩余限制

- 支持 Vue/React × TS/JS；Vue Element Plus/Ant Design Vue/TDesign、React Ant Design/TDesign；CSS none/UnoCSS/Tailwind。五种框架/UI 均有真实代表渲染记录，尚未穷举语言、CSS 和增强功能的全部组合。
- 三引擎逐应用按需加载、GLB/.adui 与 env 模型构建已接入，多引擎只选择一套模型保护配置。仅自包含 GLB、32 MiB 上限；FBX/OBJ、压缩解码器、远端资源和业务查看器不在已实现范围。
- 默认 embedded 无服务端；客户端密钥可被逆向，目标是提高直接复用成本。external 的独立授权来源由业务决定，不将浏览器解密称为无法提取。
- 工作区只支持官方 pnpm `apps/*`、`packages/*`、`tools/*` 布局。部分完成应用人工处理，不自动覆盖、删除、回滚或接管运行中新出现的目录，不承诺事务性或抵御恶意并发文件系统替换。
- 本地真实证据来自 Windows，包含 Node 22.18.0 的专项复验及既有 Node 24/26 记录；其他系统不在当前交付验收范围。Node 支持范围与锁定 Vite+ 1.4.0 一致：`^22.18.0 || ^24.11.0 || >=26.0.0`，并非所有 Node 22。结构/依赖声明存在不代表安装完成或版本兼容。

这些限制是后续兼容性验收事项，不通过新增演示功能掩盖。后续以清单核对发现的实际阻塞为优先，发布与部署另行授权。

## Windows V1 入口与阻塞复核（2026-10-30）

本轮对照当前 CLI、Windows 指南与历史证据，没有在下述复核范围发现新的交付阻塞。继续按本地候选使用，不将未覆盖组合、其他平台或发布流程列为本轮已经完成。

| 本轮检查       | 结果与边界                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 帮助与预览     | --help 成功；8 个 JSON/20 个应用预览、462 个组合计划通过，actualBuilds=0                                               |
| 现有工作区检查 | adui-normalize-validation-20261030 的 8 个成员检查通过；临时预期配置对照 6 个 Vue/React TS/JS 及 UI 应用，全部 present |
| 现有工作区规划 | 6 个应用均为 validate-existing，只列出 vp check 和 vp run build；未运行恢复执行或新建应用                              |
| test-vue 维护  | 单独补齐已知基础样式成功且无写入；重复 Element Plus/Tailwind 补装在“补装预检”拒绝，重复 UI 页在“UI 验收页”拒绝         |
| 原文件保护     | 上述实际调用前后，工作区 149 项、test-vue 30 项 Git 可见文件的 SHA256 与 mtime 一致，临时预期 JSON 已清理              |

近期文件保护修复也已纳入本地回归：补装先预检、UI/CSS 部分引用、Ant Design Vue 策略冲突，以及旧版修复的清单、路径、备份和原 UI/CSS 一致性。旧修复的 17 种历史 TS 插件组合属于隔离夹具迁移验证，不计为 17 次真实应用构建。

本轮 Node 22.18.0 下全量 238/238 测试、文档校验及根 vp check（178 格式/132 代码文件）通过；没有重新安装依赖、运行应用构建或浏览器验收。此前真实构建与渲染证据仍按下文的各次记录使用。

当前阶段转入实际 Windows 项目使用与反馈处理。下一步使用已有入口完成实际项目创建或补装；出现可复现问题时再修复生成器，不为继续开发自动增加预设、查看器功能或新的恢复模式。

## 三应用 UI 示例端到端补验（2026-10-29）

ui-libraries.batch.json 已实际创建 adui-ui-libraries：Element Plus/Vue JS/Tailwind、Ant Design Vue/Vue TS/UnoCSS、TDesign/React JS/UnoCSS。首次批量在 Ant Design Vue 格式化阶段停止：共享 YAML 的相对子路径含 .. 被 Vite+ 拒绝。修复为应用和根策略分别在所属目录定向格式化；未删除失败现场，显式完成剩余步骤。随后在全新 adui-ant-vue-format-regression 中验证根→Ant Design Vue 应用→验收页三阶段一次通过，不将主工作区称为首次无干预生成成功。

主工作区 ready 9/9、最终 vp check 62 格式/28 代码文件通过，三个 UI 双入口构建通过。Chrome 三页均渲染真实组件，点击 0→1，CSS 绿色区域和 16px 内边距正确，warn/error 为空。默认 website/utils 的 19 个文件哈希一致，根无 UI/CSS/框架直接依赖；重复批量和重复三页生成均拒绝，29 项保护文件哈希一致。inspect/plan 状态正确，execute completed=0、skipped=3。构建保留官方 TypeScript API 实验性、UnoCSS 多入口及性能提示，不称为无提示。

本次将该示例的证据从计划补充到实际生成/构建/浏览器层；未改变其他平台、最低 Node 版本或全部组合的未覆盖声明。

## Node 22.18.0 专项复验（2026-10-30）

原 engines.node 的 >=22 过宽，已按锁定 Vite+ 1.4.0 的实际要求修正根与 create 包声明，并同步使用说明。仅安装托管的 22.18.0 缓存，通过进程环境选择，不修改系统 Node、全局默认、项目 pin 或仓库依赖版本；复验步骤见 [Harness](HARNESS.md#node-22-最低版本复验)。

Windows Node 22.18.0 下，210/210 测试、文档检查、8 个示例/20 个应用预览、462 个组合计划及根 vp check 通过。预览与计划的 actualBuilds 仍为 0。另以用户原 DamagedHelmet 执行 verify-model-build，两模式真实构建/解密、明文及密钥 HTTP 403、密文 HTTP 200、模型重加密和 env 轮换失效均通过；原 GLB 哈希保持，临时密钥/目录由工具清理。

仓库外 adui-node22-acceptance 使用临时 JSON 实际生成官方根、四个应用及两个 UI 验收页，共七个阶段成功：

| 应用     | 官方模板 | UI/CSS                | 验收入口 |
| -------- | -------- | --------------------- | -------- |
| vue-ts   | vue-ts   | Ant Design Vue/UnoCSS | UI Smoke |
| react-js | react    | Ant Design/Tailwind   | UI Smoke |
| vue-js   | vue      | none/none             | 官方首页 |
| react-ts | react-ts | none/none             | 官方首页 |

官方创建日志与实际 CLI 进程路径均确认 Node 22.18.0，包管理器为 pnpm 12.16.1。首轮 UI 安装的 pnpm.cmd 曾通过系统 Corepack 的 Node 24 转发，不把首轮安装称为全链路 Node 22。随后将官方 shim 目录放到临时 PATH 首位，确认 node/pnpm 解析来源，再完成离线冻结安装，锁文件 SHA256 一致；同一 Corepack 分发器也另由 Node 22 显式调用并完成冻结安装。

在该受控环境运行 vp run --no-cache ready，11/11 任务无缓存成功，含 utils 测试、四应用完整 build、Vue/React TS 类型检查和官方 website/utils 构建。第一次误把 --no-cache 放在任务名后导致参数被转发给构建器，改正命令后通过，没有为此修改生成源码。两个 UI 应用分别通过 /ui-check/ 与 ./ 的首页+验收页构建，最终 vp check 69 格式/28 代码文件通过。保留 TypeScript 7 API 实验性、UnoCSS 多入口及构建性能提示。

inspect 找到六个成员、四个应用 present；plan 均为 validate-existing；execute completed=[]、skipped=4。上述入口执行前后 48 项根/应用源文件哈希一致，官方 website/utils 的 19 项原文件从添加应用前到验证结束保持一致；根无框架/UI/CSS 直接依赖，临时 UI 构建配置已移除，专项产物保留。临时 JSON 和哈希记录结束清理。

本轮验证 Node 22.18.0 的代表生成器与构建路径，没有新增浏览器验收，也不宣称首次安装始终未经过其他 Node、全部引擎组合或其他操作系统已验证。按用户最新要求，后续仅推进 Windows 路径、创建、恢复及构建验收，不扩大预设或查看器功能。

## Windows 中文、空格路径与恢复验收（2026-10-30）

本轮在 D:/Workspace/adui-studio/Windows 路径验收 20261030/adui-windows-paths 实测，配置文件也带中文与空格：父目录中的初始 配置.json、恢复 配置.json。项目及应用 name 沿用安全的小写 kebab-case，不放宽名称校验。进程 PATH 前置官方 shim，并以 VP_NODE_VERSION 选择 Node 22.18.0；官方生成日志和环境报告确认为该版本，pnpm 12.16.1。

初始配置仅含 admin（Vue TS/Ant Design Vue/UnoCSS/UI Smoke）。在独立父目录 dry-run 列出三阶段且不生成目标，再实际创建官方根、admin 与验收页，三阶段通过。恢复配置追加 portal（React JS/Ant Design/Tailwind/UI Smoke）：inspect 退出 1，分别报告 present、not-created；plan 退出 0，给出 validate-existing、create-missing，路径与两个新建步骤完整。execute 跳过 admin，成功创建 portal 及验收页，未重新集成原应用。

根 vp run --no-cache ready 8/8 成功，包含官方默认成员、Vue TS 类型检查及两应用完整构建。两个 UI 双入口构建分别通过 /ui-check/、./，最终 vp check 47 格式/20 代码文件通过；TypeScript 7 API 实验性及 UnoCSS 多入口提示保留。没有新增浏览器验收或扩大为所有引擎路径已验证。

完成后 inspect 识别四个成员、两个应用 present；plan 均为 validate-existing；重复 execute completed=[]、skipped=2。重复批量创建与重复生成两页均拒绝，维护与拒绝期间 33 项根/应用文件哈希一致；恢复前保存的 14 项 admin 文件和 19 项官方 website/utils 原文件直到最终检查仍一致。共享锁文件/catalog 因添加 portal 的正常更新不计为原应用文件修改，根无框架/UI/CSS 直接依赖。

两个专项产物保留于各 dist/ui-verify，临时构建配置已移除；原始及恢复 JSON 与测试工作区保留，可按 [Harness](HARNESS.md#windows-中文与空格路径) 复查。仓库外临时哈希记录已清理。本轮未发现需修改生成器源码的问题，仅同步 Windows 范围、路径说明和批量文档中的过时字段描述。

## 用户指定 test-vue 试用（2026-10-30）

用户指定项目名 test-vue，目标 D:/Workspace/adui-studio/test-vue 创建前不存在。按 CLI 默认选项创建独立 Vue TypeScript 应用，UI/CSS 为 none；不启用大屏、引擎和模型保护。预览确认官方 vite:application 转发 vue-ts，随后实际创建、安装成功；外层 Node 24.18.0，官方工具日志 Node 26.13.0、pnpm 12.16.1、Vite+ 1.4.0，未更改全局运行时。

完整 vp run build 执行 vue-tsc -b 与正式首页构建，2/2 任务成功；vp check 15 格式/5 代码文件通过。模板没有测试文件，vp test --passWithNoTests 退出 0 仅确认该状态，不计作应用测试通过；生成器仓库另运行 210/210 Node 测试。

Chrome 分别验证开发服务和正式构建预览：首页渲染正确，Count is 0 点击变为 Count is 1，两页捕获的 warn/error 均为空。没有修改 App/main 或宣称 HMR 编辑测试。16 项清单、配置、入口及源码的 SHA256 在检查、构建和 Git hooks 后一致；模板 Vue 依赖保留，没有额外 UI/CSS 包。生产页面截图 D:/Workspace/adui-studio/test-vue-acceptance-20261030.jpg 保留在仓库外。

试用工程本地初始化提交 c3d9194，默认 Git hooks 已执行通过，工作区干净；未配置远程仓库，未新建 GitHub 仓库或发布。默认结构与 dist 产物保留，临时 4395/4396 服务、两个验收标签页及哈希文件已清理。此项覆盖用户指定的默认 Vue TS 工程，不扩大为额外预设已安装或业务功能已开发。

## 默认本地 normalize.css 验收（2026-10-30）

按用户要求，Vue/React 正式入口默认加入本地 normalize.css，不使用 npm 包。快照为指定 URL 的 8.0.1，保留 MIT 许可与版本注释；仅统一排版，来源及原始/格式化哈希见 [记录](../packages/create/assets/normalize.SOURCE.md)。生成和浏览器无需访问该 URL。已有工程显式 --apply-existing 可只补齐这项基础样式；旧成员及独立验收页不自动迁移。

在 test-vue 实际补装：只新增 src/styles/normalize.css、normalize.LICENSE.txt 和 main.ts 的优先导入。原 package、锁文件、Vite 配置、App、style.css 与 HelloWorld 共 6 项 SHA256 保持。重复调用不写入，三个目标文件的内容及 mtime 一致。完整 build 2/2、check 16 格式/5 代码文件通过，本地提交 e318c84 的默认 Git hook 通过；该工程仍没有远程仓库。

另实际批量创建 D:/Workspace/adui-studio/adui-normalize-validation-20261030，含官方根和 Vue TS、Vue JS、React TS、React JS 四个无额外 UI/CSS 框架应用。Node 22.18.0、pnpm 12.16.1、Vite+ 1.4.0 下五阶段成功，每个 main.ts/js/tsx/jsx 均自动导入本地快照与许可；没有 normalize.css 依赖，根/default website/utils 保持官方范围。无缓存 ready 11/11、最终 check 65 格式/22 代码文件通过，四应用 dist CSS 均包含先于原应用样式的 normalize 规则。保留官方 TypeScript 7 API 实验性提示。

Chrome 开发服务验证 test-vue 和上述 React JS 应用，style[data-vite-dev-id] 显示本地 normalize.css 在原 style.css/index.css/App.css 之前，按钮均从 0 点击为 1，warn/error 为空。截图 D:/Workspace/adui-studio/test-vue-normalize-20261030.jpg 在仓库外；没有把此项称为新增生产浏览器、所有 UI/CSS/引擎组合或旧独立页已验证。

217 项 Node 测试覆盖新增七项基础样式用例；8 个 JSON/20 应用预览、462 组合计划及文档/根检查通过，计划计数不当作真实构建。验证工作区、test-vue 与构建产物保留，临时配置/哈希/测试日志、两个标签及本轮 4395/4396 服务已清理。

## test-vue 首次补装 Element Plus/Tailwind CSS（2026-10-30）

用户明确选择 Element Plus + Tailwind CSS，在既有 D:/Workspace/adui-studio/test-vue 上执行 --apply-existing，再以 --ui-smoke 添加独立验收页。使用进程级 VP_NODE_VERSION=22.18.0 及前置官方 shim PATH，pnpm 12.16.1 安装 Element Plus 2.14.7、Tailwind CSS/@tailwindcss/vite 4.3.3、unplugin-vue-components 32.1.0；原 Vue、TypeScript 和 Vite+ 版本未升级。生成器源码、依赖及锁文件未改。

原 lazyPlugins 配置增量加入组件 resolver 与 Tailwind 插件，Vue 声明只排除格式检查。main.ts 仍以本地 normalize.css 开头，其后是 Tailwind 和原应用样式；没有 normalize.css npm 依赖。App.vue、HelloWorld.vue、style.css、normalize.css、normalize.LICENSE.txt 共 5 项 SHA256 与补装前一致。UI Smoke 仍为独立入口，不宣称其自动导入 normalize。

完整 vp run build 的 vue-tsc -b 和正式首页构建 2/2 成功；verify-ui-build.mjs 的 /ui-check/ 双入口构建成功，保留构建性能提示，临时配置已清理。最终 vp check 20 格式/8 代码文件通过，无警告、lint 或类型错误。重复 --apply-existing 与 --ui-smoke 均在预检拒绝，30 项 Git 可见文件内容及 mtime 一致，没有重装或覆盖。

Chrome 开发首页 Count is 0→1，style 标签顺序为本地 normalize.css、starter.tailwind.css、style.css；生产 /ui-check/ui-smoke.html 的真实 el-button 主按钮点击 0→1。Tailwind 区域为浅绿色背景、深绿色文字、8px 圆角及 16px 内边距；两页 warn/error 为空。生产截图 D:/Workspace/adui-studio/test-vue-element-plus-20261030.jpg 位于仓库外；两个标签及本轮 4395/4396 服务已关闭，工程和构建产物保留。

test-vue 分步本地提交 a664ce1（集成 UI/CSS）、0325b9c（独立验收页），默认 Git hooks 均通过，工作区干净；该工程没有远程仓库。生成器仓库本轮 217/217 Node 测试、文档校验和根 vp check（175 格式/129 代码文件）通过。此轮只补齐用户选择的首次集成证据，没有新增业务页面、大屏或引擎功能。

## Monorepo 基础样式与 UI/CSS 隔离补验（2026-10-30）

复用既有官方 D:/Workspace/adui-studio/adui-normalize-validation-20261030，新增 apps/vue-element-ts（Vue TS/Element Plus/Tailwind）与 apps/react-antd-js（React JS/Ant Design/UnoCSS），保留原四个无可选 UI/CSS 应用及默认 website/utils。两次创建仍委托官方 vite:application 的 vue-ts/react，两次独立 --ui-smoke 不安装依赖。两组 dry-run 只核对官方参数、路径与 baseStyles 计划，不计为真实生成证据。

进程环境使用 VP_NODE_VERSION=22.18.0 与前置官方 shim PATH，官方日志确认为 Node 22.18.0、pnpm 12.16.1；现有 Vite+ 1.4.0 保留。实际安装 Element Plus 2.14.7、Tailwind/@tailwindcss/vite 4.3.3、unplugin-vue-components 32.1.0、Ant Design 6.6.8、UnoCSS 66.12.0。生成器源码、依赖和锁文件未变。

根 vp run --no-cache ready 14/14 成功，包含 utils 测试、默认成员、四个原应用及两个新增应用的完整构建；Vue/React TS 保留类型检查，TypeScript 7 API 实验性提示保留。Vue /ui-check/ 与 React ./ 的首页+组件页构建成功；UnoCSS 多入口及构建性能提示保留。最终根 vp check 96 格式/36 代码文件通过，无警告、lint 或类型错误。专项产物保留于各 dist/ui-verify，临时配置已清理。

两组正式入口以本地 normalize.css 开头，静态 CSS 与许可均和生成器快照一致，没有 normalize.css npm 包。根 package.json 未增加框架/UI/CSS 直接依赖；共享 catalog 正常新增六项版本，packageExtensions 只增加 unocss/unplugin-vue-components 的 Vite peer，根 Vite 配置只增加该 Vue 应用声明的格式排除。三个根共享文件为预期变化；原其余 100 项文件的 SHA256 与 mtime 保持，涵盖四个原应用和默认 website/utils。两新应用的直接依赖各自隔离，正式 App 与原样式分别和对应无 UI 应用的三项文件一致。

Chrome 两个开发首页 Count is 0→1；Vue 样式顺序为 normalize、Tailwind、原样式，React 为 normalize、Ant Design reset、UnoCSS、原样式。两个生产组件页均为真实库主按钮，计数 0→1；Tailwind/UnoCSS 浅绿色区域、深绿色文字、8px 圆角及 16px 内边距正确，四次页面观察的 warn/error 均为空。独立组件页保持自身入口，不宣称自动继承 normalize。截图 monorepo-vue-normalize-ui-20261030.jpg、monorepo-react-normalize-ui-20261030.jpg 保留在 D:/Workspace/adui-studio 仓库外。

两组重复创建、重复 --ui-smoke 均退出 1；不带 UI/CSS 参数的 --apply-existing 均退出 0 并跳过基础样式写入。六次调用前后 149 项 Git 可见文件的内容和 mtime 一致，没有重新安装依赖。两个验收标签和本轮 4395–4398 服务已关闭，测试工作区原有未提交文件保留，未将其纳入生成器提交。此轮未发现需要修复的运行逻辑，仅同步代表实测范围和 Monorepo 说明，不扩大为全部组合已验证。

## 2026-11-02 默认插件目录与正式首页验收

- 环境：Windows，Node 22.18.0、Vite+ 1.4.0，官方创建选择 pnpm 11.22.0；没有调整根依赖版本。
- 通过真实官方入口创建 Vue TS/TDesign/UnoCSS/大屏/Three/embedded 与 React JS/Ant Design/Tailwind/大屏/Babylon/external。Vue check 为 52 格式/38 代码文件，React 为 52/39；两者完整 vp run build 均通过。浏览器发现 Babylon canvas 默认尺寸后，补齐首页 canvas 百分比样式并复验 React check/build 与 1280×720 视口。
- Vue 首页按钮实际加载并显示用户指定的 DamagedHelmet。生产产物输出一个约 3.77 MB 的 .adui，没有 GLB/GLTF；未把原模型纳入仓库。Three 和 Babylon 构建均有大分块提示；Vue 浏览器有一条底层着色器精度 warning，无运行 error；React 浏览器无 warn/error。该轮未做 Cesium 首页生产渲染或全部 UI/语言组合的实际构建，不将结构回归称为完整矩阵实测。
- 本轮本地 tgz 经 vp dlx 实际创建 Vue JS/Element Plus/大屏，check 为 24 格式/14 代码文件，完整构建通过；生产首页主按钮样式可见，点击计数 0→1，浏览器无 warn/error，normalize 是入口首条导入。其默认项目无 smoke 目录/HTML 和 before-adui 中间备份。
- 最终 CLI 包包含 88 个运行时文件，路径为 dist/cli/pack-y9XDHa/viteplus-starter-create-0.0.0.tgz；最终归档包经 vp dlx 三引擎只读预览通过，最终计划 74 文件、entry 为 /、无默认验收页或旧插件路径，未创建目标。此前包路径不会自动更新。
- 归档后的 vp run models:keygen 可执行；已有 KEY 返回拒绝覆盖，前后内容哈希保持。env 密钥未输出、未提交。
- 最终源码回归 274/274、文档静态校验、根 vp check 199 格式/149 代码文件通过。截图保存在忽略目录 dist/verification；结构与边界见 [目录与接入](PROJECT_LAYOUT.md)。

## 2026-11-02 @adui 本地包与补装实机验收

- 本地包名已确定为 @adui/viteplus-starter，命令名 viteplus-starter，private/0.0.0 保持；产物 dist/cli/pack-Piyx2v/adui-viteplus-starter-0.0.0.tgz，89 个运行时文件。源码和包清单验收通过，未执行 npm/Release 发布。环境为 Windows、Node 22.18.0、Vite+ 1.4.0；官方项目使用 pnpm 11.22.0，仓库 frozen install 使用 pnpm 12.16.1，根锁文件与依赖版本未变。
- 经该 tgz 的 vp dlx 入口创建官方 Vue TS 应用，在补装前写入带业务标记的 App、main 和自定义插件注册入口，并记录 SHA-256；通过同一入口补装大屏、Three、embedded 模型保护。三类业务文件前后哈希全部保持，新运行时/构建插件归档到统一目录，无默认 smoke 页，模型配置的三份原件备份保留。check 50 格式/36 代码文件通过；完整 vue-tsc 与首页构建 2/2 通过。使用原 Downloads DamagedHelmet 的只读副本，产物只有 .adui，无 GLB/GLTF。
- 经同一 tgz 创建官方 Monorepo 根和 React JS 成员，先准备带业务标记的页面/挂载代码/注册入口，再执行大屏、Three+Babylon、external 的多引擎补装。只有父阶段统一整理，新建了两个引擎目录；三类业务文件哈希保持，默认无独立页，KEY 脚本指向 build/plugins/models。应用 check 63 格式/53 代码文件及完整构建通过；包入口的工作区结构检查返回 ok:true，根 vp run ready 6/6 成功（含 1 项缓存命中）。首页使用 Three 适配器，未声称同时渲染所有引擎。
- 两项实际构建均有 Three 大分块提示；官方 utils 构建有 TypeScript 7 API 实验性提示，未更改官方版本或检查规则。本轮未执行新增浏览器验收、Cesium 实际补装或全部 UI 组合的真实构建；这些范围不由结构/单元回归替代。
- 全量回归 282/282、文档校验、根 vp check 201 格式/151 代码文件通过。8 项新增回归覆盖旧/新大屏、三引擎代表 TS/JS、显式独立页、多引擎、已有构建引用不误改、KEY/业务/原件备份保持、占用/未知文件/junction/格式失败及真实 CLI 保护。
- 本轮验收日志与摘要保存在忽略目录 dist/verification；新本地包路径与旧包不同，旧 tgz 不会自动更新。用户现有 test-starter 未被迁移，原 Downloads 模型未修改。
