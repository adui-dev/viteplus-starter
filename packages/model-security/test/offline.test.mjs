import { test } from "node:test";
import assert from "node:assert/strict";
import { createOfflineKeyring } from "../src/offline-keyring.mjs";
import { fetchBundledAdui } from "../src/bundled.mjs";
import { encryptAdui, MAX_ADUI_BYTES } from "../src/adui.mjs";
test("离线密钥仅内存解锁，锁定使晚到导入失效", async () => {
  const ring = createOfflineKeyring(),
    raw = crypto.getRandomValues(new Uint8Array(32));
  const file = new File(
    [JSON.stringify({ version: 1, keyId: "key", key: Buffer.from(raw).toString("base64") })],
    "unlock.json",
  );
  await assert.rejects(ring.authorize({ keyId: "key" }), /锁定/);
  assert.equal(await ring.unlock(file), true);
  const grant = await ring.authorize({ keyId: "key" });
  assert.equal(grant.key.extractable, false);
  assert.deepEqual(grant.key.usages, ["decrypt"]);
  await assert.rejects(ring.authorize({ keyId: "other" }), /匹配/);
  ring.lock();
  await assert.rejects(ring.authorize({ keyId: "key" }), /锁定/);
  let resolve;
  const pending = ring.unlock({
    size: 100,
    text: () =>
      new Promise((r) => {
        resolve = r;
      }),
  });
  ring.lock();
  resolve(await file.text());
  assert.equal(await pending, false);
  for (const file of [new File(["bad"], "x"), new File([new Uint8Array(4097)], "x")])
    await assert.rejects(ring.unlock(file));
});
test("加密资源限同源、限制流大小、绑定目录标识及取消", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const info = { modelId: "helmet", keyId: "key", format: "glb" },
    encrypted = await encryptAdui(new ArrayBuffer(64), key, info),
    asset = { ...info, name: "Helmet", url: "/demo/models/a.adui" },
    baseUrl = "http://localhost/demo/";
  let options;
  const fetcher = async (_url, input) => {
    options = input;
    return new Response(encrypted);
  };
  assert.deepEqual(await fetchBundledAdui(asset, { baseUrl, fetcher }), encrypted);
  assert.equal(options.redirect, "error");
  for (const url of [
    "https://other.test/a.adui",
    "/a.glb",
    "data:x",
    "http://user:pass@localhost/a.adui",
  ])
    await assert.rejects(fetchBundledAdui({ ...asset, url }, { baseUrl, fetcher }), /同源/);
  await assert.rejects(
    fetchBundledAdui({ ...asset, modelId: "other" }, { baseUrl, fetcher }),
    /标识/,
  );
  await assert.rejects(
    fetchBundledAdui(asset, { baseUrl, fetcher: async () => new Response("", { status: 403 }) }),
    /响应/,
  );
  await assert.rejects(
    fetchBundledAdui(asset, {
      baseUrl,
      fetcher: async () =>
        new Response("", { headers: { "content-length": String(MAX_ADUI_BYTES + 1) } }),
    }),
    /过大/,
  );
  let cancelled = false;
  await assert.rejects(
    fetchBundledAdui(asset, {
      baseUrl,
      fetcher: async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new Uint8Array(MAX_ADUI_BYTES + 1));
            },
            cancel() {
              cancelled = true;
            },
          }),
        ),
    }),
    /过大/,
  );
  assert.equal(cancelled, true);
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(fetchBundledAdui(asset, { baseUrl, fetcher, signal: abort.signal }), {
    name: "AbortError",
  });
});
