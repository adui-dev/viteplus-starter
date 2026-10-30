#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = dirname(dirname(fileURLToPath(import.meta.url)));
// Generate beside the downloaded tool repository, outside its own pnpm workspace.
const result = spawnSync(
  process.execPath,
  [join(repository, "packages/create/bin/cli.mjs"), ...process.argv.slice(2)],
  { cwd: dirname(repository), stdio: "inherit" },
);
if (result.error) console.error("生成器启动失败：" + result.error.message);
process.exitCode = result.status ?? 1;
