import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { decryptAdui } from "../src/adui.mjs";
const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const run = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
test("真实 CLI：.adui 往返、保留原件、输出保护和密钥不泄露", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "adui-crypto-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = join(dir, "model.glb"),
    output = join(dir, "model.adui"),
    keyFile = join(dir, "key.json");
  const text = '{"asset":{"version":"2.0"}}';
  const json = Buffer.from(text.padEnd(Math.ceil(text.length / 4) * 4, " "));
  const glb = Buffer.alloc(20 + json.length);
  glb.writeUInt32LE(0x46546c67);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(json.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  glb.set(json, 20);
  await writeFile(input, glb);
  assert.equal(run(["keygen", "--out", keyFile, "--key-id", "test-key"]).status, 0);
  const config = JSON.parse(await readFile(keyFile, "utf8"));
  const args = [
    "encrypt",
    "--input",
    input,
    "--output",
    output,
    "--key-file",
    keyFile,
    "--model-id",
    "helmet",
  ];
  const first = run(args);
  assert.equal(first.status, 0, first.stderr);
  assert.ok(!first.stdout.includes(config.key));
  const saved = await readFile(output);
  const key = await crypto.subtle.importKey(
    "raw",
    Buffer.from(config.key, "base64"),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const plain = await decryptAdui(
    saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.length),
    { authorize: async () => ({ key, expiresAt: Date.now() + 10000 }) },
  );
  assert.deepEqual(Buffer.from(plain), glb);
  assert.deepEqual(await readFile(input), glb);
  assert.equal(run(args).status, 1);
  assert.deepEqual(await readFile(output), saved);
  assert.equal(run(["keygen", "--out", keyFile, "--key-id", "test-key"]).status, 1);
  assert.equal(run(args.map((v) => (v === output ? join(dir, "wrong.glb") : v))).status, 1);
  const linked = join(dir, "linked");
  await symlink(dir, linked, "junction");
  assert.equal(run(args.map((v) => (v === output ? join(linked, "linked.adui") : v))).status, 1);
  await writeFile(keyFile, '{"key":"DO_NOT_ECHO_SECRET');
  const invalid = run(args.map((v) => (v === output ? join(dir, "invalid.adui") : v)));
  assert.equal(invalid.status, 1);
  assert.ok(!invalid.stderr.includes("DO_NOT_ECHO_SECRET"));
});
