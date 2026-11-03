import { readFile, writeFile, mkdir, unlink, rmdir, readdir } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import { planScreenPreset } from "./screen.mjs";
import { planEngine } from "./engine.mjs";
import { planModelProtection } from "./model-protection.mjs";
import { homeFiles } from "./application-home.mjs";
import {
  applicationPath,
  applicationFiles,
  isSmokeFile,
  rewritePluginPaths,
} from "./plugin-paths.mjs";
import { inspectPath } from "./safe-paths.mjs";
import { runWorkspaceVp } from "./workspace.mjs";
import { brandHtml, logoPath, logoSource } from "./branding.mjs";

export function applicationEntry(options) {
  const ts = (options.language ?? "ts") === "ts",
    vue = options.framework === "vue";
  return {
    main: `src/main.${vue ? (ts ? "ts" : "js") : ts ? "tsx" : "jsx"}`,
    app: vue ? "src/App.vue" : `src/App.${ts ? "tsx" : "jsx"}`,
  };
}

export async function captureApplication(directory, options) {
  if (options.type !== "application") return null;
  const { app } = applicationEntry(options);
  if (!(await inspectPath(join(directory, app)))?.isFile())
    throw new Error("官方应用缺少首页：" + app);
  if (!(await inspectPath(join(directory, "index.html")))?.isFile())
    throw new Error("官方应用缺少 HTML 入口");
  if (await inspectPath(join(directory, logoPath))) throw new Error("Logo 目标已存在，拒绝覆盖");
  const html = await readFile(join(directory, "index.html"), "utf8");
  brandHtml(html, "/" + logoPath);
  return { app, source: await readFile(join(directory, app), "utf8"), html };
}

export async function planApplicationOutput(options) {
  const files = await stagingFiles(options);
  return {
    files: [
      ...new Set([
        "index.html",
        logoPath,
        ...applicationFiles(files, options.smokePages),
        ...Object.keys(homeFiles(options)),
      ]),
    ],
    entry: "/",
    smokePages: Boolean(options.smokePages),
  };
}

export async function stagingFiles(options) {
  const screen = options.screen ? Object.keys((await planScreenPreset(options)).files) : [];
  const engine = await planEngine(options),
    protection = planModelProtection(options);
  return [...new Set([...screen, ...(engine?.files ?? []), ...(protection?.files ?? [])])];
}

