import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, readdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generateProjectKey } from "../src/project-key.mjs";
test("项目脚本生成、拒绝覆盖、备份轮换、保留其他 env 且不回显 KEY", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "project-key-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, ".env.local"),
    '# keep comment\nVITE_API_URL=/api\nADUI_MODEL_ALLOWED_HOSTS=example.test\nVITE_TEXT="line one\nADUI_MODEL_KEY=not-a-setting\nline three"\n',
  );
  const result = await generateProjectKey(root, { keyId: "test-v1" }),
    first = await readFile(result.file, "utf8"),
    one = parseEnv(first);
  assert.equal(Buffer.from(one.ADUI_MODEL_KEY, "base64").length, 32);
  assert.equal(one.VITE_API_URL, "/api");
  assert.equal(one.VITE_TEXT, "line one\nADUI_MODEL_KEY=not-a-setting\nline three");
  assert.equal(one.ADUI_MODEL_ALLOWED_HOSTS, "example.test");
  assert.ok(first.includes("# keep comment"));
  assert.ok(!one.ADUI_MODEL_IV);
  await assert.rejects(generateProjectKey(root), /已存在/);
  assert.equal(await readFile(result.file, "utf8"), first);
  const script = fileURLToPath(new URL("../src/project-key.mjs", import.meta.url));
  const rotated = spawnSync(process.execPath, [script, "--rotate"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(rotated.status, 0, rotated.stderr);
  const second = await readFile(result.file, "utf8"),
    two = parseEnv(second);
  assert.notEqual(one.ADUI_MODEL_KEY, two.ADUI_MODEL_KEY);
  assert.notEqual(one.ADUI_MODEL_KEY_ID, two.ADUI_MODEL_KEY_ID);
  assert.equal(two.VITE_API_URL, "/api");
  assert.equal(two.VITE_TEXT, one.VITE_TEXT);
  assert.ok(!rotated.stdout.includes(one.ADUI_MODEL_KEY));
  assert.ok(!rotated.stdout.includes(two.ADUI_MODEL_KEY));
  const backups = (await readdir(root)).filter((name) => name.includes(".before-"));
  assert.ok(
    (await Promise.all(backups.map((name) => readFile(join(root, name), "utf8")))).includes(first),
  );
  const count = await readdir(root),
    invalid = spawnSync(process.execPath, [script, "--unknown"], { cwd: root, encoding: "utf8" });
  assert.equal(invalid.status, 1);
  assert.deepEqual(await readdir(root), count);
});
test("密钥生成拒绝 env 链接并保留目标原件", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "project-key-link-")),
    outside = await mkdtemp(join(tmpdir(), "project-key-out-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  t.after(() => rm(outside, { recursive: true, force: true }));
  const file = join(outside, "original");
  await writeFile(file, "untouched");
  try {
    await symlink(file, join(root, ".env.local"), "file");
  } catch (error) {
    if (error.code === "EPERM") {
      await symlink(outside, join(root, "linked"), "junction");
      await assert.rejects(generateProjectKey(join(root, "linked")), /链接/);
      assert.equal(await readFile(file, "utf8"), "untouched");
      return;
    }
    throw error;
  }
  await assert.rejects(generateProjectKey(root), /链接/);
  assert.equal(await readFile(file, "utf8"), "untouched");
});
