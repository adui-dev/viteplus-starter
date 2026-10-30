# 详细设计

## 本地质量基线

根 Vite+ fmt 统一自有源码、测试与文档格式；仅排除原样保存的第三方 `.agents/skills/git-commit/**`、`.agents/skills/gitmoji/**`，保留其上游指令与安装哈希。没有关闭源码检查、lint 规则或 Git hooks。

## 默认 normalize.css 静态样式

base-styles.mjs 独立于可选 UI/CSS 依赖计划。planBaseStyles 为四种正式 main 入口列出本地静态 CSS、许可、来源与版本，不返回 npm 依赖；Monorepo 根返回 null。单应用、逐应用、批量和多引擎复用原 CLI，dry-run/批量计划展示 baseStyles。矩阵将默认静态路径加入 462 个组合的冲突检查，实际构建计数仍为 0。

preflightBaseStyles 校验 Vite+ 与所选框架、入口、目标及祖先链接。未知同名文件、部分输出/导入、修改过的快照拒绝覆盖；已知匹配文件兼容 CRLF，正常重复调用不写入。addBaseStyles 使用 wx 写新文件，写入口前再次核对原内容，只改正式入口的 normalize 导入位置，生成时保留 BOM、hashbang、前置注释和原模块内容，再遵循项目格式化规则。文件失败可保留部分现场，不承诺事务回滚或抵御恶意并发替换。

新建时在官方模板生成后预检，在可选 UI/CSS 写入后添加/整理基础导入，保证顺序先于库样式、UnoCSS/Tailwind 和原应用样式；不改 App、Vite 配置或依赖。--apply-existing 无需额外选项即可补齐，后续 UI/CSS 首次安装仍重新整理顺序。独立验收页保留各自入口规则，不批量改写旧页面或工作区默认成员。

assets 保存指定 URL 的 8.0.1 固定快照、MIT 许可和来源/SHA256 记录；仅对 CSS 统一排版。复制发生在本地，创建和浏览器不访问该 URL，也不安装 normalize.css 包。单测验证四入口、导入顺序、许可/原文件保留、幂等与链接/同名冲突；真实证据见 V1 清单。

## 官方模板语言选择

- Application 的 `--language ts|js` 默认 `ts`。Vue 选 `vue-ts` 或 `vue`；React 选 `react-ts` 或 `react`，全部使用 Vite+ 官方 `vite:application`，不再自行运行其他生成器。
- `options.mjs` 负责框架 × 语言的模板映射及校验；`cli-args.mjs` 解析 `--language`；`prompts.mjs` 在框架后询问语言，默认 TypeScript。
- Monorepo 根目录禁止传 `--language`；后续需为各子应用独立设置。
- `integrations.mjs` 按语言选择 `src/main.ts` / `src/main.js`（Vue）和 `src/main.tsx` / `src/main.jsx`（React），同时识别实际存在的 `vite.config.ts|mts|js|mjs`。若存在多个 Vite 配置则拒绝自动修改。
- UnoCSS 配置采用 `uno.config.ts|js`；Vue JavaScript 组件自动导入设置 `dts: false`，Vue TypeScript 保留 `src/components.d.ts` 及对应格式忽略规则。
- 旧版 `starter.plugins.ts` 的迁移只适用于历史 TypeScript 工程；JS 创建和 `--apply-existing` 不使用此历史格式。
- 四种框架/语言官方创建与完整构建已有 Windows 证据；五种框架/UI 均有代表组件渲染记录，未穷举全部组合。当前范围见 [能力表](GENERATOR_STATUS.md)，操作见 [Windows 指南](WINDOWS_GUIDE.md)。

## P3 生成器修复：插件内联与旧配置修复

- `packages/create/src/format-config.mjs`：仅针对 Vue UI 自动导入，向 Vite+ `fmt.ignorePatterns` 添加 `src/components.d.ts`，避免自动生成的类型声明在重新生成后造成不稳定格式检查。保留原有 `fmt`、`ignorePatterns`，重复调用不新增重复条目；不支持的配置格式拒绝修改。该规则仅影响格式检查，不关闭 Lint 或 TypeScript。

