import { lstat, readdir, open } from "node:fs/promises";
import { resolve, relative, dirname, basename, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { parseEnv } from "node:util";
import { encryptAdui, MAX_MODEL_BYTES } from "./adui.mjs";
import { validateGlb } from "../../three/src/model.mjs";
const VIRTUAL = "virtual:adui-models",
  INTERNAL = "\0" + VIRTUAL;
const rawModel = /\.(?:glb|gltf|fbx|obj|mtl)(?:[?#.]|$)/i;
const KEY_MODULE = "virtual:adui-model-key";
function inside(root, path) {
  const part = relative(root, path);
  return part === "" || (!part.startsWith("..") && !isAbsolute(part));
}
async function safe(path) {
  let current = resolve(path);
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("模型加密拒绝链接路径");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path;
}
async function read(path, max) {
  const file = await open(await safe(path), "r");
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > max) throw new Error("模型或密钥文件大小无效");
    const bytes = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const next = await file.read(bytes, offset, bytes.length - offset, null);
      if (!next.bytesRead) break;
      offset += next.bytesRead;
    }
    if (offset !== stat.size) throw new Error("读取期间文件发生变化");
    return bytes.subarray(0, offset);
  } finally {
    await file.close();
  }
}
async function files(directory) {
  await safe(directory);
  try {
    if (!(await lstat(directory)).isDirectory()) throw new Error("模型路径必须为目录");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const result = [];
  for (const name of (await readdir(directory)).sort()) {
    const path = resolve(directory, name),
      stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error("模型加密拒绝链接路径");
    if (stat.isDirectory()) result.push(...(await files(path)));
    else if (stat.isFile()) result.push(path);
    else throw new Error("不支持的模型目录文件类型");
  }
  return result;
}
function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function aduiModels({
  envFile = ".env.local",
  modelsDir = "src/models",
  keyMode = "embedded",
} = {}) {
  if (!["external", "embedded"].includes(keyMode))
    throw new Error("keyMode 仅支持 external 或 embedded");
  let config,
    root,
    directory,
    envPath,
    pending,
    entries = [],
    secret,
    basePath;
  async function prepare() {
    if (pending) return pending;
    pending = (async () => {
      const vars = parseEnv((await read(envPath, 64 * 1024)).toString("utf8"));
      let encoded = vars.ADUI_MODEL_KEY;
      const keyId = vars.ADUI_MODEL_KEY_ID ?? "adui-local-v1";
      if (!encoded && vars.VITE_ADUI_AES_KEY) {
        if (keyMode !== "embedded")
          throw new Error("外置密钥模式请使用不带 VITE_ 前缀的 ADUI_MODEL_KEY");
        const legacy = Buffer.from(vars.VITE_ADUI_AES_KEY, "utf8");
        if (legacy.length !== 32) throw new Error("VITE_ADUI_AES_KEY 必须为 UTF-8 32 字节");
        encoded = legacy.toString("base64");
        legacy.fill(0);
      }
      if (
        typeof encoded !== "string" ||
        !/^[A-Za-z0-9+/]{43}=$/.test(encoded) ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(keyId ?? "")
      )
        throw new Error("请在私有 env 文件配置 ADUI_MODEL_KEY 和 ADUI_MODEL_KEY_ID");
      if (
        keyMode === "external" &&
        Object.entries(vars).some(([name, value]) => name.startsWith("VITE_") && value === encoded)
      )
        throw new Error("禁止通过 VITE_ 变量暴露模型密钥");
      const raw = Buffer.from(encoded, "base64");
      let key;
      try {
        key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
      } finally {
        raw.fill(0);
      }
      const allowedHosts = (vars.ADUI_MODEL_ALLOWED_HOSTS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (
        allowedHosts.length > 32 ||
        allowedHosts.some((value) => !/^[a-z0-9][a-z0-9.-]{0,252}$/.test(value))
      )
        throw new Error("模型域名列表无效，仅接受 hostname");
      secret = {
        encoded,
        keyId,
        allowedHosts,
        hex: Buffer.from(encoded, "base64").toString("hex"),
      };
      const output = [];
      let total = 0;
      for (const path of await files(directory)) {
        if (!path.toLowerCase().endsWith(".glb"))
          throw new Error("受保护模型目录首期仅接受自包含 .glb");
        const plain = await read(path, MAX_MODEL_BYTES);
        total += plain.length;
        if (output.length >= 128 || total > 128 * 1024 * 1024)
          throw new Error("模型总量超过 128 个或 128 MiB");
        const buffer = plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.length);
        validateGlb(buffer);
        const modelId = "m-" + hash(relative(directory, path).replaceAll("\\", "/")).slice(0, 24);
        const cipher = new Uint8Array(
          await encryptAdui(buffer, key, { modelId, keyId, format: "glb" }),
        );
        new Uint8Array(buffer).fill(0);
        output.push({
          path,
          plain,
          cipher,
          modelId,
          keyId,
          name: basename(path).slice(0, -4),
          filename: "models/" + hash(cipher).slice(0, 32) + ".adui",
        });
      }
      entries = output;
      await auditPublic();
      return entries;
    })().catch((error) => {
      pending = null;
      throw error.code ? new Error("模型加密文件操作失败：" + error.code) : error;
    });
    return pending;
  }
  function audit(name, bytes) {
    const data = typeof bytes === "string" ? Buffer.from(bytes) : Buffer.from(bytes);
    if (rawModel.test(name) || data.subarray(0, 4).toString() === "glTF")
      throw new Error("发现明文模型产物，已阻止构建");
    if (
      secret &&
      [
        Buffer.from(secret.encoded),
        Buffer.from(secret.encoded, "base64"),
        Buffer.from(secret.hex),
      ].some((value) => data.includes(value))
    )
      throw new Error("发现模型密钥泄漏，已阻止构建");
    for (const entry of entries)
      if (data.includes(entry.plain) || data.includes(Buffer.from(entry.plain.toString("base64"))))
        throw new Error("发现模型明文或内联副本，已阻止构建");
  }
  async function auditPublic() {
    if (!config.publicDir) return;
    for (const path of await files(config.publicDir)) {
      if (resolve(path) === envPath || /(?:^|[\\/])\.env(?:\.|$)|\.key\.json$/i.test(path))
        throw new Error("public 中禁止密钥文件");
      audit(path, await read(path, 128 * 1024 * 1024));
    }
  }
  return {
    name: "adui-encrypted-models",
    enforce: "pre",
    configResolved(value) {
      config = value;
      root = resolve(config.root);
      basePath = new URL(config.base, "http://localhost/").pathname;
      if (!basePath.endsWith("/")) basePath += "/";
      directory = resolve(root, modelsDir);
      envPath = resolve(root, envFile);
      const out = resolve(root, config.build.outDir);
      if (
        !inside(root, directory) ||
        directory === root ||
        inside(directory, envPath) ||
        inside(out, envPath) ||
        inside(out, directory) ||
        (config.publicDir &&
          (inside(config.publicDir, directory) || inside(config.publicDir, envPath)))
      )
        throw new Error("模型和密钥路径不得位于 public 或构建输出目录；模型目录须在项目内");
    },
    async buildStart() {
      pending = null;
      await prepare();
      this.addWatchFile(envPath);
      this.addWatchFile(directory);
      for (const item of entries) {
        this.addWatchFile(item.path);
        if (config.command === "build")
          item.reference = this.emitFile({
            type: "asset",
            fileName: item.filename,
            source: item.cipher,
          });
      }
    },
    resolveId(id) {
      if (id === KEY_MODULE) return "\0" + KEY_MODULE;
      if (id === VIRTUAL) return INTERNAL;
      if (rawModel.test(id))
        throw new Error("禁止直接导入明文模型，请从 virtual:adui-models 选择模型");
    },
    async load(id) {
      if (id === "\0" + KEY_MODULE) {
        if (keyMode !== "embedded") throw new Error("外置密钥模式必须通过独立解锁文件提供密钥");
        await prepare();
        const raw = Buffer.from(secret.encoded, "base64"),
          mask = crypto.getRandomValues(new Uint8Array(32));
        const masked = Uint8Array.from(raw, (byte, index) => byte ^ mask[index]);
        raw.fill(0);
        const guard =
          config.command === "build" && secret.allowedHosts.length
            ? "if(!" +
              JSON.stringify(secret.allowedHosts) +
              '.includes(globalThis.location?.hostname?.toLowerCase()))throw new Error("当前域名不允许加载模型");'
            : "";
        return {
          code:
            "let pending;export async function authorize(info){" +
            guard +
            "if(info.keyId!==" +
            JSON.stringify(secret.keyId) +
            ')throw new Error("模型密钥不匹配");if(!pending){const a=atob(' +
            JSON.stringify(Buffer.from(masked).toString("base64")) +
            "),b=atob(" +
            JSON.stringify(Buffer.from(mask).toString("base64")) +
            ');const raw=Uint8Array.from(a,(c,i)=>c.charCodeAt(0)^b.charCodeAt(i));pending=crypto.subtle.importKey("raw",raw,"AES-GCM",false,["decrypt"]).finally(()=>raw.fill(0))}return {key:await pending,expiresAt:Number.MAX_SAFE_INTEGER}}',
          map: { mappings: "" },
        };
      }
      if (id !== INTERNAL) return;
      await prepare();
      const records = entries.map((item) => {
        const url =
          config.command === "build"
            ? "import.meta.ROLLUP_FILE_URL_" +
              (item.reference ??
                this.emitFile({ type: "asset", fileName: item.filename, source: item.cipher }))
            : JSON.stringify(basePath + "__adui_models__/" + item.filename.split("/").pop());
        return (
          "{name:" +
          JSON.stringify(item.name) +
          ",modelId:" +
          JSON.stringify(item.modelId) +
          ",keyId:" +
          JSON.stringify(item.keyId) +
          ",url:" +
          url +
          "}"
        );
      });
      return { code: "export default [" + records.join(",") + "];", map: { mappings: "" } };
    },
    configureServer(server) {
      server.watcher.add([directory, envPath]);
      const changed = (event, path) => {
        if (["add", "unlink"].includes(event) && inside(directory, resolve(path))) {
          pending = null;
          for (const id of [INTERNAL, "\0" + KEY_MODULE]) {
            const module = server.moduleGraph.getModuleById(id);
            if (module) server.moduleGraph.invalidateModule(module);
          }
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("all", changed);
      server.httpServer?.once("close", () => server.watcher.off("all", changed));
      server.middlewares.use(async (req, res, next) => {
        try {
          let path = new URL(req.url ?? "/", "http://localhost").pathname;
          for (let count = 0; count < 4 && path.includes("%"); count++)
            path = decodeURIComponent(path);
          if (
            path.includes("%") ||
            rawModel.test(path) ||
            /(?:^|\/)\.env(?:\.|$)|\.key\.json$/i.test(path) ||
            path
              .replaceAll("\\", "/")
              .toLowerCase()
              .includes(envPath.replaceAll("\\", "/").toLowerCase()) ||
            resolve(
              root,
              "." + (path.startsWith(basePath) ? "/" + path.slice(basePath.length) : path),
            ).toLowerCase() === envPath.toLowerCase()
          ) {
            res.statusCode = 403;
            res.end("Protected model or key");
            return;
          }
          const prefix = basePath + "__adui_models__/";
          if (!path.startsWith(prefix)) {
            next();
            return;
          }
          if (!["GET", "HEAD"].includes(req.method)) {
            res.statusCode = 405;
            res.end();
            return;
          }
          await prepare();
          const item = entries.find((value) => path === prefix + value.filename.split("/").pop());
          if (!item) {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Length", item.cipher.byteLength);
          res.end(req.method === "HEAD" ? undefined : item.cipher);
        } catch {
          res.statusCode = 500;
          res.end("Model encryption failed");
        }
      });
    },
    handleHotUpdate(ctx) {
      if (resolve(ctx.file) === envPath || inside(directory, resolve(ctx.file))) {
        pending = null;
        for (const id of [INTERNAL, "\0" + KEY_MODULE]) {
          const module = ctx.server.moduleGraph.getModuleById(id);
          if (module) ctx.server.moduleGraph.invalidateModule(module);
        }
        ctx.server.ws.send({ type: "full-reload" });
        return [];
      }
    },
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        await prepare();
        await auditPublic();
        for (const [name, item] of Object.entries(bundle))
          audit(name, item.type === "chunk" ? item.code : item.source);
      },
    },
    writeBundle: {
      order: "post",
      async handler(options) {
        const output = options.dir
          ? resolve(root, options.dir)
          : options.file
            ? dirname(resolve(root, options.file))
            : resolve(root, config.build.outDir);
        for (const path of await files(output)) audit(path, await read(path, 128 * 1024 * 1024));
      },
    },
    closeBundle() {
      for (const item of entries) item.plain.fill(0);
      entries = [];
      pending = null;
      secret = null;
    },
  };
}
