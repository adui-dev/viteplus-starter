# JSON 批量创建 Monorepo

一份 JSON 配置描述新工作区及其中的 Vue/React 应用。根使用 Vite+ 官方 `vite:monorepo`，应用使用 `vite:application`，保留官方 website/utils；不创建 CI/CD。

## 配置

仓库提供 [可执行样例](../examples/monorepo.batch.json)：

```json
{
  "version": 1,
  "name": "adui-batch-demo",
  "apps": [
    { "name": "admin", "framework": "vue", "ui": "tdesign", "css": "unocss", "uiSmoke": true },
    {
      "name": "portal",
      "framework": "react",
      "language": "js",
      "ui": "antd",
      "css": "tailwindcss",
      "uiSmoke": true
    }
  ]
}
```

| 字段             | 必填 | 规则                                                                       |
| ---------------- | ---- | -------------------------------------------------------------------------- |
| version          | 是   | 数字 1                                                                     |
| name             | 是   | 新工作区名称，安全的小写 kebab-case                                        |
| apps             | 是   | 1–32 个应用，严格按数组顺序创建                                            |
| apps[].name      | 是   | 应用名，不能重名、与根同名或使用 website/utils                             |
| apps[].framework | 是   | vue / react                                                                |
| apps[].language  | 否   | ts / js，默认 ts                                                           |
| apps[].ui        | 否   | none / element-plus / antd / tdesign，默认 none；React 不支持 element-plus |
| apps[].css       | 否   | none / unocss / tailwindcss，默认 none                                     |
| apps[].uiSmoke   | 否   | 布尔值，默认 false；true 仅支持 Vue/TDesign、React/Ant Design              |

未知字段、null/错误类型会报错，不忽略拼错的选项。根不允许设置 framework/language/UI/CSS。名称不允许路径或 Windows 保留设备名称；根也不能与默认 website/utils 包重名。仅支持最大 1 MiB 的 JSON，接受 UTF-8 BOM。

## 预览与执行

在仓库上级目录执行，输出为**当前目录下的配置 name**，与配置文件所在目录无关；目标必须不存在，不能在已有 workspace 内嵌套创建。

```powershell
cd D:\Workspace\adui-studio
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/monorepo.batch.json
```

dry-run 输出规范化选项、官方根命令、每应用的 CLI argv/官方模板命令、cwd/target、UI/CSS 依赖，以及可选验收页文件，**不创建目录或安装依赖**。`--config` 只能与 `--dry-run` 同用；已有工作区逐应用维护请继续用 `--workspace`。

执行时先校验全部配置和目标，再生成官方根，随后统一检查真实根和全部成员路径，最后按以下顺序执行：

1. 工作区 adui-batch-demo（保留 website/utils）。
2. Vue TS 的 apps/admin，及其可选 UI Smoke。
3. React JS 的 apps/portal，及其可选 UI Smoke。

每个应用复用现有 CLI 的插件、依赖、类型声明及格式兼容处理。Node 子进程使用 argv 传路径，不执行配置提供的脚本或命令；此格式没有自定义命令字段。

## 验收

```powershell
cd adui-batch-demo
vp run ready
vp check
cd apps/admin
vp dev
# 浏览器访问终端 URL 的 /ui-smoke.html；结束服务后对 ../portal 重复
```

root 的 ready 会调用检查、默认库测试和所有包的完整 build 脚本。uiSmoke 成功生成只表示验收页已写入，浏览器中的按钮、计数、CSS 和控制台仍需实际验证。

## 失败与现场保护

预检错误不会启动官方生成；已有目标（含悬空链接）直接拒绝。实际生成中某阶段失败，立即停止并报告已完成、失败与未执行阶段、保留目录。失败阶段可能已安装依赖或写入部分文件；**不自动清理、覆盖、回滚或续跑**。

不要删除未知文件后盲目重跑；先检查现场。修好已有工作区后可用逐应用 `--workspace` 命令显式处理未完成应用；再次执行相同 batch 会因根目录已存在而拒绝。不要同时向同一工作区运行多个生成命令。

## 验证状态

本轮单元与受控失败测试已覆盖配置、顺序和文件保护；全新混合工作区实机验收进行中，最终证据见 [项目状态](PROJECT_CONTEXT.md)。所有结果以实际执行为准。
