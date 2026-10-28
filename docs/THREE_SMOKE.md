# Three.js 真实场景验收（首期）

向已有官方 Vue/React TS/JS 应用新增 Three.js 最小旋转立方体，使用 AdScreen 的原生引擎层，保留正式首页、main 和 Vite 配置。先按 [SCREEN](SCREEN.md) 生成大屏预设，再单独运行：

```powershell
# 在仓库上级目录：已有官方 Monorepo 的 Vue TS 成员
node ./viteplus-starter/packages/create/bin/cli.mjs --workspace ./adui-batch-demo --name admin --type application --framework vue --three-smoke

# 独立 React JS 项目（需先已有 --screen）
node ./viteplus-starter/packages/create/bin/cli.mjs --name starter-react-js --type application --framework react --language js --three-smoke
```

进入应用运行 `vp check`、`vp run build`、`vp dev`，打开实际端口的 `/three-smoke.html`。本命令只处理已有 Application，不能与 dry-run、screen、engine、UI/CSS 补装、其他验收或修复标记混用；Monorepo 根不支持。新建/批量应用也可通过 engine 选项直接接入，见下节；--three-smoke 保留为已有应用的独立工具。

## 文件与依赖

- 新增 `src/adui-three/`（框架无关运行时、入口与声明）、`src/three-smoke/`（所选框架/语言的组件、入口、样式）和 `three-smoke.html`。
- Three.js 固定为 0.186.1，开发类型固定为 @types/three 0.186.0，通过应用内 `vp add --save-exact` 安装；JS 项目也提供类型支持。缺失时新增，已有其他声明版本直接拒绝，不自动升级。包管理器可能更新工作区 catalog/锁文件，不将依赖加入根 package.json。
- 安装前校验框架、语言、已有大屏文件及全部输出路径；任一文件已存在、父路径是链接/junction 或非目录时拒绝。安装后复查目标与父目录，再用 wx 写入。失败保留依赖安装或部分现场，不承诺事务回滚，也不覆盖原文件。
- `packages/three` 为 private 内部源码包，未发布 npm。生成器复制源码快照；已有大屏目录不自动迁移，需保持约定接口。

## 运行时契约

`createThreeScene(host, {pixelRatio?, onStatus?, onError?})` 返回 canvas、status、setPixelRatio、destroy；组件在挂载后调用，在卸载时 destroy。host 要有实际尺寸，并位于原生引擎层。组件封装负责框架生命周期，运行时不依赖 Vue/React。

运行时创建独占 WebGLRenderer、透视相机、BoxGeometry、线框材质和 Raycaster。ResizeObserver/resize 触发尺寸更新；动画循环也检查 DPR，变化时更新相机宽高比、渲染器比例和 drawing buffer。默认使用当前设备 DPR，上限 2，单边上限取 8192 与 renderer.maxTextureSize 的较小值；隐藏/零尺寸时停止绘制，恢复后重算。DPR 下拉框可显式切换 1/2 或自动；OS 跨屏 DPR 变化路径由受控测试覆盖，本轮未移动实体显示器验收。

拾取使用 canvas.getBoundingClientRect 将 client 坐标转换到 NDC，不用设计稿坐标替代引擎坐标。点击中心命中后立方体变为橙色；HUD 按钮另行展示设计坐标换算，两套坐标各自作用于对应层。

destroy 幂等：取消 setAnimationLoop、断开观察器、移除窗口/canvas 监听，释放本实例独占的 geometry、material、renderer，主动丢弃其 WebGL context，并移除 canvas。初始化失败释放已分配资源；意外 contextlost 停止循环并通知 UI，需卸载/重挂恢复。本例不接管外部共享 renderer、材质或纹理，其他引擎未实现；模型加载与 .adui 加解密扩展见文末。

## 验收与边界

1. 页面显示持续旋转的线框立方体；点击 canvas 中央，selected=true、picks 增加且颜色改变。
2. 切换容器和四种缩放模式；引擎层 transform=none，相机保持对应视口比例。DPR 1/2 时 canvas 缓冲宽高与应用测量尺寸对应，布局可能存在小数 CSS 像素取整。
3. 卸载后显示 disposed=true 且 canvas 数量为 0；重挂为单个新 canvas，拾取计数从 0 开始。测试验证清理调用，不宣称测得 GPU 驱动堆内存完全回收。
4. 将 Chrome 标签切到前台再点击进入全屏；`:fullscreen` 应为 ad-screen，浮层保留，canvas 随视口改变，退出恢复。后台标签请求可被拒绝为 not granted，这与 API 缺失是不同情况；不修改浏览器安全设置。

默认正式构建只打包原首页，不能据此声称 Three 页面构建成功。本轮另用临时 mergeConfig 的 build.rolldownOptions.input=three-smoke.html 完成 Vue/React 专项构建，随后移走产物并移除临时配置，未改正式 Vite 配置。输出约 598/755 kB（压缩前），出现默认 500 kB 分块提醒；未通过调高阈值隐藏。正式集成阶段需要单独设计按需加载和分块。

