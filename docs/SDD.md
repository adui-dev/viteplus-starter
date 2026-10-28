# 详细设计

## 本地质量基线

根 Vite+ fmt 统一自有源码、测试与文档格式；仅排除原样保存的第三方 `.agents/skills/git-commit/**`、`.agents/skills/gitmoji/**`，保留其上游指令与安装哈希。没有关闭源码检查、lint 规则或 Git hooks。

## 官方模板语言选择（新增）

- Application 的 `--language ts|js` 默认 `ts`。Vue 选 `vue-ts` 或 `vue`；React 选 `react-ts` 或 `react`，全部使用 Vite+ 官方 `vite:application`，不再自行运行其他生成器。
- `options.mjs` 负责框架 × 语言的模板映射及校验；`cli-args.mjs` 解析 `--language`；`prompts.mjs` 在框架后询问语言，默认 TypeScript。
- Monorepo 根目录禁止传 `--language`；后续需为各子应用独立设置。
- `integrations.mjs` 按语言选择 `src/main.ts` / `src/main.js`（Vue）和 `src/main.tsx` / `src/main.jsx`（React），同时识别实际存在的 `vite.config.ts|mts|js|mjs`。若存在多个 Vite 配置则拒绝自动修改。
- UnoCSS 配置采用 `uno.config.ts|js`；Vue JavaScript 组件自动导入设置 `dts: false`，Vue TypeScript 保留 `src/components.d.ts` 及对应格式忽略规则。
- 旧版 `starter.plugins.ts` 的迁移只适用于历史 TypeScript 工程；JS 创建和 `--apply-existing` 不使用此历史格式。
- 已完成代码级参数/生成验证；Vue + JavaScript + TDesign + UnoCSS、React + JavaScript + Ant Design + Tailwind 的官方创建、依赖安装和 `vp check/build` 均已在 Windows 验收通过。组件真实渲染及剩余组合尚待测试。

## P3 生成器修复：插件内联与旧配置修复

- `packages/create/src/format-config.mjs`：仅针对 Vue UI 自动导入，向 Vite+ `fmt.ignorePatterns` 添加 `src/components.d.ts`，避免自动生成的类型声明在重新生成后造成不稳定格式检查。保留原有 `fmt`、`ignorePatterns`，重复调用不新增重复条目；不支持的配置格式拒绝修改。该规则仅影响格式检查，不关闭 Lint 或 TypeScript。

- `generateIntegration` 在 `vite.config.ts` 内联 Vite 插件的 import 和工厂调用，避免 `starter.plugins.ts` 跨文件导入；兼容普通数组、`lazyPlugins` 及无插件字段的 Vite+ 配置。
- `applyIntegrations` 在写入后调用 `vp fmt . --write`，不得跳过失败。
- `--repair-existing` 仅用于符合已知 Starter 旧格式的现有 Vue/React Application：先验证项目类型、旧插件文件及配置形态，再替换旧导入并将 `starter.plugins.ts` 备份为 `starter.plugins.ts.bak`，随后格式化；**不安装依赖，也不重建项目**。
- 此功能不是通用任意 TypeScript 配置的转换器，无法识别的结构必须拒绝修改；真实 Windows `vp check` 待用户复验。

## 当前可用模块

`packages/create/src/options.mjs`:

- `validateProjectOptions({name,type,framework})`：名称限制为安全的小写 kebab-case；Application 强制 vue/react，Monorepo 不接受根框架参数。
- `buildVpCommand(options)`：组装 Vite+ 官方模板创建命令，不执行命令。

`packages/create/src/cli-args.mjs`：参数白名单、缺值和重复参数校验。

`packages/create/src/prompts.mjs`：交互式名称、类型、框架选择，非法名称重试，创建确认/取消。

`packages/create/bin/cli.mjs`:

- 支持 `--name`、`--type`、`--framework`、`--dry-run`、`--help`。
- 交互缺失选项可从终端读取，支持默认值与二次确认；取消时不调用 Vite+；非 TTY 必须显式传参。
- 已存在目标目录立即拒绝；仅执行白名单参数，不使用用户输入拼接 shell 命令字符串。
- 委托 `vp` 创建并传递退出状态；Application 向 `vite:application` 转发 `-- --template vue-ts|react-ts`。Windows 只使用白名单参数拼接单个 shell 命令避免 DEP0190，真实 Windows 创建仍需复验。

## UI/CSS 可选集成（已编写，待组合验收）

`packages/create/src/integrations.mjs`：