- `generateIntegration` 在 `vite.config.ts` 内联 Vite 插件的 import 和工厂调用，避免 `starter.plugins.ts` 跨文件导入；兼容普通数组、`lazyPlugins` 及无插件字段的 Vite+ 配置。
- `applyIntegrations` 在写入后只格式化本次修改的应用文件；共享根构建策略在其所属目录单独格式化，不向应用格式化命令传递父目录路径，不得跳过失败。
- `preflightIntegrations` 提取 UI/CSS 计划、入口/唯一 Vite 配置识别、配置生成与输出占用检查，整个过程只读。--apply-existing 在“补装预检”中与基础样式、所选预设预检一起调用，全部通过后才写工作区 peer 配置；应用清单校验复用基础样式预检，不再提前裸 JSON.parse。applyIntegrations 自身仍重新预检，安装完成后再核对捕获的入口/配置内容、路径和输出占用，保留已有失败保护。
- `generateIntegration` 在非旧版修复模式检查已选择 UI 所需模块的已有静态导入，防止 css=none 时没有输出文件可作重复检测而再次插入 Components/resolver 或库样式。识别生成器的普通单双引号导入、别名和多行绑定，忽略注释及示例字符串；已有部分引用保守拒绝，不自动迁移手写配置。不是通用 JS/TS 解析器。ui=none 的后续 CSS 集成和 repair=true 的已知旧版迁移保留原路径。
- 选择 CSS 时同一检测器还检查 UnoCSS/Tailwind 的已知插件/入口静态导入，并在屏蔽注释与字符串后的内容中识别默认 UnoCSS()/tailwindcss() 调用。任一框架的引用残留均拒绝重复或替换式补装，文件缺失不等于未集成。css=none 不进入此检查，旧版修复沿用显式迁移；不识别任意手写调用别名或动态配置。
- build-policy.mjs 分离 preflightUiBuildPolicy 与 prepareUiBuildPolicy。前者只读定位策略普通文件、计算合并结果，错误带文件路径，由 preflightIntegrations 在补装预检中调用；后者重新读取当前策略并在写入前复查，因而保留中间正常追加的工作区 peer 配置。仅 Ant Design Vue 进入此路径，已有 core-js:true/false 继续保留；不是任意 YAML 转换或事务回滚。
- `--repair-existing` 仅用于符合已知 Starter 旧格式的现有 Vue/React Application：先验证项目类型、旧插件文件及配置形态，再替换旧导入并将 `starter.plugins.ts` 备份为 `starter.plugins.ts.bak`，随后格式化；**不安装依赖，也不重建项目**。
- 清单读取和框架核对由 repairExistingIntegrations 在阶段内部完成：先检查路径/普通文件，再去 BOM 解析对象，错误仅带文件路径。配置和旧插件也要求普通文件，已有备份继续拒绝覆盖；格式化回调通过 await 等待，异步失败不再提前返回成功。迁移写入/备份后的失败保留现场，不提供事务回滚或通用旧项目升级。
- legacy-integrations.mjs 按 23184ed 历史 TS 模板比较完整旧插件 token，接受单双引号、CRLF、注释、已知语句分号及尾逗号；别名、自定义选项、额外代码与无法识别内容拒绝，不执行或通用解析用户代码。修复同时只读检查正式 main 普通文件中的已知 UI/CSS 样式、所选依赖声明（允许 catalog/workspace 等非空字符串）；React UI 从入口样式核对，不能仅凭插件或已安装的其他库推断。上述检查均发生在写配置和重命名备份前；无插件的旧 React UI-only 组合不提供迁移。
- 此功能不是通用任意 TypeScript 配置的转换器，无法识别的结构必须拒绝修改；旧项目 Windows 修复证据见 [项目状态](PROJECT_CONTEXT.md)，不自动升级其他旧快照。

## 当前可用模块

`packages/create/src/options.mjs`:

- `validateProjectName(name)`：安全的小写 kebab-case 与 Windows 保留名称统一校验，拒绝 con/prn/aux/nul、com1–com9、lpt1–lpt9 的完整名称；带前后缀的普通名称保持可用。批量根/子应用、选项归一化与交互共用此函数，不在批量模块另设规则。
- `validateProjectOptions({name,type,framework})`：在目标路径检查、官方命令执行前校验名称；Application 强制 vue/react，Monorepo 不接受根框架参数。
- `buildVpCommand(options)`：组装 Vite+ 官方模板创建命令，不执行命令。

`packages/create/src/cli-args.mjs`：参数白名单、缺值和重复参数校验。

`packages/create/src/prompts.mjs`：交互式名称、类型、框架选择，非法名称重试，创建确认/取消。

`packages/create/bin/cli.mjs`:

- 支持单应用、工作区、批量、预设和维护模式，具体白名单与互斥规则见 cli-args.mjs 及 --help。
- 交互缺失选项可从终端读取，支持默认值与二次确认；取消时不调用 Vite+；非 TTY 必须显式传参。
- 已存在目标目录立即拒绝；仅执行白名单参数，不使用用户输入拼接 shell 命令字符串。
- 委托 `vp` 创建并传递退出状态；Application 向 `vite:application` 转发 `-- --template vue|vue-ts|react|react-ts`。Windows 官方命令的参数仅来自白名单；批量/恢复的 Node 子进程用 argv 传路径。中文、空格路径下的官方创建和恢复已有实测记录。
- 创建成功、补装、旧配置修复及验收页提示使用应用目录的 vp check/vp run build，Monorepo 根使用 vp run ready。recovery.mjs 失败指引要求先修复现场，再对已完整生成的应用执行完整构建；workspace-recovery-execute 的 validation 保留“仅结构检查”边界并列出实际命令。提示不自动执行这些命令，不更改项目 scripts；专项 --config 构建保持独立。

## UI/CSS 可选集成

`packages/create/src/integrations.mjs`：

- `planIntegrations(options)`：按 Vue/React 生成白名单依赖清单，拒绝 React + Element Plus、Monorepo 根统一配置。
- `generateIntegration(options, viteConfig, mainSource)`：保留 Vite+ 官方配置，不再仅识别直接数组；调用 `vite-config.mjs` 兼容顶层普通 plugins、lazyPlugins 或无 plugins 情况，未知结构停止。
- `applyIntegrations(directory, options)`：在安装依赖前先生成并校验修改后的配置、检查目标文件是否存在；校验失败不安装依赖。安装失败时不写入插件配置，但官方基础项目可能已存在。
- 新增 `--apply-existing` 显式补装：校验原目录、package.json 中的 `vite-plus` 及 Vue/React 依赖，再对已有的官方基础应用安装所选集成；不重新执行 `vp create`。
- Vue 使用 `unplugin-vue-components` 和对应 Resolver 按需引入组件；React 依赖自身组件导入机制；UnoCSS / Tailwind 均写入官方建议的插件与样式入口。
- 支持独立 Application 及通过 `--workspace` 添加的 Monorepo Application；不在 Monorepo 根安装 UI/CSS。
- `collectProjectOptions` 基础参数已全部提供时直接返回校验结果，未指定 UI/CSS 默认视为 None；修复 P3 新增交互字段导致的非交互单元测试回归。
- 自动修改支持已知顶层 plugins 数组、lazyPlugins 或缺省 plugins 的官方配置，以及对应 TS/JS 标准入口；未知结构拒绝处理。代表组合已实测，覆盖范围不扩大为所有依赖版本。

