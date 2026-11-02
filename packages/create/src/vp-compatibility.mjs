import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inspectPath } from "./safe-paths.mjs";

export async function preflightVpManifestEncoding(directory) {
  const path = join(directory, "package.json");
  if (!(await inspectPath(path, "Vite+ 编码预检"))?.isFile()) return;
  const source = await readFile(path);
  if (source[0] === 239 && source[1] === 187 && source[2] === 191) {
    throw new Error(
      "Vite+ 安装/完整构建不兼容带 UTF-8 BOM 的应用清单：" +
        path +
        "；请人工保存为 UTF-8 无 BOM 后重试，生成器不会自动改写该文件。",
    );
  }
}
