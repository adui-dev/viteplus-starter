// Local acceptance only. Production must replace this provider with authenticated server authorization.
export function createLocalGrant() {
  let current = null,
    version = 0;
  return {
    async select(file) {
      const request = ++version;
      current = null;
      if (!file || file.size > 4096) throw new Error("验收密钥文件不得超过 4 KiB");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("验收密钥 JSON 无效");
      }
      if (
        data?.version !== 1 ||
        typeof data.keyId !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(data.keyId) ||
        typeof data.key !== "string" ||
        !/^[A-Za-z0-9+/]{43}=$/.test(data.key)
      )
        throw new Error("验收密钥格式无效");
      const raw = Uint8Array.from(atob(data.key), (char) => char.charCodeAt(0));
      let key;
      try {
        key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      } finally {
        raw.fill(0);
        data.key = "";
      }
      if (request !== version) return false;
      current = { keyId: data.keyId, key, expiresAt: Date.now() + 10 * 60 * 1000 };
      return true;
    },
    async authorize(info) {
      if (!current || current.keyId !== info.keyId || current.expiresAt <= Date.now())
        throw new Error("请选择匹配的本地验收密钥（有效期 10 分钟）");
      return { key: current.key, expiresAt: current.expiresAt };
    },
    clear() {
      ++version;
      current = null;
    },
  };
}
