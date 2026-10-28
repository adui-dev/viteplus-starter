import { lstat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
// Check every ancestor: lstat(file) alone still follows a junction in its parent path.
export async function inspectPath(path, label = "生成器目标") {
  const target = resolve(path);
  let result = null;
  for (let current = target; ; current = dirname(current)) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink()) throw new Error(label + " 不允许符号链接或 junction：" + current);
      if (current !== target && !stat.isDirectory())
        throw new Error(label + " 父路径不是目录：" + current);
      if (current === target) result = stat;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(current) === current) break;
  }
  return result;
}
