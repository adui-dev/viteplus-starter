const VALUE_OPTIONS = new Set([
  "--inspect-workspace",
  "--plan-recovery",
  "--execute-recovery",
  "--engine",
  "--engines",
  "--model-protection",
  "--name",
  "--type",
  "--framework",
  "--language",
  "--ui",
  "--css",
  "--workspace",
  "--config",
  "--screen-width",
  "--screen-height",
  "--screen-mode",
]);

export function parseCliArgs(argv) {
  const options = {
    name: undefined,
    type: undefined,
    framework: undefined,
    language: undefined,
    ui: undefined,
    css: undefined,
    dryRun: false,
    applyExisting: false,
    repairExisting: false,
    uiSmoke: false,
  };
  const seen = new Set();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") return { help: true };
    if (token === "--screen") {
      if (seen.has(token)) throw new Error("参数不能重复: " + token);
      options.screen = true;
      seen.add(token);
      continue;
    }
    if (token === "--three-smoke") {
      if (seen.has(token)) throw new Error("参数不能重复: " + token);
      options.threeSmoke = true;
      seen.add(token);
      continue;
    }
    if (token === "--ui-smoke") {
      if (seen.has(token)) throw new Error("参数不能重复: " + token);
      options.uiSmoke = true;
      seen.add(token);
      continue;
    }
    if (token === "--repair-existing") {
      if (seen.has(token)) throw new Error("参数不能重复: " + token);
      options.repairExisting = true;
      seen.add(token);
      continue;
    }
    if (token === "--apply-existing") {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`);
      options.applyExisting = true;
      seen.add(token);
      continue;
    }
    if (token === "--dry-run") {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`);
      options.dryRun = true;
      seen.add(token);
      continue;
    }
    if (VALUE_OPTIONS.has(token)) {
      if (seen.has(token)) throw new Error(`参数不能重复: ${token}`);
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error(`${token} 缺少参数`);
      }
      options[token.slice(2)] = token === "--engines" ? value.split(",") : value;
      seen.add(token);
      continue;
    }
    throw new Error(`未知参数: ${token}`);
  }

  return options;
}
