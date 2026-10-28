import { lstat, open } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { parseEnv } from "node:util";
import { encryptAdui } from "../src/adui.mjs";
import { validateGlb } from "../../three/src/model.mjs";

async function safePath(path) {
  let current = resolve(path);
  while (true) {
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error("拒绝符号链接或 junction 路径");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(path);
}
async function read(path, max) {
  const file = await open(await safePath(path), "r");
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > max) throw new Error("输入文件类型或大小无效");
    // Bound the read even if a second process grows the file after stat.
    const result = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < result.length) {
      const { bytesRead } = await file.read(result, offset, result.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > stat.size) throw new Error("读取期间输入文件已变化");
    return result.subarray(0, offset);
  } finally {
    await file.close();
  }
}
async function write(path, data) {
  const file = await open(await safePath(path), "wx", 0o600);
  try {
    await file.writeFile(data);
  } finally {
    await file.close();
  }
}
async function main() {
  const [command, ...args] = process.argv.slice(2),
    options = {};
  const allowed = ["keygen", "keygen-env"].includes(command)
    ? ["out", "key-id"]
    : command === "export-unlock"
      ? ["env-file", "out"]
      : command === "encrypt"
        ? ["input", "output", "key-file", "model-id"]
        : [];
  if (!allowed.length || args.length !== allowed.length * 2)
    throw new Error(
      "用法：keygen/keygen-env --out <密钥文件> --key-id <ID>；encrypt --input <模型.glb> --output <模型.adui> --key-file <密钥.json> --model-id <ID>",
    );
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i].slice(2);
    if (!args[i].startsWith("--") || !allowed.includes(name) || options[name] || !args[i + 1])
      throw new Error("未知、重复或缺失参数");
    options[name] = args[i + 1];
  }
  if (allowed.some((name) => !options[name])) throw new Error("缺少参数");
  if (command === "export-unlock") {
    const env = parseEnv((await read(options["env-file"], 64 * 1024)).toString("utf8"));
    if (
      !/^[A-Za-z0-9+/]{43}=$/.test(env.ADUI_MODEL_KEY ?? "") ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(env.ADUI_MODEL_KEY_ID ?? "")
    )
      throw new Error("env 密钥配置无效");
    await write(
      options.out,
      JSON.stringify({ version: 1, keyId: env.ADUI_MODEL_KEY_ID, key: env.ADUI_MODEL_KEY }) + "\n",
    );
    console.log("独立解锁文件已导出；请单独交付，不放入网站部署包。");
    return;
  }
  if (["keygen", "keygen-env"].includes(command)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options["key-id"]))
      throw new Error("密钥标识无效");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    try {
      await write(
        options.out,
        command === "keygen-env"
          ? "ADUI_MODEL_KEY_ID=" +
              options["key-id"] +
              "\nADUI_MODEL_KEY=" +
              Buffer.from(bytes).toString("base64") +
              "\n"
          : JSON.stringify({
              version: 1,
              keyId: options["key-id"],
              key: Buffer.from(bytes).toString("base64"),
            }) + "\n",
      );
    } finally {
      bytes.fill(0);
    }
    console.log("密钥文件已创建；请独立保管，不放入源码或 public 目录。");
    return;
  }
  if (
    extname(options.input).toLowerCase() !== ".glb" ||
    extname(options.output).toLowerCase() !== ".adui"
  )
    throw new Error("输入须为 .glb，输出须为 .adui");
  const source = await read(options.input, 32 * 1024 * 1024);
  const plain = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  validateGlb(plain);
  let config;
  const keyText = (await read(options["key-file"], 4096)).toString("utf8");
  try {
    config = JSON.parse(keyText);
  } catch {
    throw new Error("密钥 JSON 无效");
  }
  if (
    config.version !== 1 ||
    typeof config.key !== "string" ||
    !/^[A-Za-z0-9+/]{43}=$/.test(config.key)
  )
    throw new Error("密钥文件无效");
  const raw = Buffer.from(config.key, "base64");
  let key;
  try {
    key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  } finally {
    raw.fill(0);
    config.key = "";
  }
  try {
    const result = await encryptAdui(plain, key, {
      modelId: options["model-id"],
      keyId: config.keyId,
      format: "glb",
    });
    await write(options.output, new Uint8Array(result));
  } finally {
    new Uint8Array(plain).fill(0);
    source.fill(0);
  }
  console.log("已生成 .adui 加密模型，原 GLB 保留。");
}
main().catch((error) => {
  console.error(error.code ? "文件操作失败：" + error.code : error.message);
  process.exitCode = 1;
});
