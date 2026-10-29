import { setupModelPlugin } from "../src/setup.mjs";
const args = process.argv.slice(2),
  options = {};
try {
  for (let i = 0; i < args.length; i += 2) {
    if (
      !["--project", "--key-mode", "--engine"].includes(args[i]) ||
      !args[i + 1] ||
      options[args[i]]
    )
      throw new Error(
        "用法：--project <官方应用> [--key-mode external|embedded] [--engine three|babylon|cesium]",
      );
    options[args[i]] = args[i + 1];
  }
  if (!options["--project"]) throw new Error("缺少 --project");
  const result = await setupModelPlugin(
    options["--project"],
    options["--key-mode"],
    options["--engine"],
  );
  console.log(
    "模型插件已安装（" +
      result.keyMode +
      "），Vite 原配置已备份。请配置 .env.local 并将 GLB 放入 src/models。",
  );
} catch (error) {
  console.error(error.code ? "模型插件安装失败：" + error.code : error.message);
  process.exitCode = 1;
}
