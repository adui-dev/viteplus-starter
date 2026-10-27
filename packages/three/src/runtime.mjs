export function bufferSize(width, height, pixelRatio, maxDimension = 8192) {
  if (![width, height].every((value) => Number.isFinite(value) && value >= 0))
    throw new Error("无效的 Three.js 容器尺寸");
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) throw new Error("DPR 必须为正有限数");
  const ratio = Math.min(2, pixelRatio, maxDimension / Math.max(1, width, height));
  return {
    width,
    height,
    pixelRatio: ratio,
    bufferWidth: Math.max(1, Math.floor(width * ratio)),
    bufferHeight: Math.max(1, Math.floor(height * ratio)),
  };
}

// Dependency injection keeps lifecycle tests independent of a browser/WebGL driver.
export function mountScene(THREE, host, options = {}) {
  const view = host.ownerDocument.defaultView;
  let override = options.pixelRatio;
  bufferSize(0, 0, override ?? view.devicePixelRatio ?? 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const canvas = renderer.domElement;
  let geometry, material, observer;
  let disposed = false,
    key = "";
  let status = {
    width: 0,
    height: 0,
    bufferWidth: 1,
    bufferHeight: 1,
    pixelRatio: 1,
    frames: 0,
    picks: 0,
    selected: false,
    disposed: false,
  };
  const notify = () => options.onStatus?.({ ...status });
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    observer?.disconnect();
    view.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", pick);
    canvas.removeEventListener("webglcontextlost", lost);
    geometry?.dispose();
    material?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    status = { ...status, disposed: true };
  };
  let scene, camera, mesh, raycaster;
  function resize() {
    if (disposed) return;
    const size = bufferSize(
      host.clientWidth,
      host.clientHeight,
      override ?? view.devicePixelRatio ?? 1,
      Math.min(8192, renderer.capabilities.maxTextureSize),
    );
    const nextKey = [size.width, size.height, size.pixelRatio].join(":");
    if (key === nextKey) return;
    key = nextKey;
    if (size.width && size.height) {
      renderer.setPixelRatio(size.pixelRatio);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
    status = { ...status, ...size };
    notify();
  }
  function pick(event) {
    if (disposed || !status.width || !status.height) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width,
      y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera({ x: x * 2 - 1, y: 1 - y * 2 }, camera);
    const selected = raycaster.intersectObject(mesh).length > 0;
    material.color.set(selected ? 0xffb454 : 0x43d9d0);
    status = { ...status, picks: status.picks + 1, selected };
    notify();
  }
  function lost(event) {
    event.preventDefault();
    cleanup();
    options.onError?.(new Error("WebGL 上下文已丢失，请卸载后重新挂载"));
    notify();
  }
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081522);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;
    geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    // A basic material makes selection color observable without lighting dependencies.
    material = new THREE.MeshBasicMaterial({ color: 0x43d9d0, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    raycaster = new THREE.Raycaster();
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
    canvas.setAttribute("aria-label", "Three.js 场景");
    host.appendChild(canvas);
    canvas.addEventListener("pointerdown", pick);
    canvas.addEventListener("webglcontextlost", lost);
    view.addEventListener("resize", resize);
    observer = view.ResizeObserver ? new view.ResizeObserver(resize) : null;
    observer?.observe(host);
    resize();
    renderer.setAnimationLoop((time) => {
      if (disposed) return;
      resize(); // Also detects DPR-only changes when moving between displays.
      if (!status.width || !status.height) return;
      mesh.rotation.y = time * 0.0003;
      mesh.rotation.x = 0.25;
      renderer.render(scene, camera);
      status.frames++;
    });
  } catch (error) {
    cleanup();
    throw error;
  }
  return {
    canvas,
    get status() {
      return { ...status };
    },
    setPixelRatio(value) {
      if (disposed) return;
      bufferSize(0, 0, value ?? view.devicePixelRatio ?? 1);
      override = value;
      resize();
    },
    destroy() {
      if (disposed) return;
      cleanup();
      notify();
    },
  };
}