- `planIntegrations(options)`：按 Vue/React 生成白名单依赖清单，拒绝 React + Element Plus、Monorepo 根统一配置。
- `generateIntegration(options, viteConfig, mainSource)`：保留 Vite+ 官方配置，不再仅识别直接数组；调用 `vite-config.mjs` 兼容顶层普通 plugins、lazyPlugins 或无 plugins 情况，未知结构停止。
- `applyIntegrations(directory, options)`：在安装依赖前先生成并校验修改后的配置、检查目标文件是否存在；校验失败不安装依赖。安装失败时不写入插件配置，但官方基础项目可能已存在。
- 新增 `--apply-existing` 显式补装：校验原目录、package.json 中的 `vite-plus` 及 Vue/React 依赖，再对已有的官方基础应用安装所选集成；不重新执行 `vp create`。
- Vue 使用 `unplugin-vue-components` 和对应 Resolver 按需引入组件；React 依赖自身组件导入机制；UnoCSS / Tailwind 均写入官方建议的插件与样式入口。
- 支持独立 Application 及通过 `--workspace` 添加的 Monorepo Application；不在 Monorepo 根安装 UI/CSS。
- `collectProjectOptions` 基础参数已全部提供时直接返回校验结果，未指定 UI/CSS 默认视为 None；修复 P3 新增交互字段导致的非交互单元测试回归。
- 自动修改仅支持官方 Vue/React 的 `plugins: [...]` 格式以及标准 `src/main.ts[x]` 入口，不对未知结构强行变更。

## 规划模块（未实现）

- 进一步扩展选项 Schema：`engines`、`bigScreen`、`modelSecurity`（基础 `framework`、`ui`、`css` 已实现）。
- 插件合并器：先形成配置中间模型，再统一写入 Vite 配置和入口，避免重复覆盖。
- 3D 安全加载：AES-256-GCM 文件协议、授权密钥接口契约及 Three/Cesium/Babylon 适配。
- Monorepo 多应用：每个应用独立选择框架、UI、CSS、大屏及 3D。
- 失败恢复：区分生成前校验失败、模板执行失败与可选集成失败；避免错误清理他人已有文件。

## 需求追踪

- FR-001/002、NFR-001 → `packages/create/src/options.mjs`、`packages/create/src/cli-args.mjs`、`packages/create/src/prompts.mjs`、`packages/create/bin/cli.mjs`、`packages/create/test/*.test.mjs`。
- NFR-002/003 → `scripts/validate-docs.mjs`、`docs/HARNESS.md`。
- FR-003/004 → `packages/create/src/integrations.mjs`、`packages/create/test/integrations.test.mjs`（组合构建待验收）。
- FR-005 至 FR-007 → 规划，暂无实现文件或测试。
- FR-008 → `packages/create/src/workspace.mjs`、`packages/create/test/workspace.test.mjs`。
- FR-010 → `packages/create/src/batch.mjs`、`packages/create/test/batch.test.mjs`、`examples/monorepo.batch.json`。

## 待确认

真实 Vue/React 生成的依赖和构建复验、Monorepo 子应用框架选择方式、最低支持 Vite+ 版本、npm 发布包名称、模型授权服务协议与大屏策略的正式参数契约。

## UI Smoke 工具设计

- `packages/create/src/ui-smoke.mjs`：`planUiSmoke` 负责生成独立 HTML 与 Vue SFC、React JSX/TSX；`addUiSmoke` 校验项目 `package.json`、框架语言入口、Vite+ 插件配置，写入前检查同名文件。
- `--ui-smoke` 只用于现有独立 Application，不能与 `--dry-run`、`--apply-existing`、`--repair-existing` 同时使用；仅支持 Vue + TDesign / React + Ant Design，TS/JS 均适用。
- 新增 `ui-smoke.html`、`src/ui-smoke/`，不改动业务入口或 Vite 配置；写入使用 `wx` 防覆盖；仅对新文件调用 `vp fmt`。
- Vue `<t-button>` 验证组件自动导入；React 显式引用 `Button`；均含点击计数及可选 UnoCSS/Tailwind 视觉标记。
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

新增 CLI --model-protection 与 JSON modelProtection，严格枚举 none/embedded/external，Three 默认 embedded；非 Three 不能启用，Monorepo 根拒绝统一设置。交互流程在 UI/CSS 后加入大屏、引擎、保护模式，最终摘要含选择；非交互完整参数不询问。批量 UI Smoke 阶段去除引擎和保护参数，避免重复补装。

planModelProtection 只列模式/文件/脚本/执行时生成标记；执行前检查 env、模型脚本、目录/链接及配置形态。新增模型集成在官方模板、UI/大屏/Three 就绪后运行安全安装器，生成项目独有 .env.local、空 src/models 与 MODEL_GUIDE，再定向格式化。Vite、package 和已有 Git 忽略文件分别备份；保留已有脚本，冲突拒绝。

project-key.mjs 同时是可导入的生成函数与生成项目中的 keygen.mjs 脚本；models:keygen 禁止覆盖已有 KEY，models:keyrotate 先 wx 备份再更新 KEY/标识，保留其他 env 配置，输出不含密钥值。新增 .env.local* 忽略规则覆盖轮换备份。IV 仍由 encryptAdui 对每个模型随机生成，不在 env 生成固定 IV。
