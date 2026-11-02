import { readFile, writeFile, mkdir, readdir, unlink, rmdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateProjectOptions } from "./options.mjs";
import { stagingFiles } from "./application-output.mjs";
import { homeFiles } from "./application-home.mjs";
import { applicationPath, isSmokeFile } from "./plugin-paths.mjs";
import { inspectPath } from "./safe-paths.mjs";
import { runWorkspaceVp } from "./workspace.mjs";

const runtimeNames = ["screen", "three", "cesium", "babylon"];

function selectedDirectories(files) {
  const directories = new Map();
  for (const name of runtimeNames)
    if (files.some((path) => path.startsWith(`src/adui-${name}/`)))
      directories.set(`src/adui-${name}/`, `src/plugins/${name}/`);
  for (const name of ["model", "cesium"])
    if (files.some((path) => path.startsWith(`adui-${name}-build/`)))
      directories.set(
        `adui-${name}-build/`,
        `build/plugins/${name === "model" ? "models" : name}/`,
      );
  return directories;
}

function rewrite(source, directories) {
  for (const [old, current] of directories) {
    source = source.replaceAll(old, current);
    if (old.startsWith("src/"))
      source = source.replaceAll("../" + old.slice(4), "../" + current.slice(4));
  }
  return source;
}

// Preflight before any installer/dependency command. Only this invocation's new
// files are candidates; existing legacy plugins and the business homepage stay put.
export async function preflightExistingOutput(directory, input) {
  const options = validateProjectOptions(input);
  const files = await stagingFiles(options);
  const ui = Object.fromEntries(
    Object.entries(homeFiles(options)).filter(([path]) => path.startsWith("src/plugins/ui/")),
  );
  const targets = [
    ...files.filter((path) => applicationPath(path) !== path).map(applicationPath),
    ...Object.keys(ui),
  ];
  for (const path of targets)
    if (await inspectPath(join(directory, path)))
      throw new Error("补装归档目标已存在，拒绝覆盖：" + path);
  const folders = new Set(
    files
      .filter((path) => applicationPath(path) !== path || (isSmokeFile(path) && path.includes("/")))
      .map(dirname),
  );
  folders.delete("src");
  for (const folder of folders) {
    const info = await inspectPath(join(directory, folder));
    if (info && (!info.isDirectory() || (await readdir(join(directory, folder))).length))
      throw new Error("补装暂存目录已占用，拒绝混入已有文件：" + folder);
  }
  return { options, files, ui, folders };
}

export async function finalizeExistingOutput(directory, plan, formatter = runWorkspaceVp) {
  const { options, files, ui, folders } = plan;
  const moves = selectedDirectories(files),
    references = new Map(moves);
  // A newly installed engine can use either an untouched legacy screen or an
  // already grouped screen. Never rewrite an unrelated legacy build-plugin import.
  for (const name of runtimeNames)
    if (await inspectPath(join(directory, `src/plugins/${name}`)))
      references.set(`src/adui-${name}/`, `src/plugins/${name}/`);
  const originals = new Map(),
    writes = new Map(Object.entries(ui)),
    removals = new Set();
  async function read(path) {
    if (!(await inspectPath(join(directory, path)))?.isFile())
      throw new Error("补装文件缺失：" + path);
    return readFile(join(directory, path), "utf8");
  }
  async function remember(path) {
    if (!originals.has(path)) originals.set(path, await read(path));
    return originals.get(path);
  }
  for (const path of files) {
    // Credentials and original-config backups are never read, rewritten or removed.
    if (path === ".env.local" || path.includes(".before-adui-")) continue;
    const target = applicationPath(path),
      smoke = isSmokeFile(path);
    if (target === path && !smoke && path !== "MODEL_GUIDE.md") continue;
    const source = await remember(path);
    if (smoke && !options.smokePages) {
      removals.add(path);
      continue;
    }
    if (path === "MODEL_GUIDE.md") {
      writes.set(
        path,
        options.smokePages
          ? source
          : source
              .replace(
                "运行 vp dev 后打开 /model-smoke.html",
                "从 src/plugins 中导入引擎适配器，在业务页面按需加载",
              )
              .replace(
                /官方首页保持不变。[^\n]+/,
                "业务首页保持不变；运行时插件位于 src/plugins，构建插件位于 build/plugins。需要独立验收页时，在补装命令中加 --smoke-pages。",
              ),
      );
    } else writes.set(target, rewrite(source, references));
    if (target !== path) removals.add(path);
  }
  const buildMoves = new Map([...moves].filter(([path]) => !path.startsWith("src/")));
  for (const ext of buildMoves.size ? ["ts", "js", "mts", "mjs"] : []) {
    const path = "vite.config." + ext;
    if (await inspectPath(join(directory, path))) {
      const source = await remember(path),
        updated = rewrite(source, buildMoves);
      if (updated !== source) writes.set(path, updated);
    }
  }
  if (moves.has("adui-model-build/")) {
    const source = await remember("package.json");
    writes.set("package.json", rewrite(source, moves));
  }
  for (const path of writes.keys())
    if (!originals.has(path) && (await inspectPath(join(directory, path))))
      throw new Error("补装归档目标在安装期间被占用：" + path);
  for (const [path, source] of originals)
    if ((await read(path)) !== source) throw new Error("补装归档前文件已变更：" + path);
  for (const folder of folders) {
    if (!(await inspectPath(join(directory, folder)))) continue;
    for (const name of await readdir(join(directory, folder))) {
      const path = folder.replaceAll("\\", "/") + "/" + name;
      if (!originals.has(path)) throw new Error("补装暂存目录含未知文件，保留现场：" + path);
    }
  }
  for (const [path, source] of writes) {
    await inspectPath(join(directory, path));
    await mkdir(dirname(join(directory, path)), { recursive: true });
    await writeFile(join(directory, path), source, { flag: originals.has(path) ? "w" : "wx" });
  }
  if (writes.size) await formatter(directory, ["fmt", ...writes.keys(), "--write"]);
  for (const path of removals) {
    if ((await read(path)) !== originals.get(path))
      throw new Error("清理前补装文件已变更，保留现场：" + path);
    await unlink(join(directory, path));
  }
  for (const folder of folders)
    if (
      (await inspectPath(join(directory, folder)))?.isDirectory() &&
      !(await readdir(join(directory, folder))).length
    )
      await rmdir(join(directory, folder));
  return { files: [...writes.keys()], preservesHomepage: true };
}
