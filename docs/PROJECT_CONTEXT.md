# 项目上下文

- 项目：ADui Vite+ Starter，仓库 `adui-dev/viteplus-starter`。
- 当前阶段：基础 CLI 框架模板选择修复；UI/CSS/3D 插件仍未实现。
- 目标：Vite+ 官方 Vue/React Application 与 Monorepo 项目创建，按需集成 UI、CSS、大屏、3D、安全加载。
- 技术原则：Vite+、TypeScript 优先、pnpm；不使用第三方 create-vue/create-vite 作为基础创建器。
- 已存在：原仓库 MIT LICENSE；本轮新增 CLI 原型、基础测试、核心文档、本地文档检查与一份项目 Skill。
- 用户本地实测：Vite+ v1.4.0 的默认 Application 能通过 `vp check`、`vp build`、`vp dev`；但未指定模板时未生成 Vue/React。修复后的显式 `vue-ts` / `react-ts` 创建尚待复验。
- 尚未验证：修复后真实 Vue/React 项目生成、UI/CSS/3D 集成、模型安全运行时、npm 发布。
- 明确禁止：**任何 CI/CD 工作流**（GitHub Actions、其他流水线或自动部署）；遵循用户当前要求。

## 进行中与下一阶段

1. 在用户本地重新执行 `--framework vue` 和 `--framework react` 的真实创建与检查，确认依赖和构建结果；Monorepo 创建另行验证。
2. 完善可重复的交互与非交互式选项测试。
3. 再逐步实现 UI/CSS、大屏、3D、模型安全适配。
4. 每阶段同步需求、SDD、代码索引与验证结果。

## 风险

用户本地的原始默认模板验证通过，但不能证明 Vue/React 生成成功。修复后的 CLI 已做 Node 单测及 Dry Run，尚需用户 Windows 环境真实测试；不得将 Dry Run 视为框架构建通过。