## 已实现的增强与恢复模块

- options/screen-options/engine/model-protection 统一 screen、engine/engines 与 modelProtection 选项，CLI/交互/JSON 共用；具体字段以实现及批量说明为准。
- vite-config 处理已知官方配置注入，写入器先检查路径及输出占用，保留备份与正式入口；不是任意配置迁移器。
- packages/screen、three、cesium、babylon、model-security 提供大屏、按需场景、GLB/.adui 和无服务端模型构建；各自设计见后续模块章节。
- workspace/batch 支持官方根与逐应用独立配置；recovery/workspace-inspect/workspace-recovery/workspace-recovery-execute 提供失败报告、只读检查/规划及仅新建缺失应用的显式执行。
- 未实现范围包括自定义工作区布局、覆盖式恢复、其他模型格式及解码器；当前仅验收 Windows，不将这些内容写成已交付功能。

## 需求追踪

- FR-001/002、NFR-001 → `packages/create/src/options.mjs`、`packages/create/src/cli-args.mjs`、`packages/create/src/prompts.mjs`、`packages/create/bin/cli.mjs`、`packages/create/test/*.test.mjs`。
- NFR-002/003 → `scripts/validate-docs.mjs`、`docs/HARNESS.md`。
- FR-003/004 → `packages/create/src/integrations.mjs`、`packages/create/test/integrations.test.mjs`；代表构建/渲染证据见能力表。
- FR-005 → packages/screen 与 create/src/screen；FR-006 → packages/three、cesium、babylon 及 create/src/engine、多引擎编排；FR-007/011 → packages/model-security 与各引擎模型控制器，源码和对应 test 目录均已存在。
- FR-008 → `packages/create/src/workspace.mjs`、`packages/create/test/workspace.test.mjs`。
- FR-010 → `packages/create/src/batch.mjs`、`packages/create/test/batch.test.mjs`、`examples/monorepo.batch.json`。

## 交付边界与后续授权

当前锁定并验证 Vite+ 1.4.0，不承诺任意旧版本兼容；官方子应用模板、Node 最低版本、大屏参数及无服务端模型保护已有实现与记录。npm/Release 发布及命名另行授权，生产外部授权来源由业务决定。当前本地交付清单见 [V1](V1_ACCEPTANCE.md)。

## UI Smoke 工具设计

- `packages/create/src/ui-smoke.mjs`：`planUiSmoke` 负责生成独立 HTML 与 Vue SFC、React JSX/TSX；`addUiSmoke` 校验项目 `package.json`、框架语言入口、Vite+ 插件配置，写入前检查同名文件。
- `--ui-smoke` 用于已有独立 Application 或官方 Monorepo 子应用，不能与 `--dry-run`、`--apply-existing`、`--repair-existing` 同时使用；支持 Vue 三种 UI、React 两种 UI，TS/JS 均适用，不接受根工作区。
- 新增 `ui-smoke.html`、`src/ui-smoke/`，不改动业务入口或 Vite 配置；写入使用 `wx` 防覆盖；仅对新文件调用 `vp fmt`。
- Vue 按预设验证 el-button/a-button/t-button 自动导入，React 显式引用对应组件库的 Button；均含点击计数及可选 UnoCSS/Tailwind 视觉标记。
- React 独立生成 `SmokeApp.jsx|tsx`，仅默认导出组件；`main.jsx|tsx` 仅导入组件、样式并挂载。组件与非组件入口分离，符合官方 Fast Refresh lint 规则，不使用禁用规则或注释压制警告。
- 新组件文件纳入同批写入预检；即使只有 `SmokeApp` 已存在，也在写入 HTML/入口或调用格式化前拒绝覆盖。旧验收页不自动改写或迁移。
- 由 Vite+ 开发服务器访问 `/ui-smoke.html`；需要用户在浏览器验证真实效果，不将单元测试或构建成功视为浏览器验收成功。

## P4：已有 Monorepo 逐应用生成