// Only called after all installers succeed in a newly created official application.
// Existing-project commands deliberately never replace their main/App.
export async function finalizeApplication(
  directory,
  options,
  snapshot,
  formatter = runWorkspaceVp,
) {
  const home = homeFiles(options);
  if (!Object.keys(home).length) return;
  const stagedFiles = await stagingFiles(options),
    { app, main } = applicationEntry(options);
  if (!snapshot || snapshot.app !== app) throw new Error("缺少新建应用首页快照，拒绝接入");
  const read = async (path) => {
    if (!(await inspectPath(join(directory, path)))?.isFile())
      throw new Error("新建应用文件缺失：" + path);
    return readFile(join(directory, path), "utf8");
  };
  const originals = new Map(),
    writes = new Map(),
    removals = new Set();
  async function remember(path) {
    if (!originals.has(path)) originals.set(path, await read(path));
    return originals.get(path);
  }
  if ((await remember(app)) !== snapshot.source)
    throw new Error("首页在创建期间已变更，拒绝替换：" + app);
  if ((await remember("index.html")) !== snapshot.html)
    throw new Error("HTML 入口在创建期间已变更，拒绝替换");
  writes.set("index.html", brandHtml(snapshot.html, "/" + logoPath));
  writes.set(logoPath, logoSource);
  for (const path of stagedFiles) {
    // Never read project credentials, and tolerate the optional original .gitignore backup.
    if (path === ".env.local") continue;
    if (!(await inspectPath(join(directory, path)))) {
      if (path === ".gitignore.before-adui-models") continue;
      throw new Error("预设文件缺失：" + path);
    }
    const source = await remember(path),
      target = applicationPath(path);
    if (path.includes(".before-adui-") || (!options.smokePages && isSmokeFile(path)))
      removals.add(path);
    else if (target !== path || isSmokeFile(path)) {
      const content = rewritePluginPaths(source);
      writes.set(target, target.endsWith(".html") ? brandHtml(content, "/" + logoPath) : content);
    }
    if (target !== path) removals.add(path);
  }
  for (const ext of ["ts", "js", "mts", "mjs"]) {
    const config = "vite.config." + ext;
    if (await inspectPath(join(directory, config))) {
      const source = await remember(config),
        updated = rewritePluginPaths(source);
      if (source !== updated) writes.set(config, updated);
      for (const suffix of ["models", "cesium"]) {
        const backup = config + ".before-adui-" + suffix;
        if (await inspectPath(join(directory, backup))) {
          await remember(backup);
          removals.add(backup);
        }
      }
    }
  }
  if (protectionEnabled(options)) {
    const manifest = await remember("package.json");
    writes.set("package.json", rewritePluginPaths(manifest));
    const guide = await remember("MODEL_GUIDE.md");
    writes.set(
      "MODEL_GUIDE.md",
      guide
        .replace("运行 vp dev 后打开 /model-smoke.html", "运行 vp dev 后打开首页并点击加载场景")
        .replace(
          /官方首页保持不变。[^\n]+/,
          "运行时插件位于 src/plugins，构建插件位于 build/plugins。默认从首页使用；--smoke-pages 可额外保留独立验收页。",
        ),
    );
  }
  let entry = await remember(main);
  const ext = (options.language ?? "ts") === "ts" ? "ts" : "js";
  if (options.framework === "vue" && home[`src/plugins/index.${ext}`]) {
    const mount = /createApp\(App\)\.mount\((['"])#app\1\)/g;
    if ([...entry.matchAll(mount)].length !== 1) throw new Error("无法唯一识别官方 Vue 挂载入口");
    entry =
      entry.replace(mount, "createApp(App).use(plugins).mount('#app')") +
      `\nimport plugins from './plugins/index.${ext}'\n`;
  } else if (home[`src/plugins/index.${ext}`]) entry += `\nimport './plugins/index.${ext}'\n`;
  // Replace only the official starter stylesheet import; retain UI/CSS/normalize imports.
  entry = entry.replace(/^import\s+['"]\.\/(?:style|index)\.css['"];?\s*$/gm, "");
  entry += "\nimport './styles/application.css'\n";
  writes.set(main, entry);
  for (const [path, source] of Object.entries(home))
    writes.set(path, source.replace("import './styles/application.css'\n", ""));
  // Validate the entire destination set and every snapshot before the first mutation.
  for (const path of writes.keys()) {
    if (!originals.has(path) && (await inspectPath(join(directory, path))))
      throw new Error("插件接入目标已存在：" + path);
    await inspectPath(join(directory, path));
  }
  for (const [path, source] of originals)
    if ((await read(path)) !== source) throw new Error("插件接入前文件已变更：" + path);
  // Reject unexpected files in owned staging directories; never recursively delete.
  const owned = new Set(
    [...removals]
      .filter((path) => path.includes("/"))
      .map((path) => dirname(path))
      .filter((folder) => folder !== "src" && folder !== "."),
  );
  for (const folder of owned)
    for (const name of await readdir(join(directory, folder))) {
      const path = relative(directory, join(directory, folder, name)).replaceAll("\\", "/");
      if (!originals.has(path)) throw new Error("预设暂存目录含未知文件，保留现场：" + path);
    }
  for (const [path, source] of writes) {
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await inspectPath(join(directory, path));
    await writeFile(join(directory, path), source, { flag: originals.has(path) ? "w" : "wx" });
  }
  // A formatting failure preserves original staging files and backups for diagnosis.
  await formatter(directory, ["fmt", ...writes.keys(), "--write"]);
  for (const path of removals) {
    if ((await read(path)) !== originals.get(path))
      throw new Error("清理前预设文件已变更，保留现场：" + path);
    await unlink(join(directory, path));
  }
  for (const folder of [...owned].sort((a, b) => b.length - a.length))
    if (!(await readdir(join(directory, folder))).length) await rmdir(join(directory, folder));
  return { files: [...writes.keys()], entry: "/" };
}

function protectionEnabled(options) {
  return options.modelProtection && options.modelProtection !== "none";
}
