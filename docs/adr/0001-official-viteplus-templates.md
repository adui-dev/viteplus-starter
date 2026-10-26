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

采用方案 3。Vue 与 React 都在 Vite+ 官方模板提供的框架选择流程中生成；本项目仅增加校验与可选集成。不得通过 `vp migrate` 替代此路径。

## 理由与权衡

优势：减少官方工程结构重复维护、统一 Vite+ 工具链。代价：依赖官方 CLI 交互及兼容变化，自动化参数需要版本验证。

## 额外约束

用户明确要求不增加任何 CI/CD。架构中只提供手动本地检查和测试。