- `--workspace <path>` 仅适用于 Application；路径仅用于 Node 文件 API 和子进程 cwd，不拼入 shell 命令。`buildVpCommand` 仍委托 `vite:application`，目录固定为安全的 `apps/<name>`，不传 `--git/--no-git`。
- `workspace.mjs` 预检 private Vite+ 根、官方 pnpm packages 块列表、apps 目录、唯一根 Vite 配置及其他成员同名包；拒绝 apps/目标/根配置的符号链接与 junction、路径遍历和未知 glob。预检不写文件。
- 保留默认 `apps/website`、`packages/utils`。依赖安装与 Vite 插件/样式增强仅作用于新应用；根锁文件和 catalog 的更新由官方生成器与 pnpm 管理。
- Vue TS + UI 的 `src/components.d.ts` 仍在应用内生成；子配置不添加根专属 fmt。根增量合并 `apps/<name>/src/components.d.ts` 忽略规则，保留其他 fmt 和 run 配置。JS/React 不新增该规则。
- 兼容官方成员模板仍从 vite 导入 defineConfig 的情况：新应用生成后仅对其 Vite 配置执行官方 `vp lint --fix` 与 `vp fmt`，不处理已有同级应用。
- 混合工作区可能存在多个 Vite peer 实例。针对已知未声明 Vite peer 的 `unplugin-vue-components`、`unocss`，按选项增量加入根 pnpm `packageExtensions`，补充 `peerDependencies.vite: '*'`；在安装前预检，保留其他扩展与 catalog，冲突或不支持的结构拒绝修改。不使用类型断言或关闭检查绕过 TS2321。
- 安装后仅格式化根 pnpm-workspace.yaml 及确实修改的根 Vite 配置；避免 pnpm 新增 catalog 条目的引号格式导致根检查失败。
- `--workspace` 可与 dry-run、apply-existing、ui-smoke 使用；不支持历史 repair-existing。dry-run 显示实际 cwd/target，已有目标创建失败；补装和 Smoke 仍需显式参数。
- 失败保留官方已生成目录和已完成的安装，不承诺事务回滚，不自动重试覆盖；不得并发向同一工作区运行多个生成命令。
- 首期以逐应用命令提供多应用能力；配置文件批量生成见下节，交互式批量收集、自定义 glob 及其他包管理器仍待后续实现。

## P4 第二期：JSON 批量生成

- `--config` 在单项目交互前分流，仅允许同时指定 `--dry-run`，不沿用模糊的单项目默认值。顶层仅接受 version/name/apps，应用仅接受 name/framework/language/ui/css/uiSmoke/screen；必填版本为 1，框架显式选择，语言默认 ts、UI/CSS 默认 none。
- `validateBatchConfig` 先校验全部应用，再接触输出目录：最多 32 个，拒绝未知字段与错误类型、遍历、重名、Windows 设备名称、与工作区名或默认 website/utils 冲突；uiSmoke 预先调用既有组合校验。
- `createBatchPlan` 使用真实 cwd 为父目录，输出固定为 cwd/name；已有目标含悬空链接拒绝，逐级检查祖先 workspace 标记，禁止嵌套。配置读取限制为 1 MiB，接受 UTF-8 BOM；只解析 JSON，不执行配置代码。
- dry-run 展示规范化选项、根官方命令、每应用的 CLI argv 与官方模板命令、依赖计划、可选验收页路径/文件；不写目录。执行前重新从规范化配置构建计划，避免使用过期或被修改的阶段命令。
- 根调用带 --no-interactive 的官方 monorepo；生成后再次统一预检全部应用，检查新根非 junction/符号链接。随后按应用顺序串行调用既有 CLI，验收页紧随对应应用；Node 子进程使用 argv，不把路径拼入 shell。没有复制框架模板或替代迁移流程。
- `executeBatch` 记录成功阶段；任一步失败抛出包含 completed/failed/pending/workspaceRoot 的错误，并给用户可读摘要，保留部分生成目录及安装。它不提供事务回滚或自动恢复，根生成失败也不会删除现场。

## P5：大屏插件设计

共享包 packages/screen 分为纯布局、DOM 控制器、框架适配三层，使用可选 Vue/React peer；仅锁定新增图，不升级已有依赖。引擎层保持原生 CSS 像素，HUD 按双轴比例变换，缩放浮层位于 HUD 内，原生浮层位于 shell 内。父容器负责尺寸，核心不含业务顶部常量或引擎依赖。

控制器通过 ResizeObserver、resize、fullscreenchange 合并到一帧；首次同步布局，卸载取消观察、事件与帧。clientToDesign 处理容器边框、居中偏移及非等比坐标；隐藏返回 null。全屏 API 拒绝按 Promise 上报。Vue 使用 Symbol provide/inject、按各配置值监听（防止内联对象造成递归）；React DOM 回调 ref 存入状态，渲染阶段不读写 ref，适配官方严格 refs 检查。

生成器 --screen 仅增强官方应用，复制 core/controller/CSS、所选框架与声明至 src/adui-screen，生成独立 screen-smoke.html。预检所有待写文件与父路径，已有文件/链接拒绝，写入使用 wx；不覆盖正式入口，不增加应用依赖。--apply-existing 允许仅补装大屏；批量应用字段增加 screen，uiSmoke 阶段去除 screen 参数防止重复补装。CLI 不提供自动覆盖升级，交互菜单暂未新增大屏问题，使用显式参数或 JSON。

核心支持 allowUpscale 与 engineInsets，CLI/JSON 首期仅选择尺寸和模式，复杂设置由应用源码配置。开发验收页默认不参与正式首页构建；真实引擎 canvas 尺寸、DPR、资源生命周期与全屏成功路径仍需专项验收。操作与契约见 [SCREEN](SCREEN.md)。

## Three.js 首期设计

--three-smoke 在创建流程前分流，只对已有 --screen 应用生效，不与其他维护或 UI/CSS 选项混用。planThreeSmoke 为 Vue/React TS/JS 生成独立 ThreeView、演示、入口和源码快照；addThreeSmoke 在安装前预检全部目录/文件、框架与语言，拒绝已有输出、链接、冲突版本，应用内用 vp add 安装固定 three/@types 版本，安装后复查父路径及文件再写入。工作区根元数据由包管理器更新并定向格式化；批量 JSON 还未接入 Three 字段。

