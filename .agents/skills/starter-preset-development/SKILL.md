---
name: starter-preset-development
description: 在 ADui Vite+ Starter 仓库中新增或修改 UI、CSS、大屏、3D、模型安全集成预设时使用，确保兼容性校验、官方模板保留、测试与文档追踪。
---

# 开发 Starter 集成预设

1. 阅读 `AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/SDD.md`、`docs/PROJECT_CONTEXT.md`。
2. 明确预设支持的框架、项目形态、依赖、样式与 Vite 插件；列出不支持的组合。
3. 所有基础工程必须通过 `vite:application` / `vite:monorepo` 创建，不能复制自维护 Vue 或 React 基础工程。
4. 先执行输入校验，再修改目标文件；禁止覆盖已有代码和生产凭据。
5. 如果预设涉及 3D，引入模型加解密时保持授权接口、解密核心与引擎适配分离；不得宣称浏览器解密完全防止提取。
6. 新增最小正常、异常及边界用例。依赖可用时在 Vue、React 与 Monorepo 中执行适用的 check/build 验证。
7. 更新 SDD、CODEBASE_MAP、PROJECT_CONTEXT 和对应需求状态；只报告真实执行结果。
8. 不得创建任何 CI/CD 配置，不执行发布。
