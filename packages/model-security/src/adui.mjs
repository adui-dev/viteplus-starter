export const MAX_MODEL_BYTES = 32 * 1024 * 1024;
export const MAX_ADUI_BYTES = MAX_MODEL_BYTES + 4096 + 16;
const FIXED = 24;
function metadata(value) {
  if (
    !value ||
    Object.keys(value).sort().join(",") !== "format,keyId,modelId" ||
    value.format !== "glb"
  )
    throw new Error("ADUI 元数据无效");
  for (const field of ["modelId", "keyId"])
    if (
      typeof value[field] !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value[field])
    )
      throw new Error("ADUI 模型或密钥标识无效");
  return Object.freeze({ modelId: value.modelId, keyId: value.keyId, format: "glb" });
}
function cryptoApi() {
  if (!globalThis.crypto?.subtle) throw new Error("需要 HTTPS 或 localhost 的 Web Crypto");
  return globalThis.crypto;
}
function checkKey(key, usage) {
  if (
    key?.type !== "secret" ||
    key.algorithm?.name !== "AES-GCM" ||
    key.algorithm.length !== 256 ||
    !key.usages?.includes(usage)
  )
    throw new Error("需要 AES-256-GCM CryptoKey");
  if (usage === "decrypt" && (key.extractable || key.usages.length !== 1))
    throw new Error("授权密钥必须不可导出且仅用于解密");
}
export function inspectAdui(buffer) {
  if (
    !(buffer instanceof ArrayBuffer) ||
    buffer.byteLength < FIXED + 16 ||
    buffer.byteLength > MAX_ADUI_BYTES
  )
    throw new Error("ADUI 文件长度无效");
  const bytes = new Uint8Array(buffer),
    view = new DataView(buffer);
  if (view.getUint32(0, false) !== 0x41445549 || bytes[4] !== 1 || bytes[5] !== 0)
    throw new Error("不支持的 ADUI 文件头或版本");
  const headerLength = view.getUint16(6, true),
    cipherLength = view.getUint32(8, true);
  if (
    headerLength <= FIXED ||
    headerLength > 4096 ||
    cipherLength < 36 ||
    cipherLength > MAX_MODEL_BYTES + 16 ||
    headerLength + cipherLength !== buffer.byteLength
  )
    throw new Error("ADUI 头或密文长度无效");
  let parsed;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(FIXED, headerLength)),
    );
  } catch {
    throw new Error("ADUI 元数据 JSON 无效");
  }
  return { metadata: metadata(parsed), headerLength };
}
export async function encryptAdui(buffer, key, info) {
  if (
    !(buffer instanceof ArrayBuffer) ||
    buffer.byteLength < 20 ||
    buffer.byteLength > MAX_MODEL_BYTES
  )
    throw new Error("模型必须为 20 字节至 32 MiB");
  checkKey(key, "encrypt");
  const encoded = new TextEncoder().encode(JSON.stringify(metadata(info)));
  const header = new Uint8Array(FIXED + encoded.length),
    view = new DataView(header.buffer);
  view.setUint32(0, 0x41445549, false);
  header[4] = 1;
  view.setUint16(6, header.length, true);
  view.setUint32(8, buffer.byteLength + 16, true);
  cryptoApi().getRandomValues(header.subarray(12, 24));
  header.set(encoded, FIXED);
  const cipher = await cryptoApi().subtle.encrypt(
    { name: "AES-GCM", iv: header.slice(12, 24), additionalData: header, tagLength: 128 },
    key,
    buffer,
  );
  const result = new Uint8Array(header.length + cipher.byteLength);
  result.set(header);
  result.set(new Uint8Array(cipher), header.length);
  return result.buffer;
}
export async function decryptAdui(buffer, { authorize, signal } = {}) {
  // Own a snapshot before asynchronous authorization: callers cannot change AAD/metadata mid-request.
  const snapshot =
    buffer instanceof ArrayBuffer && buffer.byteLength <= MAX_ADUI_BYTES ? buffer.slice(0) : buffer;
  const parsed = inspectAdui(snapshot);
  signal?.throwIfAborted();
  if (typeof authorize !== "function") throw new Error("缺少模型授权回调");
  const grant = await authorize(parsed.metadata, { signal });
  function active() {
    signal?.throwIfAborted();
    if (!Number.isSafeInteger(grant?.expiresAt) || grant.expiresAt <= Date.now())
      throw new Error("模型授权缺失或已过期");
    checkKey(grant.key, "decrypt");
  }
  active();
  const header = snapshot.slice(0, parsed.headerLength);
  let plain;
  try {
    plain = await cryptoApi().subtle.decrypt(
      { name: "AES-GCM", iv: header.slice(12, 24), additionalData: header, tagLength: 128 },
      grant.key,
      snapshot.slice(parsed.headerLength),
    );
  } catch {
    throw new Error("ADUI 认证失败：密钥错误或文件被篡改");
  }
  try {
    active();
  } catch (error) {
    new Uint8Array(plain).fill(0);
    throw error;
  }
  return plain;
}
