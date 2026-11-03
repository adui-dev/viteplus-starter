import test from "node:test";
import assert from "node:assert/strict";
import { createCliPackReport } from "../../../scripts/cli-pack-report.mjs";

const manifest = {
  name: "@adui/viteplus-starter",
  version: "0.1.0",
  private: true,
  license: "MIT",
  repository: { type: "git", url: "git+https://github.com/adui-dev/viteplus-starter.git" },
};
function metadata() {
  return {
    name: manifest.name,
    version: manifest.version,
    filename: "adui-viteplus-starter-0.1.0.tgz",
    integrity: "sha512-dGVzdA==",
    size: 100,
    unpackedSize: 200,
    files: [
      "package.json",
      "README.md",
      "LICENSE",
      "packages/create/bin/cli.mjs",
      "packages/create/assets/normalize.css",
      "packages/create/assets/normalize.LICENSE.txt",
      "packages/create/assets/adui-studio-logo.svg",
      "packages/create/src/options.mjs",
      "packages/three/src/lazy.d.mts",
    ].map((path) => ({ path, size: 25, mode: 420 })),
  };
}

test("候选包清单保留实际 npm 文件信息与私有状态，不将本地报告称为发布", () => {
  const input = metadata(),
    original = structuredClone(input);
  const result = createCliPackReport(manifest, input);
  assert.equal(result.name, manifest.name);
  assert.equal(result.version, "0.1.0");
  assert.equal(result.private, true);
  assert.equal(result.publicationPerformed, false);
  assert.equal(result.fileCount, input.files.length);
  assert.ok(result.files.some((file) => file.path === "LICENSE"));
  assert.deepEqual(input, original);
});

test("未知、隐藏、测试、依赖、模型和越界路径不会进入公开包清单", () => {
  for (const path of [
    "../secret.mjs",
    "packages/create/src/../secret.mjs",
    "/README.md",
    "C:/secret.mjs",
    "packages\\create\\src\\file.mjs",
    "packages/create/src/.env.local",
    "packages/create/src/test/a.mjs",
    "packages/create/src/node_modules/a.mjs",
    "packages/create/src/NODE_MODULES/a.mjs",
    "packages/create/src/a.test.mjs",
    "packages/create/src/a.TEST.mjs",
    "packages/create/src/model.glb",
    "packages/create/src/model.adui",
    "credentials.json",
    ".npmrc",
    "docs/PRIVATE.md",
  ]) {
    const input = metadata();
    input.files.push({ path, size: 1 });
    assert.throws(() => createCliPackReport(manifest, input), /未知、重复或无效文件/);
  }
});

test("缺少许可、错误元信息、缺失资源或重复文件会阻止候选包审查通过", () => {
  for (const field of ["name", "version", "filename"]) {
    const input = metadata();
    input[field] = "wrong";
    assert.throws(() => createCliPackReport(manifest, input), /不一致/);
  }
  for (const path of [
    "LICENSE",
    "packages/create/bin/cli.mjs",
    "packages/create/assets/normalize.LICENSE.txt",
    "packages/create/assets/adui-studio-logo.svg",
  ]) {
    const input = metadata();
    input.files = input.files.filter((file) => file.path !== path);
    assert.throws(() => createCliPackReport(manifest, input), /缺少必要文件/);
  }
  const duplicate = metadata();
  duplicate.files.push(duplicate.files[0]);
  assert.throws(() => createCliPackReport(manifest, duplicate), /重复/);
  const invalid = metadata();
  invalid.files[0].size = -1;
  assert.throws(() => createCliPackReport(manifest, invalid), /无效文件/);
  assert.throws(
    () => createCliPackReport({ ...manifest, license: undefined }, metadata()),
    /必须声明 MIT/,
  );
  assert.throws(
    () => createCliPackReport({ ...manifest, scripts: { postinstall: "unsafe" } }, metadata()),
    /生命周期/,
  );
  assert.throws(
    () => createCliPackReport(manifest, { ...metadata(), integrity: undefined }),
    /完整性/,
  );
});
