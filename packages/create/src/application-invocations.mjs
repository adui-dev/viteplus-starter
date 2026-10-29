import { fileURLToPath } from "node:url";
const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));

// app must come from validated, normalized batch options.
export function applicationInvocations(app, workspaceRoot) {
  const args = [
    cliPath,
    "--workspace",
    workspaceRoot,
    "--name",
    app.name,
    "--type",
    "application",
    "--framework",
    app.framework,
    "--language",
    app.language,
    "--ui",
    app.ui,
    "--css",
    app.css,
  ];
  const uiArgs = [...args];
  if (app.engine) args.push("--engine", app.engine);
  if (app.engines) args.push("--engines", app.engines.join(","));
  if (app.modelProtection !== undefined) args.push("--model-protection", app.modelProtection);
  if (app.screen)
    args.push(
      "--screen",
      "--screen-width",
      String(app.screen.designWidth),
      "--screen-height",
      String(app.screen.designHeight),
      "--screen-mode",
      app.screen.mode,
    );
  return { args, uiArgs };
}
