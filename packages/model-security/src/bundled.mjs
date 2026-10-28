import { inspectAdui, MAX_ADUI_BYTES } from "./adui.mjs";
export async function fetchBundledAdui(
  asset,
  { signal, fetcher = globalThis.fetch, baseUrl = globalThis.location?.href } = {},
) {
  const url = new URL(asset.url, baseUrl),
    base = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== base.origin ||
    !url.pathname.endsWith(".adui") ||
    url.username ||
    url.password
  )
    throw new Error("仅允许同源 .adui 模型");
  signal?.throwIfAborted();
  const response = await fetcher(url.href, {
    signal,
    credentials: "same-origin",
    redirect: "error",
    cache: "no-store",
  });
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get("content-length")) > MAX_ADUI_BYTES
  )
    throw new Error("加密模型响应无效或过大");
  const reader = response.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ADUI_BYTES) throw new Error("加密模型响应过大");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const info = inspectAdui(bytes.buffer).metadata;
  if (info.modelId !== asset.modelId || info.keyId !== asset.keyId)
    throw new Error("模型目录与加密文件标识不匹配");
  return bytes.buffer;
}
