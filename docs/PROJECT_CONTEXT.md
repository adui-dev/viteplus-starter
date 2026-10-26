# 项目上下文

- 项目：ADui Vite+ Starter，仓库 `adui-dev/viteplus-starter`。
- 当前阶段：空仓库的首轮工程初始化。
- 目标：Vite+ 官方 Vue/React Application 与 Monorepo 项目创建，按需集成 UI、CSS、大屏、3D、安全加载。
- 技术原则：Vite+、TypeScript 优先、pnpm；不使用第三方 create-vue/create-vite 作为基础创建器。
- 已存在：原仓库 MIT LICENSE；本轮新增 CLI 原型、基础测试、核心文档、本地文档检查与一份项目 Skill。
- 尚未验证：Vite+ 实际安装与项目生成、UI/CSS/3D 依赖、模型安全运行时、npm 发布。
- 明确禁止：**任何 CI/CD 工作流**（GitHub Actions、其他流水线或自动部署）；遵循用户当前要求。

## 进行中与下一阶段

1. 在本地有 Vite+ 的环境实测 `vite:application` 和 `vite:monorepo`，确认 Vue/React 选择方式。
2. 完善可重复的交互与非交互式选项测试。
3. 再逐步实现 UI/CSS、大屏、3D、模型安全适配。
4. 每阶段同步需求、SDD、代码索引与验证结果。

## 风险

当前执行环境无法通过 npm 注册表下载 Vite+，所以未运行完整 Vite+ 项目生成和构建；不得描述为已通过。
