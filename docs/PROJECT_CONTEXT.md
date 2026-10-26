# 项目上下文

- 项目：ADui Vite+ Starter，仓库 `adui-dev/viteplus-starter`。
- 当前阶段：P2 基础交互式 CLI 完成并通过本地 Node 单元测试；UI/CSS/3D 插件仍未实现。
- 目标：Vite+ 官方 Vue/React Application 与 Monorepo 项目创建，按需集成 UI、CSS、大屏、3D、安全加载。
- 技术原则：Vite+、TypeScript 优先、pnpm；不使用第三方 create-vue/create-vite 作为基础创建器。
- 已存在：原仓库 MIT LICENSE；本轮新增 CLI 原型、基础测试、核心文档、本地文档检查与一份项目 Skill。
- 用户本地实测：Vite+ v1.4.0 的默认 Application 能通过 `vp check`、`vp build`、`vp dev`；但未指定模板时未生成 Vue/React。修复后的 Vue/React 创建已获用户确认成功。
- 尚未验证：P2 新交互流程的 Windows 实机创建、Monorepo、UI/CSS/3D 集成、模型安全运行时及 npm 发布。
- 明确禁止：**任何 CI/CD 工作流**（GitHub Actions、其他流水线或自动部署）；遵循用户当前要求。

## 进行中与下一阶段

1. 在 Windows 本机运行无参数交互 CLI 并验证确认、取消、错误输入；Monorepo 创建另行验证。
2. 完善可重复的交互与非交互式选项测试。
3. 再逐步实现 UI/CSS、大屏、3D、模型安全适配。
4. 每阶段同步需求、SDD、代码索引与验证结果。

## 风险

用户报告修复后的 Vue/React 创建成功；本轮新增的交互式流程已通过独立 Node 22 单测（11 项），但尚未进行 Windows 真实交互复验。
