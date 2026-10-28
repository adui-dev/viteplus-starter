import { test } from "node:test";
import assert from "node:assert/strict";
import { createDecipheriv } from "node:crypto";
import { encryptAdui, decryptAdui, inspectAdui, MAX_ADUI_BYTES } from "../src/adui.mjs";
import { createLocalGrant } from "../src/local-grant.mjs";
const info = { modelId: "helmet", keyId: "test-key", format: "glb" };
async function fixture() {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const encrypt = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = Uint8Array.from({ length: 128 }, (_, i) => i).buffer;
  const buffer = await encryptAdui(plain, encrypt, info);
  return {
    raw,
    encrypt,
    key,
    plain,
    buffer,
    authorize: async () => ({ key, expiresAt: Date.now() + 10000 }),
  };
}
test("ADUI v1 往返、随机 IV、原生 Node AES-GCM 互操作与认证头", async () => {
  const f = await fixture(),
    { metadata, headerLength } = inspectAdui(f.buffer);
  assert.deepEqual(metadata, info);
  assert.ok(Object.isFrozen(metadata));
  assert.deepEqual(await decryptAdui(f.buffer, { authorize: f.authorize }), f.plain);
  const second = await encryptAdui(f.plain, f.encrypt, info);
  assert.notDeepEqual(new Uint8Array(second).slice(12, 24), new Uint8Array(f.buffer).slice(12, 24));
  const bytes = Buffer.from(f.buffer),
    cipher = bytes.subarray(headerLength, -16);
  const decipher = createDecipheriv("aes-256-gcm", f.raw, bytes.subarray(12, 24));
  decipher.setAAD(bytes.subarray(0, headerLength));
  decipher.setAuthTag(bytes.subarray(-16));
  assert.deepEqual(
    Buffer.concat([decipher.update(cipher), decipher.final()]),
    Buffer.from(f.plain),
  );
});
test("错误密钥及模型标识、IV、密文和 tag 篡改均拒绝，不返回明文", async () => {
  const f = await fixture(),
    { headerLength } = inspectAdui(f.buffer);
  const wrong = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "decrypt",
  ]);
  await assert.rejects(
    decryptAdui(f.buffer, {
      authorize: async () => ({ key: wrong, expiresAt: Date.now() + 10000 }),
    }),
    /认证失败/,
  );
  const offset = Buffer.from(f.buffer).indexOf("helmet");
  for (const index of [
    offset,
    Buffer.from(f.buffer).indexOf("test-key"),
    12,
    headerLength,
    f.buffer.byteLength - 1,
  ]) {
    const changed = f.buffer.slice(0);
    new Uint8Array(changed)[index] ^= 1;
    await assert.rejects(decryptAdui(changed, { authorize: f.authorize }), /认证失败/);
  }
});
test("解密完成时再次检查授权到期，不返回过期明文", async (t) => {
  const f = await fixture();
  let calls = 0;
  t.mock.method(Date, "now", () => (++calls === 1 ? 1000 : 3000));
  await assert.rejects(
    decryptAdui(f.buffer, { authorize: async () => ({ key: f.key, expiresAt: 2000 }) }),
    /过期/,
  );
});
test("长度、版本、flags、元数据和授权契约边界", async () => {
  const f = await fixture();
  for (const index of [0, 4, 5, 6, 8]) {
    const invalid = f.buffer.slice(0);
    new Uint8Array(invalid)[index] ^= 1;
    assert.throws(() => inspectAdui(invalid), /ADUI/);
  }
  for (const invalid of [
    new Uint8Array(f.buffer),
    f.buffer.slice(0, -1),
    new ArrayBuffer(MAX_ADUI_BYTES + 1),
  ])
    assert.throws(() => inspectAdui(invalid), /ADUI/);
  await assert.rejects(encryptAdui(f.plain, f.encrypt, { ...info, key: "secret" }), /元数据/);
  await assert.rejects(encryptAdui(f.plain, f.encrypt, { ...info, modelId: "../x" }), /标识/);
  await assert.rejects(decryptAdui(f.buffer), /授权回调/);
  await assert.rejects(
    decryptAdui(f.buffer, {
      authorize: async () => {
        throw new Error("拒绝访问");
      },
    }),
    /拒绝访问/,
  );
  for (const expiresAt of [undefined, Infinity, Date.now() - 1])
    await assert.rejects(
      decryptAdui(f.buffer, { authorize: async () => ({ key: f.key, expiresAt }) }),
      /过期/,
    );
  for (const [length, extractable] of [
    [128, false],
    [256, true],
  ]) {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length }, extractable, [
      "decrypt",
    ]);
    await assert.rejects(
      decryptAdui(f.buffer, { authorize: async () => ({ key, expiresAt: Date.now() + 10000 }) }),
      /CryptoKey|不可导出/,
    );
  }
  const broadKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
  await assert.rejects(
    decryptAdui(f.buffer, {
      authorize: async () => ({ key: broadKey, expiresAt: Date.now() + 10000 }),
    }),
    /仅用于解密/,
  );
});
test("授权等待期间持有文件快照；取消后不返回明文", async () => {
  const f = await fixture();
  let resolve;
  const pending = decryptAdui(f.buffer, {
    authorize: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  new Uint8Array(f.buffer).fill(0);
  resolve(await f.authorize());
  assert.deepEqual(await pending, f.plain);
  const fresh = await fixture(),
    abort = new AbortController();
  const cancelled = decryptAdui(fresh.buffer, {
    signal: abort.signal,
    authorize: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  abort.abort();
  resolve(await fresh.authorize());
  await assert.rejects(cancelled, { name: "AbortError" });
});
test("本地验收 provider：匹配、清除、错误文件、并发与卸载失效", async () => {
  const f = await fixture(),
    grant = createLocalGrant();
  const file = new File(
    [JSON.stringify({ version: 1, keyId: info.keyId, key: Buffer.from(f.raw).toString("base64") })],
    "test.json",
  );
  await assert.rejects(grant.authorize(info), /请选择/);
  assert.equal(await grant.select(file), true);
  assert.equal((await grant.authorize(info)).key.extractable, false);
  assert.deepEqual(await decryptAdui(f.buffer, { authorize: grant.authorize }), f.plain);
  await assert.rejects(grant.authorize({ ...info, keyId: "other" }), /匹配/);
  grant.clear();
  await assert.rejects(grant.authorize(info), /请选择/);
  for (const invalid of [new File(["bad"], "x"), new File([new Uint8Array(4097)], "x")])
    await assert.rejects(grant.select(invalid));
  let resolve;
  const waiting = grant.select({
    size: file.size,
    text: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  grant.clear();
  resolve(await file.text());
  assert.equal(await waiting, false);
  await assert.rejects(grant.authorize(info), /请选择/);
});
