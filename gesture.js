/* Optional local-only webcam hand controls for Perpustakaan Maya Zaman Air Batu.
   Uses MediaPipe Hand Landmarker. Camera frames stay on this device. */
(function () {
  "use strict";
  const VERSION = "0.10.22";
  const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + VERSION;
  const MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  const state = {
    active: false, loading: false, stream: null, landmarker: null, animation: 0,
    videoTime: -1, sampleAt: 0, lastAction: 0, start: null,
    pinchAt: 0, pinchLatched: false, chosenBook: 0, mirrored: true
  };
  const css = document.createElement("style");
  css.textContent =
    "#gesturePanel{position:fixed;right:16px;bottom:14px;z-index:1000;max-width:min(390px,calc(100vw - 28px));width:390px;" +
    "background:#f7fcff;border:3px solid #91cde8;border-radius:22px;box-shadow:0 15px 45px #1a527b80;" +
    "color:#164f78;padding:15px;font-size:14px}" +
    "#gesturePanel[hidden]{display:none!important}" +
    "#gesturePanel button{margin:3px;padding:8px 11px;font-size:13px}" +
    "#gesturePanel video{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#153448;" +
    "border-radius:12px;margin:8px auto}" +
    "#gesturePanel .gesture-top{display:flex;gap:10px;align-items:center;justify-content:space-between}" +
    "#gesturePanel .gesture-top strong{font-size:17px}" +
    "#gesturePanel .gesture-hint{font-size:13px;line-height:1.5;margin:8px 0}" +
    "#gesturePanel .gesture-status{background:#e2f3fc;padding:8px;border-radius:9px;min-height:2em}" +
    "#gesturePanel label{display:inline-flex;align-items:center;gap:5px;font-size:13px;margin:4px}" +
    "#gesturePanel input[type=range]{width:100px}" +
    ".book.gesture-focus{transform:translateY(-15px) scale(1.04);outline:5px solid #ffe56c;outline-offset:4px}" +
    "@media(max-width:600px){#gesturePanel{right:7px;bottom:7px;width:calc(100vw - 14px);max-height:85vh;overflow:auto}}";
  document.head.appendChild(css);

  const panel = document.createElement("section");
  panel.id = "gesturePanel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Panel kawalan gestur kamera");
  panel.innerHTML =
    '<div class="gesture-top"><strong>✋ Mod Gestur Tangan</strong><button id="closeGesturePanel" class="secondary" aria-label="Tutup panel">✕</button></div>' +
    '<p class="gesture-hint">Gerakkan tapak tangan terbuka ke <b>kiri</b> untuk halaman seterusnya atau ke <b>kanan</b> untuk kembali. Di rak buku, gerakkan tangan untuk pilih buku, kemudian <b>cubit jari ibu dan telunjuk</b> sekejap untuk buka buku.</p>' +
    '<p class="gesture-hint">Kamera hanya aktif selepas anda menekan Mula Kamera. Video diproses pada peranti; laman ini tidak merakam atau memuat naik video. Model dan pustaka dimuat turun melalui internet.</p>' +
    '<video id="gestureVideo" autoplay playsinline muted aria-label="Pratonton kamera" style="transform:scaleX(-1)"></video>' +
    '<p id="gestureStatus" class="gesture-status" role="status" aria-live="polite">Kamera belum diaktifkan.</p>' +
    '<div><button id="startGesture">📷 Mula Kamera</button><button id="stopGesture" class="secondary" disabled>⏹ Henti Kamera</button></div>' +
    '<div><label>Sensitiviti <input id="gestureSensitivity" type="range" min="10" max="26" value="17" step="1" aria-label="Kepekaan sapuan tangan"></label>' +
    '<label><input id="gestureMirror" type="checkbox" checked> Paparan cermin</label></div>' +
    '<p class="gesture-hint">Petua: pastikan pencahayaan terang, satu tangan kelihatan jelas, dan sapu tangan merentasi kamera dalam satu gerakan. Butang halaman dan skrin sentuh tetap boleh digunakan.</p>';
  document.body.appendChild(panel);

  const el = id => document.getElementById(id);
  const video = el("gestureVideo");
  const startButton = el("startGesture");
  const stopButton = el("stopGesture");
  const sens = el("gestureSensitivity");
  const closeButton = el("closeGesturePanel");
  const mirror = el("gestureMirror");

  function status(message) {
    el("gestureStatus").textContent = message;
  }
  function show() {
    panel.hidden = false;
  }
  function toggle() {
    panel.hidden ? show() : hide();
  }
  function hide() {
    stop();
    panel.hidden = true;
  }
  function clearSelection() {
    document.querySelectorAll(".book.gesture-focus").forEach(x => x.classList.remove("gesture-focus"));
  }
  function stop() {
    state.active = false;
    state.loading = false;
    if (state.animation) cancelAnimationFrame(state.animation);
    state.animation = 0;
    if (state.stream) state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
    video.pause();
    video.srcObject = null;
    if (state.landmarker) {
      try { state.landmarker.close(); } catch (_) {}
    }
    state.landmarker = null;
    state.videoTime = -1;
    state.start = null;
    state.pinchAt = 0;
    state.pinchLatched = false;
    startButton.disabled = false;
    stopButton.disabled = true;
    clearSelection();
  }

  async function start() {
    if (state.active || state.loading) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status("Kamera memerlukan HTTPS / localhost dan pelayar yang menyokong getUserMedia. Gunakan GitHub Pages.");
      return;
    }
    state.loading = true;
    startButton.disabled = true;
    status("Meminta kebenaran kamera…");
    try {
      state.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      video.srcObject = state.stream;
      await video.play();
      status("Kamera aktif. Memuat turun model pengesanan tangan…");
      const vision = await import(CDN + "/+esm");
      const files = await vision.FilesetResolver.forVisionTasks(CDN + "/wasm");
      state.landmarker = await vision.HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55
      });
      state.active = true;
      state.videoTime = -1;
      state.sampleAt = 0;
      state.start = null;
      state.lastAction = 0;
      stopButton.disabled = false;
      status("✅ Sedia! Tunjukkan tapak tangan terbuka di hadapan kamera.");
      loop();
    } catch (err) {
      const name = err && err.name ? err.name : "";
      const message = name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Kebenaran kamera ditolak. Benarkan kamera dalam tetapan pelayar dan cuba lagi."
        : "Gagal memulakan pengecaman tangan. Semak sambungan internet, kamera, dan sokongan pelayar.";
      stop();
      status(message);
      console.error("Ice Age gesture camera:", err);
    } finally {
      state.loading = false;
      if (!state.active) startButton.disabled = false;
    }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function isOpenPalm(points) {
    const wrist = points[0];
    const tips = [8, 12, 16, 20];
    return tips.filter(i => distance(points[i], wrist) > distance(points[i - 2], wrist) * 1.13).length >= 3;
  }
  function isPinching(points) {
    const scale = Math.max(0.001, distance(points[0], points[9]));
    return distance(points[4], points[8]) < scale * 0.4;
  }
  function reading() {
    const elReader = el("reader");
    return !!elReader && !elReader.classList.contains("hidden");
  }
  function shelving() {
    const elShelf = el("library");
    return !!elShelf && !elShelf.classList.contains("hidden");
  }
  function highlightBook(x) {
    const elements = Array.from(document.querySelectorAll("#shelves .book"));
    if (!elements.length) return;
    const index = Math.min(elements.length - 1, Math.max(0, Math.floor(x * elements.length)));
    state.chosenBook = index;
    elements.forEach((element, i) => {
      element.classList.toggle("gesture-focus", i === index);
    });
  }
  function process(points, now) {
    if (!Array.isArray(points) || points.length < 21) return;
    // Coordinates are mirrored to match the mirrored webcam preview.
    const x = state.mirrored ? 1 - points[9].x : points[9].x;
    const open = isOpenPalm(points);
    const pinch = isPinching(points);

    if (shelving()) {
      highlightBook(x);
      state.start = null;
      if (pinch) {
        if (!state.pinchAt) state.pinchAt = now;
        if (!state.pinchLatched && now - state.pinchAt > 380 && now - state.lastAction > 1400) {
          state.pinchLatched = true;
          state.lastAction = now;
          state.pinchAt = 0;
          clearSelection();
          if (typeof openBook === "function") openBook(state.chosenBook);
          status("📖 Buku dibuka! Sapu tangan terbuka untuk membalik halaman.");
        }
      } else {
        state.pinchAt = 0;
        state.pinchLatched = false;
      }
      return;
    }

    if (!reading() || !open || pinch) {
      state.start = null;
      return;
    }

    if (!state.start) {
      state.start = { x: x, time: now };
      return;
    }
    const difference = x - state.start.x;
    const elapsed = now - state.start.time;
    const threshold = Number(sens.value) / 100;
    if (Math.abs(difference) >= threshold && elapsed >= 120 && elapsed <= 1100 && now - state.lastAction >= 1300) {
      const delta = difference < 0 ? 1 : -1;
      state.lastAction = now;
      state.start = null;
      if (typeof changePage === "function") changePage(delta);
      status(delta === 1 ? "➡️ Halaman seterusnya." : "⬅️ Halaman sebelumnya.");
    } else if (elapsed > 1100) {
      state.start = { x: x, time: now };
    }
  }
  function loop() {
    if (!state.active) return;
    const now = performance.now();
    if (video.readyState >= 2 && video.currentTime !== state.videoTime && now - state.sampleAt > 45) {
      state.videoTime = video.currentTime;
      state.sampleAt = now;
      try {
        const result = state.landmarker.detectForVideo(video, now);
        if (result.landmarks && result.landmarks.length) {
          process(result.landmarks[0], now);
        } else {
          state.start = null;
          state.pinchAt = 0;
          state.pinchLatched = false;
          clearSelection();
        }
      } catch (error) {
        stop();
        status("Pengesanan gestur terhenti. Sila mulakan semula kamera.");
        console.error("MediaPipe detection:", error);
        return;
      }
    }
    state.animation = requestAnimationFrame(loop);
  }

  startButton.addEventListener("click", start);
  stopButton.addEventListener("click", () => {
    stop();
    status("Kamera dihentikan. Tiada bingkai video disimpan.");
  });
  closeButton.addEventListener("click", hide);
  mirror.addEventListener("change", () => {
    state.mirrored = mirror.checked;
    video.style.transform = state.mirrored ? "scaleX(-1)" : "none";
    state.start = null;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.active) {
      stop();
      status("Kamera dihentikan kerana tab tidak aktif.");
    }
  });
  window.addEventListener("pagehide", stop);
  window.IceGesture = { toggle, show, stop };
})();