实现依据：[Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer)、[Raycaster](https://threejs.org/docs/pages/Raycaster.html)。本地执行记录见 [PROJECT_CONTEXT](PROJECT_CONTEXT.md)。

## 创建选项与批量配置

从仓库上级目录运行：

```powershell
# 新建官方 React TS 应用，同时添加大屏和 Three（默认首页保持官方内容）
node ./viteplus-starter/packages/create/bin/cli.mjs --name my-three-app --type application --framework react --screen --engine three

# 已有 --screen 项目首次补装，不再传 --screen，避免覆盖已有大屏
node ./viteplus-starter/packages/create/bin/cli.mjs --name my-screen-app --type application --framework vue --engine three --apply-existing

# 三个正式生成阶段：官方根、Vue TS、React JS
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/three.batch.json --dry-run
node ./viteplus-starter/packages/create/bin/cli.mjs --config ./viteplus-starter/examples/three.batch.json
```

--engine 只接受 none/three，省略等同 none，不引入 Three 依赖。新建 Three 应用必须同时显式 --screen，批量应用必须同时配置 screen=true 或尺寸/模式对象；根不能统一指定引擎。批量 JSON 应用增加 "engine":"three"，可与 uiSmoke 同用，UI 验收独立调用时去除 screen/engine 参数。CLI dry-run 展示引擎依赖、文件和页面，但不安装或写文件。交互菜单尚未增加引擎问题，通过显式参数或 JSON 选择。

组合补装在 UI 安装、大屏写入前检查 Three 输出占用、语言、已有依赖版本，不能借 --engine 升级或覆盖已生成的 Three 目录。已有旧版 --three-smoke 不会自动改成按需版；需人工对比源码快照或另建样例验证。生成源码及验收页属于集成结果，业务页面仍需自行导入使用，不替换 App/main/首页或正式 Vite 配置。

## 点击后加载与分块

新版页面初始显示“加载 3D 场景”，此时没有 canvas。点击后由 createLazyScene 的 start() 动态导入 index.mjs，创建 WebGL；失败显示错误、按钮可重试。重复点击复用同一导入请求。卸载后移除 canvas，重新挂载需再次点击；模块可由浏览器缓存复用，但场景实例重新创建。

createLazyScene 位于 src/adui-three/lazy.mjs（包内也导出 @adui/three/lazy），不静态导入 Three。接口为 start():Promise<void>、setPixelRatio(value?)、destroy()；options 沿用 ThreeOptions，另有 onState({loading,ready})。DPR 可在加载期间更新。动态 import 本身不能取消网络下载，destroy 会阻止晚到的模块创建 WebGL、抑制卸载后的回调；初始化回调同步触发卸载也释放刚创建的实例。

采用原生动态导入边界，由 Vite 自动分块，不写入全局 manual chunk 配置或修改用户 Vite 文件，依据 [Vite 动态导入与分块](https://vite.dev/guide/features)。专项双入口构建（原首页 + Three HTML）产物：Vue/React 验收入口约 10.26/10.74 kB，共享框架约 64.40/219.44 kB，引擎独立分块约 525.76 kB（gzip 131.15 kB），两框架引擎文件哈希一致。入口体积不含共享框架，不能称为完整首屏大小。

manifest 标记引擎 isDynamicEntry，首页没有对它的 import；生产浏览器网络捕获证明验收页点击前不请求 adui-three 分块，点击后才请求。引擎仍超过默认 500 kB，保留提醒；此轮优化加载时机与复用边界，不声称消除全部包体问题。无需下载远端模型或生产密钥。

## GLB 本地加载

新版 Three 页面加载场景后提供“选择 GLB 模型”和“清除模型”。选择本机 .glb 后使用 File.arrayBuffer 在浏览器中解析，不通过应用 HTTP 上传模型，不将文件复制进生成器仓库。输入框读完后清空以便再次选择同一文件；当前加载状态见 model/modelError/modelMeshes。已有源码快照不自动升级。

ThreeHandle 与 LazySceneHandle 新增 loadModel(buffer:ArrayBuffer):Promise<boolean>、clearModel()。GLTFLoader 在首次加载模型时动态导入；只有 ready 才替换当前模型。新请求覆盖旧请求，晚到解析结果立即释放；加载失败保留上一个可见模型。清除恢复立方体，卸载释放模型与查看器独占资源。

首期支持 20 字节至 32 MiB、glTF 2.0、自包含 GLB。选择文件时先检查 file.size，解析前校验文件头、声明长度、首 JSON 块与分块边界；拒绝外部 buffer/image URI 和未配置的 Draco/KTX2/Meshopt 解码需求。此检查不等同加密认证，也未实现远端 URL、授权或 AES-GCM。动画数据可以解析，但本例不播放动画。

模型按包围盒居中并归一化，再以带边距的包围球按相机比例适配，避免头盔上下被裁切。程序化 RoomEnvironment/PMREM 与灯光支持 PBR 内嵌贴图，不下载外部 HDR。环境贴图由查看器复用，清除模型时保留，卸载时释放。

模型清理遍历所有返回场景，按引用去重释放 geometry、material、texture、skeleton，并关闭已返回纹理的 ImageBitmap。只管理本实例独占资源，不接管跨实例共享缓存；解析失败未返回的加载器内部对象不宣称已经逐一追踪，GPU 驱动实际堆内存也未做测量。官方 API 依据见 [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader)。

实机使用用户提供的 C:/Users/ADui/Downloads/DamagedHelmet.glb（3,773,916 字节，一个 mesh、五张内嵌 JPEG）；原文件 SHA-256 为 a1e3b04de97b11de564ce6e53b95f02954a297f0008183ac63a4f5974f6b32d8，前后相同。模型文件未纳入 Git；仓库只提交加载能力、测试与说明。

## .adui 加密模型

新增 AES-256-GCM .adui 封装、loadEncryptedModel 授权回调与本地验收密钥入口。明文 GLB 仍可用；选择 .adui 前先导入匹配的本地验收密钥，清除授权会同时清除模型。正式业务替换 provider，不将密钥写入前端。格式、CLI、授权契约与限制见 [MODEL_SECURITY](MODEL_SECURITY.md)。旧快照不自动覆盖升级。
