// The unlock file is distributed separately from the website, never fetched by this module.
export function createOfflineKeyring() {
  let current = null,
    version = 0;
  return {
    async unlock(file) {
      const request = ++version;
      current = null;
      if (!file || file.size > 4096) throw new Error("解锁文件不得超过 4 KiB");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("解锁文件 JSON 无效");
      }
      if (
        data?.version !== 1 ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(data.keyId ?? "") ||
        typeof data.key !== "string" ||
        !/^[A-Za-z0-9+/]{43}=$/.test(data.key)
      )
        throw new Error("解锁文件格式无效");
      const raw = Uint8Array.from(atob(data.key), (value) => value.charCodeAt(0));
      let key;
      try {
        key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      } finally {
        raw.fill(0);
        data.key = "";
      }
      if (request !== version) return false;
      current = { keyId: data.keyId, key };
      return true;
    },
    async authorize(info) {
      if (!current || current.keyId !== info.keyId) throw new Error("模型已锁定或解锁文件不匹配");
      return { key: current.key, expiresAt: Number.MAX_SAFE_INTEGER };
    },
    lock() {
      ++version;
      current = null;
    },
  };
}
