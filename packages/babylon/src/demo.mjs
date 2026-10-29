import { createLazyScene } from "./lazy.mjs";
import { createLocalGrant } from "../../model-security/src/local-grant.mjs";
export function mountBabylonDemo(container) {
  const host = document.createElement("div"),
    toolbar = document.createElement("div"),
    button = document.createElement("button"),
    status = document.createElement("span");
  host.className = "babylon-host";
  toolbar.className = "babylon-controls";
  button.textContent = "加载 Babylon";
  status.textContent = "等待加载";
  status.setAttribute("role", "status");
  toolbar.append(button, status);
  container.append(host, toolbar);
  const scene = createLazyScene(host, {
    load: () => import("./scene.mjs"),
    onState(value) {
      button.disabled = value.loading || value.ready;
      status.textContent = JSON.stringify(value);
      container.dataset.babylonState = status.textContent;
    },
    onError(message) {
      status.textContent = message;
    },
  });
  const click = () => {
    void scene.load();
  };
  button.addEventListener("click", click);
  const grant = createLocalGrant();
  let active = true,
    read = 0;
  const model = document.createElement("input"),
    key = document.createElement("input"),
    clear = document.createElement("button"),
    lock = document.createElement("button"),
    modelStatus = document.createElement("span");
  model.type = key.type = "file";
  model.accept = ".glb,.adui";
  key.accept = ".json";
  model.setAttribute("aria-label", "Babylon 模型文件");
  key.setAttribute("aria-label", "Babylon 验收密钥");
  clear.textContent = "清除模型";
  lock.textContent = "清除授权";
  modelStatus.setAttribute("data-model-status", "");
  toolbar.append(model, key, clear, lock, modelStatus);
  const openModel = async () => {
    const file = model.files?.[0];
    model.value = "";
    if (!file) return;
    const request = ++read;
    scene.cancelModelLoad();
    if (file.size > 32 * 1024 * 1024 + 4112) {
      modelStatus.textContent = "模型超限";
      return;
    }
    modelStatus.textContent = "正在加载模型…";
    try {
      const buffer = await file.arrayBuffer();
      if (!active || request !== read) return;
      const ok = await scene.loadModel(buffer, {
        encrypted: file.name.toLowerCase().endsWith(".adui"),
        authorize: (info) => grant.authorize(info),
      });
      if (active && request === read)
        modelStatus.textContent = ok
          ? "模型已加载"
          : host.querySelector("canvas")?.dataset.modelError || "加载失败";
    } catch (error) {
      if (active && request === read) modelStatus.textContent = String(error);
    }
  };
  const openKey = async () => {
    const request = ++read;
    scene.cancelModelLoad();
    scene.clearModel();
    const file = key.files?.[0];
    key.value = "";
    if (!file) return;
    modelStatus.textContent = "正在导入验收密钥…";
    try {
      const ok = await grant.select(file);
      if (active && request === read)
        modelStatus.textContent = ok ? "验收密钥已导入" : "授权已失效";
    } catch (error) {
      if (active && request === read) modelStatus.textContent = String(error);
    }
  };
  const clearModel = () => {
    ++read;
    scene.clearModel();
    modelStatus.textContent = "模型已清除";
  };
  const clearKey = () => {
    grant.clear();
    clearModel();
    modelStatus.textContent = "授权已清除";
  };
  model.addEventListener("change", openModel);
  key.addEventListener("change", openKey);
  clear.addEventListener("click", clearModel);
  lock.addEventListener("click", clearKey);
  return () => {
    active = false;
    ++read;
    grant.clear();
    model.removeEventListener("change", openModel);
    key.removeEventListener("change", openKey);
    clear.removeEventListener("click", clearModel);
    lock.removeEventListener("click", clearKey);
    button.removeEventListener("click", click);
    scene.destroy();
    host.remove();
    toolbar.remove();
  };
}
