import { lstat, mkdir, writeFile, readFile } from "node:fs/promises";
import { injectStarterPlugins } from "./vite-config.mjs";
import { dirname, join, resolve } from "node:path";
import { validateProjectOptions } from "./options.mjs";
import { modelSmoke } from "../../model-security/src/smoke.mjs";
import { setupModelPlugin } from "../../model-security/src/setup.mjs";
import { generateProjectKey } from "../../model-security/src/project-key.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
export function planModelProtection(input) {
  const options = validateProjectOptions(input);
  if (!options.modelProtection || options.modelProtection === "none") return null;
  return {
    mode: options.modelProtection,
    files: [
      ...Object.keys(
        modelSmoke(options.framework, options.language ?? "ts", options.modelProtection),
      ),
      ...["vite.mjs", "vite.d.mts", "adui.mjs", "model.mjs", "keygen.mjs"].map(
        (name) => "adui-model-build/" + name,
      ),
      "src/adui-models.d.ts",
      ".env.local",
      "package.json.before-adui-models",
      ".gitignore.before-adui-models",
      "MODEL_GUIDE.md",
    ],
    directory: "src/models",
    modifies: ["Vite 配置（原件备份）", "package.json（原件备份）", ".gitignore（已有时备份）"],
    scripts: ["models:keygen", "models:keyrotate"],
    secret: { file: ".env.local", generatedAtExecution: true },
    previewPath: "/model-smoke.html",
  };
}
async function inspect(path) {
  for (let current = path; ; current = dirname(current)) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error("模型保护拒绝链接或 junction 路径");
      if (current !== path && !stat.isDirectory()) throw new Error("模型保护父目录被文件占用");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(current) === current) break;
  }
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function preflightModelProtection(directory, input) {
  directory = resolve(directory);
  const plan = planModelProtection(input);
  if (!plan) return;
  for (const path of ["", "adui-model-build", "src/model-smoke", "src/models"]) {
    const stat = await inspect(join(directory, path));
    if (stat && !stat.isDirectory()) throw new Error("模型保护目录被占用：" + path);
  }
  for (const path of [
    ...plan.files,
    ...["ts", "js", "mts", "mjs"].map((ext) => "vite.config." + ext + ".before-adui-models"),
  ])
    if (await inspect(join(directory, path)))
      throw new Error("模型保护文件已存在，拒绝覆盖：" + path);
  const manifestPath = join(directory, "package.json");
  if (await inspect(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (
      manifest.scripts !== undefined &&
      (!manifest.scripts || typeof manifest.scripts !== "object" || Array.isArray(manifest.scripts))
    )
      throw new Error("package.json scripts 必须是对象");
    if (
      ["models:keygen", "models:keyrotate"].some((name) =>
        Object.hasOwn(manifest.scripts ?? {}, name),
      )
    )
      throw new Error("已有模型脚本，拒绝覆盖");
    const configs = [];
    for (const ext of ["ts", "js", "mts", "mjs"])
      if (await inspect(join(directory, "vite.config." + ext))) configs.push("vite.config." + ext);
    if (configs.length !== 1) throw new Error("无法唯一识别 Vite 配置");
    injectStarterPlugins(await readFile(join(directory, configs[0]), "utf8"), {
      imports: [],
      plugins: ["aduiModels()"],
    });
  }
}
export async function addModelProtection(directory, input, runner = runWorkspaceVp) {
  directory = resolve(directory);
  const options = validateProjectOptions(input),
    plan = planModelProtection(options);
  if (!plan) return;
  await preflightModelProtection(directory, options);
  const result = await setupModelPlugin(directory, options.modelProtection);
  await inspect(join(directory, "src/models"));
  await mkdir(join(directory, "src/models"), { recursive: true });
  await generateProjectKey(directory, { keyId: options.name + "-v1" });
  await writeFile(
    join(directory, "MODEL_GUIDE.md"),
    "# 模型使用\n\n将自包含 GLB 放入 src/models，运行 vp dev 后打开 /model-smoke.html。\n\n当前模式：" +
      options.modelProtection +
      "。密钥保存在被 Git 忽略的 .env.local，原 GLB 不进入构建产物。\n\n- vp run models:keygen：缺失时生成项目 KEY；已有 KEY 时拒绝覆盖。\n- vp run models:keyrotate：备份后轮换 KEY，保留其他 env 配置；随后重新构建全部模型。\n- IV 每个模型独立随机生成，保存在 .adui 文件头，不配置固定 IV。\n- 可在 .env.local 配置 ADUI_MODEL_ALLOWED_HOSTS（逗号分隔 hostname）限制生产域名。\n- embedded 自动加载与拆分密钥只能提高复用门槛；external 模式需独立解锁文件。\n\n官方首页保持不变。独立验收页生产构建时需将 model-smoke.html 加入 HTML 输入；插件在普通构建中仍输出全部 .adui。\n",
    { flag: "wx" },
  );
  runner(directory, [
    "fmt",
    "adui-model-build",
    "src/model-smoke",
    "src/adui-models.d.ts",
    "model-smoke.html",
    result.config,
    "package.json",
    "MODEL_GUIDE.md",
    ...result.files.filter((path) => path === "jsconfig.json"),
    "--write",
  ]);
  return plan;
}