运行时独占场景、相机、几何、材质、射线与 renderer。ResizeObserver 与循环内 DPR 检查只在尺寸键变化时设置缓冲；DPR 上限 2、单边上限 8192/硬件 maxTextureSize，隐藏不绘制。拾取以 canvas rect 生成 NDC，HUD 设计坐标另行处理。使用 setAnimationLoop，销毁释放监听、观察器、几何、材质、renderer 和 context；初始化失败及意外 contextlost 也清理。本期不含纹理、模型、共享资源或自动 context 恢复。

默认正式首页构建不包含验收 HTML；专项构建通过临时 mergeConfig 指定 Three HTML 输入完成，不能将默认构建当成 Three 构建。包体提醒保留，正式按需分块待设计。更多接口见 [THREE_SMOKE](THREE_SMOKE.md)。

## Three.js 第二期：应用选项与延迟初始化

options.mjs 严格归一化 engine=none/three，默认不保留 none 字段、不改变未选应用。CLI 新建要求同时显式 screen，已有应用可用 --engine three --apply-existing 重用大屏；不与独立 smoke/repair 标记混用。组合补装先预检 Three 输出、入口语言及已有依赖，再安装 UI/写入大屏；已存在目录或冲突版本拒绝覆盖与升级。

batch.mjs 接受逐应用 engine 字段，Three 要求 screen，同时规划依赖、文件及独立页面；应用阶段直接传 --engine three，保留 root/app 失败摘要与串行保护，uiSmoke 独立阶段不重复传 engine/screen。--engine three 生成可复用源码与示例页面，不替换正式业务首页，不等同实现多引擎多选或模型安全。

lazy.mjs 在 start 时动态 import，复用未完成请求，失败可重试；destroy 使晚到模块失效并避免回调已卸载组件，构造期间的同步卸载也回收已创建对象。Vue/React ThreeView 仅静态导入轻量 lazy API；DPR 与组件 ready/loading 状态随生命周期更新。模块下载本身不取消。分块由 Vite 自然生成，专项构建和生产网络验证见 THREE_SMOKE；旧快照不自动覆盖迁移。

## GLB 本地模型设计

模型加载控制器按版本丢弃晚到结果，安装前校验包围边界，成功后释放旧资产；解析/安装失败移除新返回资产并保留旧模型。clear/destroy 使 pending 结果失效；同步安装回调发生卸载也清理新对象。资源以 Set 去重，支持材质数组、多个场景、共享纹理位图及骨架。未追踪加载器拒绝前未返回的内部对象，不宣称测得驱动内存完全回收。

ThreeHandle/LazySceneHandle 暴露 loadModel/clearModel，文件 UI 在 arrayBuffer 前检查大小并在异步读完后核对仍是同一实例；失败提示可由下一次选择清除。GLTFLoader 使用 parseAsync，拒绝外部资源 URI；无远端模型下载或密钥。RoomEnvironment/PMREM 用于 PBR，环境属于查看器，模型清除仅释放模型，卸载再释放环境/renderer/context。相机半径按归一化后的包围球计算并留边距，已修复实测头盔裁切。

Monorepo 实测新增 Vue JS 时发现根项目合并多份官方 *.vue 声明导致 duplicate component。仅对新 Vue JS 成员在无 tsconfig/jsconfig 时补充独立 tsconfig 范围（src 与自身 Vite 配置），不改 env.d.ts、不覆盖已有项目配置，不设置 skipLibCheck/checkJs 或禁用 lint。其他框架/语言维持原流程。

## .adui 加密封装与授权分层

packages/model-security 提供无引擎依赖的 Web Crypto AES-256-GCM v1 二进制封装，随机 96 bit IV、128 bit tag，完整头部作 AAD；仅元数据 modelId/keyId/format 明文，不含密钥。Node CLI 独立生成密钥与 .adui，拒绝覆盖/链接路径，不修改 GLB；浏览器只通过 authorize 回调获得有到期时间的不可导出 decrypt CryptoKey。具体布局及生产服务契约见 [MODEL_SECURITY](MODEL_SECURITY.md)。

lazy 适配先授权/认证解密再走原 GLB Loader；模型请求代次、AbortSignal 与运行时 invalidate 防止晚到模型安装。临时明文在提交后最终清零，不承诺抹除所有内存副本。Vue/React TS/JS 验收支持 .glb/.adui 和独立本地密钥 provider；验收 provider 不等同生产服务，切换密钥/清除授权/卸载使待处理授权失效。

## 模型自动打包设计

模型构建插件默认 embedded：buildStart 扫描全部 GLB（即使首页未引用虚拟目录仍输出 .adui），虚拟模块只暴露目录及哈希资源 URL，AES-GCM 使用随机 IV。密钥由 env 提供，授权模块以随机掩码拆分重建 non-extractable decrypt CryptoKey；配置的 hostname 限制在生产授权时执行。源密钥可被逆向重建，这是提高复用门槛的明确边界。

开发 middleware 禁止原模型/env 直接访问，内存提供密文；文件变更与新增删除失效目录并全页刷新。generateBundle 与 writeBundle 检查已知明文/密钥泄漏，public 预检拒绝原模型和密钥。外置模式独立 keyring 和同源流式限长下载共享原生命周期。安装器增量配置并 wx 备份，不覆盖旧快照；JS 无独立配置时生成 jsconfig 以隔离虚拟模块声明，不禁用类型检查。详见 [MODEL_BUILD](MODEL_BUILD.md)。

