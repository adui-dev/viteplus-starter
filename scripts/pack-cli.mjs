import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPath } from "../packages/create/src/safe-paths.mjs";
import { stageCliPackage } from "./cli-package.mjs";

async function pack() {
  const npm = process.env.npm_execpath;
  if (!npm || !isAbsolute(npm) || basename(npm) !== "npm-cli.js")
    throw new Error("请在生成器仓库运行 npm run cli:pack，使用 npm 提供的打包入口");
  // npm may live behind an NVM symlink; this is the invoking tool, not an output path.
  if (!(await stat(npm)).isFile()) throw new Error("npm 入口不可用");
  const parent = fileURLToPath(new URL("../dist/cli/", import.meta.url));
  await inspectPath(parent, "CLI 产物目录");
  await mkdir(parent, { recursive: true });
  const output = await mkdtemp(join(parent, "pack-"));
  const temporary = await mkdtemp(join(tmpdir(), "adui-cli-stage-"));
  if (
    dirname(resolve(temporary)) !== resolve(tmpdir()) ||
    !basename(temporary).startsWith("adui-cli-stage-")
  )
    throw new Error("拒绝清理非本次拥有的暂存目录");
  try {
    const directory = join(temporary, "package");
    const manifest = await stageCliPackage(directory);
    const result = spawnSync(
      process.execPath,
      [npm, "pack", "--json", "--offline", "--ignore-scripts", "--pack-destination", output],
      { cwd: directory, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error("本地 npm pack 失败：" + (result.stderr || result.signal || result.status));
    const [metadata] = JSON.parse(result.stdout);
    if (!metadata?.filename || basename(metadata.filename) !== metadata.filename)
      throw new Error("npm pack 未返回有效产物文件名");
    const tarball = join(output, metadata.filename);
    await readFile(tarball);
    console.log(
      JSON.stringify({
        name: manifest.name,
        version: manifest.version,
        private: manifest.private,
        tarball,
        fileCount: metadata.files.length,
        integrity: metadata.integrity,
      }),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

pack().catch((error) => {
  console.error("CLI 打包失败：" + error.message);
  process.exitCode = 1;
});
