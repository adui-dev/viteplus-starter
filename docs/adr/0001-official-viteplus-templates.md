# ADR-0001：仅使用 Vite+ 官方基础项目模板

- 状态：Accepted
- 日期：2026-10-26
- 关联：FR-001、FR-002、FR-008

## 背景

项目需要同时支持 Vue、React、Application 和 Monorepo，并能长期跟随 Vite+ 默认工具链。

## 候选方案

1. 各框架分别使用 create-vue / create-vite。
2. 从固定模板目录复制完整工程。
3. 统一委托 Vite+ 内置 `vite:application` 与 `vite:monorepo`。

## 决策

采用方案 3。Vue 与 React 都从 Vite+ 的 `vite:application` 入口生成，按语言传入官方 create-vite 的 `vue` / `vue-ts` / `react` / `react-ts` 模板选项（TypeScript 默认）；本项目仅增加校验与可选集成。不得通过 `vp migrate` 替代此路径。

## 理由与权衡

优势：减少官方工程结构重复维护、统一 Vite+ 工具链。代价：依赖官方 CLI 交互及兼容变化，自动化模板参数已结合 Vite+ 官方源码确认，实际生成仍需冒烟验证。

## 额外约束

用户明确要求不增加任何 CI/CD。架构中只提供手动本地检查和测试。

## 2026-10-27：Monorepo 子应用

继续采用官方入口：根用 `vite:monorepo`，成员以根为 cwd 调用 `vite:application --directory apps/<name>`，不再传入只适用于独立工程的 Git 初始化选项。保留官方默认应用和库，不复制独立工程到工作区，也不走迁移流程。选择逐应用 `--workspace` 命令，先保证混合框架与语言的隔离；批量配置另行设计。

实测发现插件包遗漏 Vite peer 会在 pnpm 混合工作区解析到另一类型实例，造成 Vue TS 的 TS2321。采用 pnpm packageExtensions 增量补充已知包的 peer 元数据，保留各应用原有 TypeScript/Node 类型版本；不通过强制统一依赖版本、类型断言或关闭检查绕过。已有扩展冲突时在生成前拒绝修改。

## 2026-10-27：批量生成的执行方式

批量 JSON 只编排官方新建流程，不引入另一套模板。根直接委托 vite:monorepo，成员阶段通过 Node argv 子进程复用既有单应用 CLI，避免重复实现插件合并与路径保护；代价是每个成员启动独立进程。首版限定新工作区并串行执行，失败保留现场，后续再独立设计显式恢复或向已有工作区批量添加的协议。