## 模型保护创建选项与密钥脚本

新增 CLI --model-protection 与 JSON modelProtection，严格枚举 none/embedded/external，三引擎默认 embedded；无引擎时不能启用，Monorepo 根拒绝统一设置。交互流程在 UI/CSS 后加入大屏、引擎、保护模式，最终摘要含选择；非交互完整参数不询问。批量 UI Smoke 阶段去除引擎和保护参数，避免重复补装。

planModelProtection 只列模式/文件/脚本/执行时生成标记；执行前检查 env、模型脚本、目录/链接及配置形态。新增模型集成在官方模板、UI/大屏/Three 就绪后运行安全安装器，生成项目独有 .env.local、空 src/models 与 MODEL_GUIDE，再定向格式化。Vite、package 和已有 Git 忽略文件分别备份；保留已有脚本，冲突拒绝。

project-key.mjs 同时是可导入的生成函数与生成项目中的 keygen.mjs 脚本；models:keygen 禁止覆盖已有 KEY，models:keyrotate 先 wx 备份再更新 KEY/标识，保留其他 env 配置，输出不含密钥值。新增 .env.local* 忽略规则覆盖轮换备份。IV 仍由 encryptAdui 对每个模型随机生成，不在 env 生成固定 IV。

## 生成器路径保护复查

safe-paths.mjs 从目标逐级 lstat 到根，拒绝目标或任意祖先符号链接/junction，避免仅检查最终文件仍跟随父目录链接。CLI 创建目标、UI/CSS、UI Smoke、大屏和 Three 写入复用这一检查；新文件仍用 wx。UI/CSS 在安装依赖前及完成后检查新增输出占用、路径类型和入口/Vite 配置原文，变化时拒绝覆盖，保留安装现场。格式化只传本次修改文件及 package.json，不再格式化整个项目。受控回归及组合计划矩阵见 [GENERATOR_STATUS](GENERATOR_STATUS.md)。

