# 项目上下文

- 项目：ADui Vite+ Starter，仓库 `adui-dev/viteplus-starter`。
- 当前阶段：P3 缺陷修复：解决未提供完整 UI/CSS 选项时的单元测试回归，以及官方 Vite+ `lazyPlugins` 或无插件字段配置注入失败。提供显式 `--apply-existing` 补装入口；真实构建待用户复验。
- 目标：Vite+ 官方 Vue/React Application 与 Monorepo 项目创建，按需集成 UI、CSS、大屏、3D、安全加载。
- 技术原则：Vite+、TypeScript 优先、pnpm；不使用第三方 create-vue/create-vite 作为基础创建器。
- 已存在：原仓库 MIT LICENSE；本轮新增 CLI 原型、基础测试、核心文档、本地文档检查与一份项目 Skill。
- 用户本地实测：Vite+ v1.4.0 的默认 Application 能通过 `vp check`、`vp build`、`vp dev`；但未指定模板时未生成 Vue/React。修复后的 Vue/React 创建已获用户确认成功。
- 用户本地反馈：先前 20 个测试中 19 个通过、1 个失败（已针对原因修复）；Vue + TDesign + UnoCSS 项目基础模板已生成，但增强阶段在依赖安装前因 Vite 配置识别失败。修复后的完整测试与真实构建尚未复验。
- 尚未验证：修复后 UI/CSS 依赖安装、check/build，Monorepo、3D、安全模型加载及 npm 发布。
- 明确禁止：**任何 CI/CD 工作流**（GitHub Actions、其他流水线或自动部署）；遵循用户当前要求。

## 进行中与下一阶段

1. 用户运行 `git pull --ff-only` 后执行 `node --test`，再用 `--apply-existing` 为已存在的 `starter-vue-p3` 补装 TDesign + UnoCSS；检查 `vp check/build`。
2. 完善可重复的交互与非交互式选项测试。
3. 再逐步实现 UI/CSS、大屏、3D、模型安全适配。
4. 每阶段同步需求、SDD、代码索引与验证结果。

## 风险

用户提供的日志确认 Vue 的 P2 交互创建成功，未出现 DEP0190。P3 配置注入补丁已通过独立 Node 测试：普通 plugins、lazyPlugins、无 plugins、lint.plugins 嵌套字段及异常结构；用户 Windows 下完整依赖安装和构建待复验。
