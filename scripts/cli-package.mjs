import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPath } from "../packages/create/src/safe-paths.mjs";

const repository = fileURLToPath(new URL("../", import.meta.url));
const runtimeTrees = [
  "create/src",
  "screen/src",
  "three/src",
  "cesium/src",
  "babylon/src",
  "model-security/src",
];

// Keep sibling paths intact: preset generators read and import these source assets.
export async function stageCliPackage(directory) {
  await inspectPath(directory, "CLI 打包目标");
  await mkdir(directory);
  async function readSource(relative) {
    const source = join(repository, relative);
    if (!(await inspectPath(source, "CLI 打包源"))?.isFile())
      throw new Error("CLI 打包缺少普通源文件：" + source);
    return readFile(source);
  }
  async function copy(relative) {
    const contents = await readSource(relative);
    const target = join(directory, relative);
    await inspectPath(target, "CLI 打包目标");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, { flag: "wx" });
  }
  async function copyTree(relative) {
    const source = join(repository, relative);
    if (!(await inspectPath(source, "CLI 打包源"))?.isDirectory())
      throw new Error("CLI 打包缺少源码目录：" + source);
    for (const entry of (await readdir(source, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = join(relative, entry.name);
      if (entry.name.startsWith(".") || entry.isSymbolicLink())
        throw new Error("CLI 打包拒绝隐藏文件或链接：" + path);
      if (entry.isDirectory()) await copyTree(path);
      else if (/\.(?:mjs|css|d\.mts|d\.ts)$/.test(entry.name) && !entry.name.endsWith(".test.mjs"))
        await copy(path);
      else throw new Error("CLI 打包遇到未知源码文件：" + path);
    }
  }
  for (const tree of runtimeTrees) await copyTree(join("packages", tree));
  await copy("packages/create/bin/cli.mjs");
  for (const name of [
    "normalize.css",
    "normalize.LICENSE.txt",
    "normalize.SOURCE.md",
    "adui-studio-logo.svg",
  ])
    await copy("packages/create/assets/" + name);
  const sourceManifest = JSON.parse(
    (await readSource("packages/create/package.json")).toString("utf8"),
  );
  if (typeof sourceManifest.private !== "boolean")
    throw new Error("CLI 清单必须显式声明 private 状态");
  const manifest = {
    name: sourceManifest.name,
    version: sourceManifest.version,
    private: sourceManifest.private,
    publishConfig: sourceManifest.publishConfig,
    description: sourceManifest.description,
    keywords: sourceManifest.keywords,
    license: sourceManifest.license,
    repository: sourceManifest.repository,
    homepage: sourceManifest.homepage,
    bugs: sourceManifest.bugs,
    type: "module",
    bin: { "viteplus-starter": "packages/create/bin/cli.mjs" },
    files: ["packages/"],
    engines: sourceManifest.engines,
    dependencies: sourceManifest.dependencies,
  };
  await writeFile(join(directory, "package.json"), JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
  });
  await writeFile(join(directory, "README.md"), await readSource("packages/create/README.md"), {
    flag: "wx",
  });
  await writeFile(join(directory, "LICENSE"), await readSource("LICENSE"), { flag: "wx" });
  return manifest;
}
