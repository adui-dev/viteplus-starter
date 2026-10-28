# 模型自动加密打包

按用户最终目标提供“防直接复用、提高提取成本”的无服务端方案：建模师交付自包含 GLB，源码保存在 src/models；开发/构建自动扫描并生成 .adui，浏览器自动解密。默认 embedded 模式把密钥做随机掩码拆分后放入运行时代码，不保存原始密钥字面量；可选域名限制。拆分、混淆与域名检查都可被逆向或修改，不宣称无法破解或 DRM。

## 安装与运行

应用须由当前生成器的 `--screen --engine three` 创建，支持 Vue/React × TS/JS、独立应用和 Monorepo 成员。先在仓库根执行：

```powershell
# 默认 embedded：无服务端、无需手动解锁
node packages/model-security/bin/setup.mjs --project ../my-three-app

# 创建新密钥；已有 .env.local 会拒绝覆盖
node packages/model-security/bin/cli.mjs keygen-env --out ../my-three-app/.env.local --key-id project-v1
```

安装器只增量添加 adui-model-build、虚拟模块声明、独立 model-smoke 页面，并向官方 Vite 插件列表追加 aduiModels。Vite 原文件保存在同目录的 `.before-adui-models` 备份，其他原配置保留；正式首页、App/main、大屏和已有 Three 源码不覆盖。已有输出/备份、链接路径或旧运行时不匹配时拒绝。不会安装依赖或自动迁移旧快照；失败保留现场，不自动回滚。

在 `.env.local` 中配置：

```dotenv
ADUI_MODEL_KEY_ID=project-v1
ADUI_MODEL_KEY=<keygen-env生成的32字节Base64密钥>
# 可选，逗号分隔的 hostname；不含协议、端口或通配符
ADUI_MODEL_ALLOWED_HOSTS=your-site.example,www.your-site.example
```

密钥文件应被 Git 忽略，不能放入 public、dist 或随网站交付；不要将已有业务项目的生产密钥复制到测试项目。安装器不覆盖或自动追加已有 env 文件，也不改变目录 ACL。首次安装后对新增文件及被修改的 Vite 配置做定向 `vp fmt <路径...> --write`，然后运行 vp check。

将 GLB 放入 src/models（可有子目录），运行 vp dev，打开 `/model-smoke.html`。默认模式自动加载首个模型；选择器可切换，按钮可重载。GLB 变化及新增/删除会重新扫描加密并刷新页面；源码不改名、不删除，也不生成 plaintext 中间文件。密钥变化需要重新部署匹配的 JS 与 .adui，不能混用不同构建产物。

Vite 默认只构建正式首页。插件仍会把全部受保护 GLB 输出为 .adui；独立 model-smoke 页面要作为额外 HTML 输入才能在生产预览访问，不能用默认首页构建替代验收页构建。正式业务应调用下面的 API，不需要替换首页为验收页。四组合专项双入口构建与实机结果见 [PROJECT_CONTEXT](PROJECT_CONTEXT.md)。

## 业务加载 API

```typescript
import models from "virtual:adui-models";
import { authorize } from "virtual:adui-model-key";
import { createLazyScene } from "./adui-three/lazy.mjs";

const scene = createLazyScene(host, { onError: (error) => console.error(error.message) });
await scene.loadBundledModel(models[0], { authorize });
// 组件卸载时
scene.destroy();
```

models 包含 name、modelId、keyId、url，生产 URL 指向带随机构建哈希的 .adui；文件头绑定标识，避免替换成目录中的另一合法模型。加载器只获取同源 .adui，限制响应大小并支持 AbortSignal；后续请求、清除、卸载会取消或丢弃晚到结果。已有模型在认证失败时保留，成功后释放旧模型。

## 配置与边界

`aduiModels({envFile:'.env.local',modelsDir:'src/models',keyMode:'embedded'})`：envFile 可指定 `.env.development` 等单个文件；不自动合并多个 env 文件，也不读取宿主 process.env 中同名值。参考工程的 VITE_ADUI_AES_KEY 支持 UTF-8 32 字节，仅 embedded 模式可用；建议新项目改用 ADUI_MODEL_KEY，避免业务代码直接引用 VITE_ 变量。VITE_ADUI_AES_IV 不参与新格式，每个 .adui 使用随机 96 bit IV 和 AES-256-GCM 认证；原 CryptoJS AES-CBC/Base64 .adui 不自动兼容，须从原 GLB 重新封装。参考业务项目未被修改。

开发服务器返回加密资源，拒绝直接访问 GLB/GLTF/FBX/OBJ/MTL、env 或密钥文件；直接 import GLB（含 ?url/?raw）会报错，统一从虚拟目录加载。生产构建前后检查 public、输出 bundle、写入磁盘后的产物，发现原模型、已知模型明文/Base64 副本或原始密钥的二进制/Base64/hex 字面量会失败。只检查已知保护范围，不声称识别任意第三方插件的恶意自定义编码；构建失败可能保留部分输出，失败产物不得部署。

embedded 模式的拆分材料和解密逻辑仍在网站 JS 中，合法浏览器会重建密钥。域名限制仅作用于生产运行时授权函数，开发服务器不限制；未配置时不限制域名。建议正常生产构建不公开 sourcemap，本轮为了检验泄漏路径，专项构建开启 sourcemap 检查，未将它设置成项目默认值。

首期只接受 32 MiB 内的自包含 GLB；最多 128 个、总明文 128 MiB。其他模型文件、外部贴图引用、压缩解码器不支持；public 中的原模型须先移动到受保护目录，插件不会自动移动或删除用户文件。模型目录必须在项目内且不能位于 public/dist，目录树中的链接拒绝。源码与密钥仍存在开发机，不保护开发机上的源文件。

## 可选 external 模式

安装时显式 `--key-mode external`，运行时通过独立 JSON 解锁；网站中不放密钥重建材料。用 `export-unlock --env-file <.env.local> --out <网站之外的unlock.key.json>` 导出解锁文件，单独交付。页面提供解锁与锁定并清除；刷新后需重新解锁，不保存到浏览器存储。此模式可保护只有站点文件的副本，但掌握解锁文件的人仍可提取模型。无服务端、口令登录或实时撤销服务。

## 验证

运行 node --test、node scripts/validate-docs.mjs、vp check；另执行 `node scripts/verify-model-build.mjs --model <GLB路径>`，真实调用 Vite+ build/createServer，检查两种模式的构建/解密、原始密钥字面量及明文缺失、直接 URL 403、加密资源 200 和模型变更加密。临时 fixture 在受控系统临时目录清理，不修改输入模型。实现依据：[Vite 插件接口](https://vite.dev/guide/api-plugin)、[public 原样复制行为](https://vite.dev/config/shared-options#publicdir)。