Ant Design Vue 当前依赖 core-js，pnpm 12 会拒绝未审查的安装脚本。已核对 core-js 3.51.0 postinstall 仅输出支持信息，因此安装前在最近的 pnpm-workspace.yaml 增量补充 allowBuilds/core-js: false，不执行脚本，也不关闭整体构建策略校验。保留 catalog、其他依赖策略及已有明确的 core-js true/false 选择；复杂映射、版本规则或重复键拒绝自动合并。Monorepo 写根策略，格式化只额外包含该 YAML。依据见 [pnpm 构建策略文档](https://github.com/pnpm/pnpm.io/blob/main/docs/settings/build.md)。

## Cesium 首期生成设计

engine.mjs 统一引擎计划供 CLI/批量调用；Cesium 对应独立增量安装器。四种框架/语言复用 lazy 与场景源码，组件只管理挂载/卸载并放入 AdScreen 原生像素引擎层。lazy 不导入引擎，点击前不创建 Viewer；异步导入晚于卸载时丢弃，失败可重试，销毁断开 ResizeObserver 并调用 Viewer.destroy。模块级缓存不宣称逐实例释放。

固定 Cesium 1.146.0/static-copy 4.1.1，catalog: 只核对本应用已安装元数据，不执行入口。配置在安装前后复核并 wx 备份，增量插入 aduiCesium；不改 base 或正式构建入口。插件从应用依赖图定位四类资源，按 Cesium 资源根重建路径，避免静态复制插件 4 保留 node_modules 相对层级。资源冲突报错。运行时先计算部署 BASE_URL，再动态导入 Cesium 和样式；最小椭球关闭在线图层与地形，不需要 Token。Cesium 已支持 .adui 与 embedded/external 自动构建，设计见下文。验证及限制见 [CESIUM](CESIUM.md)。

## Babylon 首期生成设计

create/babylon 增量安装固定 @babylonjs/core 9.32.1，只新增源码快照和独立页面，不改 Vite 配置、正式入口或首页。按应用核对 manifest、框架/语言入口、大屏文件、输出路径及 catalog 实际安装版本，安装后再次预检。工作区由官方包管理器维护 catalog/锁文件，不执行依赖入口校验版本。

runtime 管理 Engine、Scene 与渲染循环；初始化异常和帧异常停止循环并释放已返回对象。lazy 管理异步导入、画布与 ResizeObserver，点击前不导入场景，晚到结果丢弃、失败可重试、销毁幂等。组件只处理框架挂载/卸载，场景放入 AdScreen 引擎层；ES 深路径引入本地立方体所需模块，不引入在线资产或静态资源插件。模型/加密保持独立，Babylon embedded/external 的共用构建接入见下文。见 [BABYLON](BABYLON.md)。

多引擎通过规范排序和单引擎子阶段复用实现；统一输出冲突/版本预检，基础工程、大屏仅首阶段创建，保护只传选定的模型适配阶段（优先 Three，其次 Babylon，最后 Cesium）。失败保留现场。设计与限制见 [MULTI_ENGINE](MULTI_ENGINE.md)。

交互多选解析数字/名称列表，保持单选返回 engine，多选返回规范 engines；确认后 CLI 分派到同一多引擎编排器。联合验收构建使用显式引擎分组、includeDependenciesRecursively=false 和 strictExecutionOrder=true，避免共享辅助模块导致跨引擎加载；普通项目配置不自动修改。

## Babylon 模型适配

共享 GLB 校验从 Three 移至 model-security/src/glb.mjs，Three 保留 re-export，生成器与自动模型构建快照同步复制。Babylon 使用同版本 core/loaders，独立 loader 动态导入官方 glTF 模块，以 Uint8Array 和 pluginExtension=.glb 加载 AssetContainer，不从文件头构造远端 URL。

model 控制器快照输入，授权认证后检查格式/扩展，再传独立副本给加载器；原临时明文最终清零，加载器副本随资产管理。request 版本与 AbortController 使旧请求失效；晚到容器移出场景并 dispose，成功 prepare/add 后才释放旧资产，失败保留旧资产。scene 负责有限包围边界、归一化、占位网格显隐；runtime 先销毁模型控制器再销毁 Scene/Engine。对加载器拒绝前未返回的内部对象不作全部回收承诺。

Vue/React TS/JS 使用同一模型控制器与本地验收 provider，文件读取后复查组件代次，清除授权/卸载同时取消加载。

## Babylon 自动构建接入

modelEngine 统一选择可保护引擎：优先 Three，其次 Babylon，最后 Cesium。单选、多选、CLI/交互和批量 JSON 共用默认 embedded；Cesium 单选也启用。多引擎只有模型适配器所属阶段安装保护，统一预检一套输出/env/脚本，后续阶段使用 none，避免配置、密钥和独立页面重复。

setupModelPlugin 增加显式 engine（默认 Three），验证对应当前 lazy 快照具备 loadBundledModel。模型插件、KEY 生成/轮换、备份与忽略规则保持共用；modelSmoke 按引擎选择模块、类型和状态回调，不复制另一套加密算法。Babylon lazy 负责同源密文下载和独立取消代次，下载后再初始化并交给模型控制器认证；清除、卸载、后发请求与外部 AbortSignal 均使旧下载/模型失效，晚到结果不提交。

verify-model-app 对真实生成应用临时构建官方首页与模型页，检查部署 base、密文数、解密与原 GLB 一致、无原模型或 KEY 字面量。临时配置 wx 写入并在 finally 删除，产物单独保存；不能与同一应用/工作区的检查并行。它验证特定应用，不把只读矩阵称为实际构建。

## Cesium 模型适配

Cesium 模型控制器复用 glb/adui/local-grant，与 Viewer/框架分离。先快照、授权认证与格式/扩展检查，再将独立 Blob URL 交给公开 Model.fromGltfAsync({url})。Blob 在资产生命周期内保留；临时明文最终清零，释放 URL 不代表抹除所有缓存副本。

创建返回后将候选模型隐藏加入 primitives，使用 readyEvent/errorEvent 和加载期间 postRender 请求帧等待资源就绪，30 秒超时退出。就绪后检查包围球并聚焦，显示新模型后释放旧模型；错误保留旧资产。代次与 AbortController 防止晚到结果安装，取消即解除等待监听并回收候选；异步创建本身不承诺可强制中断，晚到返回后销毁并撤销 URL。Viewer 销毁前先清理模型控制器。

createGlobe 返回包含原场景生命周期及模型方法的最小 handle，lazy 负责框架外的状态和晚到导入；Vue/React TS/JS 仅管理挂载与卸载。独立验收页提供本地 GLB/.adui 与验收密钥，不上传文件。固定示例地理锚点与包围球聚焦只用于集成验收，不等于业务模型配准或操作工具；Cesium 自动构建接入见下文。

## Cesium 自动构建接入

Cesium 复用原模型安装器、env 插件与 KEY 工具，setup/smoke 的 engine 参数扩展为三引擎。模型页使用 createLazyGlobe 和 GlobeHandle；默认 loader 先设置 BASE_URL 对应资源根再导入场景，不要求业务调用者重复配置。loadBundledModel 下载同源密文后才初始化并进入原模型控制器，清除/后发请求/卸载和外部 AbortSignal 统一取消旧下载与模型请求。

模型适配器优先级固定 Three → Babylon → Cesium，保持旧组合行为。每应用只创建一套模型目录、虚拟模块、密钥脚本和 model-smoke 页面；安装前统一预检输出/env/脚本，旧快照不覆盖。Cesium 资源插件与模型插件分别备份并增量合并，验收工具对模型解密和四类资源同时检查；多引擎另执行显式分组的联合构建。

## 2026-10-29：引擎视口与大屏验收页

共享 screen/src/viewport.mjs 提供有效比例及视口观察，生成时分别复制到 adui-cesium / adui-babylon，避免新增引擎依赖旧 AdScreen 快照里的新文件。尺寸由引擎适配器读取 CSS 像素，HUD 变换不参与缓冲区计算。Babylon resolution 使用 hardwareScalingLevel=1/ratio；Cesium resolution 使用 useBrowserRecommendedResolution=false、resolutionScale=ratio/nativeDpr，resize 后请求渲染。

观察器监听 ResizeObserver、window.resize、document.fullscreenchange 和动态 resolution 查询，并持有一个可取消的 requestAnimationFrame 检查 DPR 数值；仅数值改变才读取布局和调整缓冲区。关闭引擎时清理全部来源，异步已排队通知通过 disposed 守卫忽略。Babylon 初始化也调整尺寸，异常仍进入原资源清理路径。

engine-screen-smoke 生成两引擎共用的 Vue/React 验收 App：保留独立入口及原引擎 Demo，新增 HUD 标记、模式循环、半宽容器、非缩放覆盖层内全屏控件。回调以闭包保留方法上下文，失败反馈到 status。该控件仅用于独立验收页。

## UI Smoke 五种 UI 适配

ui-smoke 内部预设表统一维护框架/UI 对应包、展示名、Vue 标签/resolver、主按钮属性和可选样式入口，生成和预检使用同一表。Vue 保留自动导入，React 组件和挂载模块继续分离。既有入口、配置及清单不修改；JS/TS、CSS 选择与输出冲突保护沿用原流程。批量配置逐应用调用该工具，不增加根级 UI 依赖。verify-ui-build 提供本地双入口构建，临时配置 wx 创建，构建成功或失败均清理，只接受指定验收 base；没有生产配置迁移或新架构选型。

## 生成阶段失败与人工恢复

createStageRunner 只包裹执行动作，不接管原有路径/选项预检。成功后记录阶段，失败时保留 cause、有效非零 exitCode，快照复制已完成步骤并附目标和人工检查说明。CLI 继续通过原有官方模板入口和集成函数执行，异常传播到顶层停止后续动作。

批量执行仍重建并预检计划；catch 仅对当前 index 之后的未执行步骤生成 recovery.pending，包含 label/cwd/command/args 和 PowerShell 显示文本。失败阶段的局部输出不视为完成，不生成自动重试动作。PowerShell 对每个参数单独单引号转义，不把显示文本交给 shell。没有新状态文件、依赖或配置迁移。

## 已有工作区只读检查

workspace-inspect 复用 safe-paths 的逐祖先链接拒绝、现有官方 YAML 列表校验和批量 JSON 校验，不调用 loadBatchPlan 的新建目标校验。成员按 apps/packages/tools 一层枚举，跳过隐藏目录和 node_modules；JSON/YAML 最大 1 MiB。不执行 Vite 配置、不返回清单脚本或环境文件内容。

携带预期配置时复用 UI/CSS、screen、engine、modelProtection 的计划，检查对应声明及输出文件存在性；生成计划只在内存中执行，模型 env 文件仅检查元数据。输出 not-created / blocked / present，最后一个状态不表示依赖已安装或配置内容兼容。CLI 分支位于创建/批量生成之前，严格限制参数组合；不启动子进程或写入恢复状态。

## 逐应用恢复计划

workspace-recovery 读取并校验原 JSON 一次，将同一配置交给只读检查，避免两次读取配置产生选项不一致。全局根/成员问题阻塞全部操作，应用局部缺失仅阻塞自身。对于 not-created 再调用 resolveWorkspaceApplication 检查实际目录、作用域包名、peer 以及根声明配置；若目标在规划期间出现，返回 manual-review。

application-invocations 抽取原批量应用 argv 构造，批量新建与恢复计划共用，保留框架/语言/UI/CSS/大屏/引擎/模型保护选项。UI Smoke argv 与增强安装选项分离，防止生成时重复集成。pendingRecovery 继续负责显示用 PowerShell 转义；没有新的 shell 执行路径。present 仅规划验证命令，不自动读取或执行 package scripts。

## 缺失应用恢复执行

workspace-recovery-execute 仅读取一次校验后的原配置，使用 planRecoveryForConfig 重建计划；初始存在人工阻塞直接失败。固定初始 create-missing 名单，避免在运行中接管新出现的目录。每个应用前重新检查全计划及 resolveWorkspaceApplication，使用共用 argv 构造并以 Node argv 子进程执行，不运行 PowerShell 展示文本。

创建后以同一应用 uiSmoke=false 核对基础/预设结构，再通过提取的只读 preflightUiSmoke 检查验收页依赖、配置及文件冲突；CLI 实际写入时仍重检并使用原文件保护。验收页创建后再核对完整结构。已存在应用完全跳过；completed 记录成功返回的子进程，后续结构失败仍作为失败报告，不称为构建成功。注入 runner 仅用于受控生命周期验证，CLI 不提供自定义执行器。

## V1 示例与文档检查

verify-examples 在仓库外新建独立临时目录，逐个以 Node argv 调用真实 CLI --config --dry-run，检查官方 Monorepo 阶段、应用数量及临时目录无输出，最后清理临时目录；输出计划计数与 actualBuilds=0。没有安装、构建或发布路径。node --test 同步覆盖这项示例兼容检查。

validate-docs 保留必要文件与需求编号检查，并枚举 docs 的普通 Markdown 文件检查相对链接；不跟随目录链接。README、示例索引和 V1 清单通过链接统一导航，历史验证记录保留，当前状态正文同步纠正过时范围。

## 共享构建策略的格式化工作目录

Vite+ 当前 fmt 不接受含 .. 的 PATH。applyIntegrations 不再把根 pnpm-workspace.yaml 拼入子应用的相对格式化列表；应用文件仍在应用目录定向处理，共享策略单独在 dirname(policyPath) 中格式化 basename(policyPath)。实际格式化前继续检查链接路径，保留原 core-js 策略合并和用户规则。失败现场及文件保护不变，没有新增覆盖式恢复能力。

## Node 运行时兼容边界

根和 create 包的 engines.node 与当前锁定 Vite+ 1.4.0 一致，为 `^22.18.0 || ^24.11.0 || >=26.0.0`，修正原 >=22 的过宽声明；不新增依赖或修改官方模板输出。最低版本验证通过进程级 VP_NODE_VERSION 同时选择 CLI 及其 Vite+ 子进程，配合显式 Node 路径与环境报告核对，避免实际使用较高托管版本却误记为 Node 22。复验方法见 [Harness](HARNESS.md#node-22-最低版本复验)；生成器测试与真实项目构建证据分开记录。
