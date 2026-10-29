import { lstat, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { injectStarterPlugins } from "../../create/src/vite-config.mjs";
import { modelSmoke } from "./smoke.mjs";
export async function setupModelPlugin(project, keyMode = "embedded", engine = "three") {
  if (!["three", "babylon", "cesium"].includes(engine)) throw new Error("不支持的模型引擎");
  if (!["external", "embedded"].includes(keyMode))
    throw new Error("keyMode 仅支持 external 或 embedded");
  const root = resolve(project);
  async function inspect(path) {
    let current = resolve(path);
    while (true) {
      try {
        if ((await lstat(current)).isSymbolicLink()) throw new Error("拒绝链接或 junction 路径");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
    try {
      return await lstat(path);
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  await inspect(root);
  await inspect(join(root, "package.json"));
  const manifestSource = await readFile(join(root, "package.json"), "utf8");
  const manifest = JSON.parse(manifestSource),
    deps = { ...manifest.dependencies, ...manifest.devDependencies };
  if (
    manifest.scripts !== undefined &&
    (!manifest.scripts || typeof manifest.scripts !== "object" || Array.isArray(manifest.scripts))
  )
    throw new Error("package.json scripts 必须是对象");
  if (!deps["vite-plus"] || (!deps.vue && !deps.react))
    throw new Error("仅支持已有官方 Vue/React Vite+ Application");
  const framework = deps.vue ? "vue" : "react";
  const language = (await inspect(join(root, "src", framework === "vue" ? "main.ts" : "main.tsx")))
    ? "ts"
    : "js";
  if (
    !(await readFile(join(root, "src/adui-" + engine + "/lazy.mjs"), "utf8")).includes(
      "loadBundledModel",
    )
  )
    throw new Error("需要当前版本 --engine " + engine + " 生成的应用，旧快照不自动覆盖升级");
  const configs = [];
  for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"])
    if ((await inspect(join(root, name)))?.isFile()) configs.push(name);
  if (configs.length !== 1) throw new Error("无法唯一识别 Vite 配置");
  const configPath = join(root, configs[0]),
    original = await readFile(configPath, "utf8");
  if (original.includes("aduiModels") || original.includes("adui-model-build"))
    throw new Error("模型插件已配置，拒绝重复安装");
  const updated = injectStarterPlugins(original, {
    imports: ["import { aduiModels } from './adui-model-build/vite.mjs'"],
    plugins: ["aduiModels({keyMode:" + JSON.stringify(keyMode) + "})"],
  });
  const files = modelSmoke(framework, language, keyMode, engine);
  const scripts = {
    "models:keygen": "node adui-model-build/keygen.mjs",
    "models:keyrotate": "node adui-model-build/keygen.mjs --rotate",
  };
  for (const name of Object.keys(scripts))
    if (Object.hasOwn(manifest.scripts ?? {}, name))
      throw new Error("package.json 已有模型脚本，拒绝覆盖：" + name);
  files["package.json.before-adui-models"] = manifestSource;
  files["adui-model-build/keygen.mjs"] = await readFile(
    new URL("project-key.mjs", import.meta.url),
    "utf8",
  );
  const ignorePath = join(root, ".gitignore"),
    ignoreExists = await inspect(ignorePath);
  const ignore = ignoreExists ? await readFile(ignorePath, "utf8") : null;
  const ignoreRules = "\n# ADui model secrets\n.env.local*\n*.key.json\n";
  if (ignore !== null) files[".gitignore.before-adui-models"] = ignore;
  else files[".gitignore"] = ignoreRules.trimStart();
  if (
    language === "js" &&
    !(await inspect(join(root, "tsconfig.json"))) &&
    !(await inspect(join(root, "jsconfig.json")))
  )
    files["jsconfig.json"] =
      JSON.stringify(
        {
          compilerOptions: {
            allowJs: true,
            noEmit: true,
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "bundler",
            jsx: "react-jsx",
            types: ["vite/client"],
          },
          include: ["src/**/*", configs[0]],
        },
        null,
        2,
      ) + "\n";
  for (const name of ["vite.mjs", "vite.d.mts", "adui.mjs"])
    files["adui-model-build/" + name] = (
      await readFile(new URL(name, import.meta.url), "utf8")
    ).replace("../../three/src/model.mjs", "./model.mjs");
  files["adui-model-build/model.mjs"] = (
    await readFile(new URL("../../three/src/model.mjs", import.meta.url), "utf8")
  ).replace("../../model-security/src/glb.mjs", "./glb.mjs");
  files["adui-model-build/glb.mjs"] = await readFile(new URL("./glb.mjs", import.meta.url), "utf8");
  files["src/adui-models.d.ts"] = await readFile(
    new URL("virtual-models.d.ts", import.meta.url),
    "utf8",
  );
  files[configs[0] + ".before-adui-models"] = original;
  for (const path of Object.keys(files))
    if (await inspect(join(root, path))) throw new Error("文件已存在，拒绝覆盖：" + path);
  if ((await readFile(configPath, "utf8")) !== original) throw new Error("Vite 配置在预检期间变化");
  for (const [path, source] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await inspect(target);
    await writeFile(target, source, { flag: "wx" });
  }
  await inspect(configPath);
  if ((await readFile(configPath, "utf8")) !== original)
    throw new Error("Vite 配置在写入前变化，已保留备份");
  if ((await readFile(join(root, "package.json"), "utf8")) !== manifestSource)
    throw new Error("package.json 在预检后变化");
  await inspect(join(root, "package.json"));
  if (ignore !== null && (await readFile(ignorePath, "utf8")) !== ignore)
    throw new Error("Git 忽略配置在预检后变化");
  if (ignore !== null) await writeFile(ignorePath, ignore + ignoreRules);
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ ...manifest, scripts: { ...manifest.scripts, ...scripts } }, null, 2) + "\n",
  );
  await writeFile(configPath, updated);
  return { root, keyMode, files: Object.keys(files), config: configs[0] };
}
