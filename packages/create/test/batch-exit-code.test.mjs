import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createBatchPlan, executeBatch } from "../src/batch.mjs";

const config = {
  version: 1,
  name: "batch-exit-review",
  apps: [
    { name: "web", framework: "vue" },
    { name: "portal", framework: "react" },
  ],
};
async function temporary(t) {
  const root = await mkdtemp(join(tmpdir(), "starter-batch-exit-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("starter-batch-exit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("批量错误保留有效失败退出码和原因，不传播无效退出码", async (t) => {
  const cwd = await temporary(t);
  for (const code of [7, undefined, 0, -1, 1.5, "9"]) {
    const plan = await createBatchPlan(config, cwd);
    const cause = Object.assign(new Error("controlled failure"), { exitCode: code });
    let calls = 0;
    await assert.rejects(
      executeBatch(
        plan,
        () => {
          calls++;
          throw cause;
        },
        () => {},
      ),
      (error) => {
        assert.equal(error.cause, cause);
        assert.equal(error.exitCode, code === 7 ? 7 : undefined);
        assert.deepEqual(error.completed, []);
        assert.deepEqual(error.pending, ["应用 web", "应用 portal"]);
        return true;
      },
    );
    assert.equal(calls, 1);
  }
});

test(
  "Windows 真实批量 CLI 保留根与应用子进程退出码，失败即停并保留现场",
  { skip: process.platform !== "win32" },
  async (t) => {
    const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
    for (const mode of ["root", "application"]) {
      const cwd = await temporary(t);
      const shim = join(cwd, "shims");
      await mkdir(shim);
      const fake = join(shim, "fake-vp.mjs");
      const log = join(cwd, "calls.txt");
      await writeFile(
        fake,
        `
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
const args=process.argv.slice(2),kind=args[1];
appendFileSync(${JSON.stringify(log)},kind+"\\n");
const target=resolve(args[args.indexOf("--directory")+1]);
mkdirSync(target,{recursive:true});
writeFileSync(join(target,"partial.txt"),"keep partial");
if(kind==="vite:monorepo") {
  if(${JSON.stringify(mode)}==="root") process.exit(7);
  mkdirSync(join(target,"apps"));
  writeFileSync(join(target,"package.json"),JSON.stringify({name:"batch-exit-review",private:true,devDependencies:{"vite-plus":"1.4.0"}}));
  writeFileSync(join(target,"pnpm-workspace.yaml"),"packages:\\n  - apps/*\\n  - packages/*\\n");
  writeFileSync(join(target,"vite.config.ts"),"export default defineConfig({fmt:{}})\\n");
} else process.exit(9);
`,
      );
      await writeFile(join(shim, "vp.cmd"), `@echo off\r\n"${process.execPath}" "${fake}" %*\r\n`);
      const filename = join(cwd, "batch.json");
      await writeFile(filename, JSON.stringify(config));
      const before = await readFile(filename);
      const env = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
        ),
        PATH: shim,
      };
      const result = spawnSync(process.execPath, [cli, "--config", filename], {
        cwd,
        env,
        encoding: "utf8",
        timeout: 10000,
      });
      assert.equal(result.status, mode === "root" ? 7 : 9, result.stderr);
      assert.match(result.stderr, /批量生成失败/);
      assert.match(result.stderr, /不会自动删除、覆盖或回滚/);
      assert.equal(
        await readFile(log, "utf8"),
        mode === "root" ? "vite:monorepo\n" : "vite:monorepo\nvite:application\n",
      );
      assert.equal(
        await readFile(
          join(cwd, config.name, ...(mode === "root" ? [] : ["apps", "web"]), "partial.txt"),
          "utf8",
        ),
        "keep partial",
      );
      assert.deepEqual(await readFile(filename), before);
    }
  },
);
