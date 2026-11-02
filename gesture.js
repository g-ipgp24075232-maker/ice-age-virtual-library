/* Optional local-only webcam hand controls for Perpustakaan Maya Zaman Air Batu.
   Uses MediaPipe Hand Landmarker. Camera frames stay on this device. */
(function () {
  "use strict";
  // Use a stable published NPM release; 0.10.22 was only published as an RC.
  const VERSION = "0.10.35";
  const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + VERSION;
  const MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
  const state = {
    active: false, loading: false, stream: null, landmarker: null, animation: 0,
    videoTime: -1, sampleAt: 0, lastAction: 0, start: null,
    pinchAt: 0, pinchLatched: false, chosenBook: 0, mirrored: true,
    lastDiagnostic: "", libraryOrigin: "", loadedVersion: "", lastErrorPhase: "", cameraChange: false, cameraVersion: 0
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
    '<details><summary>🔧 Diagnostik / Butiran ralat</summary><p id="gestureDiagnostic" class="gesture-hint">Belum ada pemeriksaan.</p><button id="copyGestureError" class="secondary" type="button">📋 Salin mesej ralat</button></details>' +
    '<div><button id="startGesture">🤳 Mula Kamera Selfie</button><button id="stopGesture" class="secondary" disabled>⏹ Henti Kamera</button></div>' +
    '<div class="field"><label for="gestureCameraSelect">Kamera / 摄像头</label><select id="gestureCameraSelect"><option value="front">🤳 Kamera depan / Selfie</option><option value="rear">📷 Kamera belakang</option></select><button id="changeGestureCamera" class="secondary" type="button" disabled>🔄 Tukar Kamera</button></div>' +
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
  const diagnostic = el("gestureDiagnostic");
  const cameraSelect = el("gestureCameraSelect");
  const changeCameraButton = el("changeGestureCamera");

  function status(message) {
    el("gestureStatus").textContent = message;
  }
  function setDiagnostic(message) {
    state.lastDiagnostic = String(message || "");
    diagnostic.textContent = state.lastDiagnostic;
  }
  function errText(error) {
    const name = error && error.name || "Error";
    const message = error && error.message || String(error || "Unknown error");
    return name + ": " + message;
  }
  function trimMessage(message) {
    return String(message || "").slice(0, 550);
  }
  async function importVision() {
    // Each fallback uses its own matching WASM version to prevent mismatch.
    const published = ["0.10.35", "0.10.32"];
    const candidates = [];
    for (const version of published) {
      const base = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@" + version;
      candidates.push({ url: base + "/vision_bundle.mjs", wasm: base + "/wasm", version });
      candidates.push({ url: base + "/+esm", wasm: base + "/wasm", version });
    }
    const secondBase = "https://unpkg.com/@mediapipe/tasks-vision@0.10.35";
    candidates.push({
      url: secondBase + "/vision_bundle.mjs",
      wasm: secondBase + "/wasm",
      version: "0.10.35"
    });
    const errors = [];
    for (const item of candidates) {
      status("📦 Memuat MediaPipe " + item.version + " (" + (errors.length + 1) + "/" + candidates.length + ")…");
      try {
        const imported = await import(item.url);
        const api = imported && imported.FilesetResolver && imported.HandLandmarker ?
          imported : imported && imported.default;
        if (!api || !api.FilesetResolver || !api.HandLandmarker) {
          throw new Error("Modul tidak menyediakan FilesetResolver / HandLandmarker.");
        }
        state.libraryOrigin = item.url;
        state.loadedVersion = item.version;
        return { api, wasm: item.wasm };
      } catch (error) {
        errors.push(item.url + " : " + trimMessage(errText(error)));
      }
    }
    throw new Error("MediaPipe tidak dapat dimuat daripada CDN. " + errors.join(" | "));
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
    state.cameraVersion++;
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
    changeCameraButton.disabled = true;
    clearSelection();
  }


  function cameraRole(label) {
    if (/front|selfie|facetime|user.?facing|integrated|built.?in|depan|前置|自拍/i.test(label)) return "front";
    if (/back|rear|environment|world.?facing|belakang|后置/i.test(label)) return "rear";
    return "";
  }
  async function refreshCameraChoices() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const previous = cameraSelect.value;
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
      cameraSelect.innerHTML = "";
      for (const [key, label] of [["front", "🤳 Kamera depan / Selfie"], ["rear", "📷 Kamera belakang"]]) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = label;
        cameraSelect.append(option);
      }
      devices.forEach((device, i) => {
        if (!device.deviceId) return;
        const option = document.createElement("option");
        option.value = "device:" + device.deviceId;
        option.textContent = "🎥 " + (device.label || "Kamera " + (i + 1));
        cameraSelect.append(option);
      });
      if (Array.from(cameraSelect.options).some(o => o.value === previous)) cameraSelect.value = previous;
      const track = state.stream && state.stream.getVideoTracks()[0];
      const label = track && track.label || "";
      const mode = track && track.getSettings && track.getSettings().facingMode || "";
      setDiagnostic("Kamera digunakan: " + (label || "Tidak diketahui") + "; facingMode: " +
        (mode || "tidak dilaporkan") + "; kamera tersedia: " + devices.length +
        (state.lastErrorPhase ? "; ralat terakhir: " + state.lastErrorPhase : ""));
    } catch (error) {
      console.warn("Camera list:", error);
    }
  }
  async function requestCamera(choice) {
    const resolution = { width: { ideal: 640 }, height: { ideal: 480 } };
    const constraints = choice.startsWith("device:")
      ? [{ ...resolution, deviceId: { exact: choice.slice(7) } }]
      : [{ ...resolution, facingMode: { exact: choice === "rear" ? "environment" : "user" } },
         { ...resolution, facingMode: { ideal: choice === "rear" ? "environment" : "user" } },
         resolution];
    const errors = [];
    for (const config of constraints) {
      try {
        let stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: config });
        if (choice === "front" || choice === "rear") {
          try {
            const track = stream.getVideoTracks()[0];
            const settings = track.getSettings ? track.getSettings() : {};
            const list = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
            const match = list.find(d => d.deviceId && cameraRole(d.label) === choice);
            const actual = list.find(d => d.deviceId === settings.deviceId);
            if (match && match.deviceId !== settings.deviceId && cameraRole(actual && actual.label || "") !== choice) {
              stream.getTracks().forEach(t => t.stop());
              stream = await navigator.mediaDevices.getUserMedia({
                audio: false, video: { ...resolution, deviceId: { exact: match.deviceId } }
              });
            }
          } catch (e) {
            // Camera has already been granted: camera detection is best-effort.
            // If automatic label matching fails, let the user select it manually below.
            if (!stream.active) throw e;
          }
        }
        return stream;
      } catch (err) {
        errors.push(errText(err));
      }
    }
    throw new Error("Tidak dapat membuka kamera yang dipilih. " + errors.join(" | "));
  }
  async function attachSelectedCamera() {
    const selected = cameraSelect.value || "front";
    // Stop the previous track before switching. Some phones cannot use both cameras at once.
    if (state.stream) state.stream.getTracks().forEach(t => t.stop());
    state.stream = null;
    video.pause();
    video.srcObject = null;
    const stream = await requestCamera(selected);
    state.stream = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      stream.getTracks().forEach(t => t.stop());
      state.stream = null;
      video.srcObject = null;
      throw error;
    }
    state.videoTime = -1;
    state.sampleAt = 0;
    state.start = null;
    state.pinchAt = 0;
    state.pinchLatched = false;
    await refreshCameraChoices();
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.addEventListener("ended", () => {
        if (state.stream !== stream) return; // Intentional switch/stop is not a failure.
        state.active = false;
        if (state.animation) cancelAnimationFrame(state.animation);
        state.animation = 0;
        startButton.disabled = false;
        changeCameraButton.disabled = false;
        stopButton.disabled = false;
        status("⚠️ Pelayar atau sistem telah menghentikan kamera. Tekan Mula Kamera Selfie untuk sambung semula.");
        setDiagnostic("Camera track ended unexpectedly. Label: " + (track.label || "unknown") +
          "; readyState: " + track.readyState +
          "; visibility: " + document.visibilityState +
          "; browser: " + navigator.userAgent);
      });
    }
    const detected = track && track.getSettings && track.getSettings().facingMode;
    const expectation = selected === "front" ? "user" : selected === "rear" ? "environment" : "";
    if (expectation && detected && detected !== expectation) {
      status("⚠️ Kamera terbuka, tetapi pelayar memilih kamera lain. Pilih nama kamera yang betul dalam menu Kamera.");
    }
    return stream;
  }
  async function changeCamera() {
    if (state.loading || state.cameraChange) return;
    state.cameraChange = true;
    changeCameraButton.disabled = true;
    const ready = state.active;
    status("🔄 Menukar kamera...");
    try {
      await attachSelectedCamera();
      status(ready ? "✅ Kamera ditukar! Gesture Flip sedia digunakan."
        : "✅ Kamera ditukar. Tekan Mula Kamera Selfie untuk cuba memuatkan model gestur.");
    } catch (error) {
      state.active = false;
      if (state.animation) cancelAnimationFrame(state.animation);
      state.animation = 0;
      setDiagnostic("Pertukaran kamera gagal: " + errText(error));
      status("❌ Tidak dapat menukar kamera. Sila pilih kamera lain.");
      startButton.disabled = false;
      stopButton.disabled = !state.stream;
    } finally {
      state.cameraChange = false;
      changeCameraButton.disabled = !state.stream;
    }
  }

  async function start() {
    if (state.active || state.loading) return;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status("Kamera memerlukan HTTPS atau localhost. Buka laman GitHub Pages secara terus dalam Chrome atau Edge.");
      setDiagnostic("Konteks selamat: " + window.isSecureContext +
        "; mediaDevices: " + !!navigator.mediaDevices +
        "; URL: " + location.origin + "; browser: " + navigator.userAgent);
      return;
    }
    state.loading = true;
    state.lastErrorPhase = "";
    startButton.disabled = true;
    let phase = "camera";
    status("Langkah 1/4: Meminta kebenaran kamera…");
    setDiagnostic("Langkah 1: menunggu kamera. Tiada bingkai video disimpan atau dihantar.");
    try {
      if (state.stream && state.stream.active && video.srcObject === state.stream) {
        // Keep the selfie preview running when retrying the AI model.
        if (document.visibilityState === "visible") {
          state.stream.getVideoTracks().forEach(track => { track.enabled = true; });
        }
        await video.play();
      } else {
        await attachSelectedCamera();
      }
      stopButton.disabled = false;
      changeCameraButton.disabled = false;
      status("✅ Kamera aktif! Langkah 2/4: Memuat pustaka MediaPipe…");
      setDiagnostic("Kamera OK. Jika AI gagal, ini masalah model/CDN dan bukan kamera.");
      phase = "library";
      const loaded = await importVision();
      status("✅ Kamera dan pustaka OK. Langkah 3/4: Menyediakan WebAssembly…");
      setDiagnostic("Pustaka: " + loaded.api.HandLandmarker.name + "; sumber: " + state.libraryOrigin);
      phase = "wasm";
      const files = await loaded.api.FilesetResolver.forVisionTasks(loaded.wasm);
      status("✅ WebAssembly tersedia. Langkah 4/4: Memuat model pengecaman tangan…");
      phase = "model";
      state.landmarker = await loaded.api.HandLandmarker.createFromOptions(files, {
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
      startButton.disabled = true;
      stopButton.disabled = false;
      setDiagnostic("OK: kamera, pustaka MediaPipe, WebAssembly dan model. Versi " + state.loadedVersion +
        "; peranti: " + navigator.userAgent);
      status("✅ Gesture Flip sedia! Sapu tangan ke kiri / kanan untuk membalik halaman.");
      loop();
    } catch (error) {
      state.lastErrorPhase = phase;
      const details = "Peringkat: " + phase + "; " + trimMessage(errText(error)) +
        "; halaman: " + location.origin +
        "; MediaPipe: " + VERSION +
        "; sumber: " + (state.libraryOrigin || "belum dimuat") +
        "; browser: " + navigator.userAgent;
      setDiagnostic(details);
      console.error("Ice Age gesture initialization (" + phase + "):", error);
      if (phase === "camera") {
        stop();
        const name = error && error.name || "";
        const advice = name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Kebenaran kamera ditolak. Benarkan kamera untuk laman ini dalam tetapan pelayar."
          : name === "NotFoundError"
            ? "Tiada kamera ditemui. Sambungkan kamera dan cuba lagi."
            : name === "NotReadableError"
              ? "Kamera sedang digunakan aplikasi lain. Tutup Zoom/Teams atau aplikasi kamera."
              : "Kamera gagal diakses. Sila semak HTTPS, kebenaran dan sambungan peranti.";
        status("❌ Langkah kamera gagal: " + advice);
      } else {
        // Keep the working webcam preview visible so an AI model failure is not mistaken for a camera failure.
        state.active = false;
        if (state.landmarker) { try { state.landmarker.close(); } catch (_) {} }
        state.landmarker = null;
        startButton.disabled = false;
        stopButton.disabled = false;
        changeCameraButton.disabled = false;
        const advice = phase === "library"
          ? "Pustaka MediaPipe gagal dimuat. Cuba internet lain, matikan sekatan CDN, atau lihat Diagnostik."
          : phase === "wasm"
            ? "WebAssembly MediaPipe gagal dimuat. Semak sambungan dan sekatan fail .wasm."
            : "Model tangan gagal dimuat. Semak akses ke storage.googleapis.com.";
        status("⚠️ Kamera OK, tetapi Gesture Flip belum siap. " + advice);
      }
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
        // A gesture-model crash must never close the pupil's selfie camera.
        state.active = false;
        state.start = null;
        state.pinchAt = 0;
        state.pinchLatched = false;
        if (state.landmarker) {
          try { state.landmarker.close(); } catch (_) {}
        }
        state.landmarker = null;
        state.animation = 0;
        startButton.disabled = false;
        stopButton.disabled = !state.stream;
        changeCameraButton.disabled = !state.stream;
        setDiagnostic("Peringkat: tracking; " + trimMessage(errText(error)) +
          "; webcam: " + (state.stream && state.stream.active ? "active" : "inactive") +
          "; browser: " + navigator.userAgent);
        status("⚠️ Kamera selfie masih terbuka. Pengecaman gestur terganggu; tekan Mula Kamera Selfie untuk cuba semula.");
        console.error("MediaPipe detection:", error);
        return;
      }
    }
    state.animation = requestAnimationFrame(loop);
  }

  startButton.addEventListener("click", start);
  changeCameraButton.addEventListener("click", changeCamera);
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
    if (!state.stream) return;
    if (document.hidden) {
      // Do not stop the stream on mobile: permission prompts and temporary tab
      // switches may cause visibilitychange even when the user did not press Stop.
      state.stream.getVideoTracks().forEach(track => {
        if (track.readyState === "live") track.enabled = false;
      });
      state.start = null;
      status("⏸ Kamera selfie dijeda sementara tab tidak aktif. Kembali ke tab untuk sambung.");
    } else {
      const tracks = state.stream.getVideoTracks();
      const live = tracks.some(track => track.readyState === "live");
      if (live) {
        tracks.forEach(track => { if (track.readyState === "live") track.enabled = true; });
        video.play().catch(error => {
          setDiagnostic("Video resume failed: " + errText(error));
          status("⚠️ Tekan pada skrin, kemudian cuba Mula Kamera Selfie semula.");
        });
        status(state.active ? "✅ Kamera selfie disambung. Gesture Flip aktif."
          : "✅ Kamera selfie disambung. Jika perlu, tekan Mula Kamera Selfie untuk aktifkan AI.");
      } else {
        state.active = false;
        if (state.animation) cancelAnimationFrame(state.animation);
        state.animation = 0;
        startButton.disabled = false;
        status("⚠️ Sistem telah menghentikan kamera di latar belakang. Tekan Mula Kamera Selfie untuk sambung.");
      }
    }
  });
  // Camera is fully released when leaving the site or pressing Stop, never just because
  // visibility changed while the user is still on the same page.
  window.addEventListener("pagehide", stop);
  el("copyGestureError").addEventListener("click", async () => {
    const message = state.lastDiagnostic || el("gestureStatus").textContent;
    try {
      await navigator.clipboard.writeText(message);
      status("📋 Diagnostik disalin. Boleh tampal dalam perbualan ChatGPT.");
    } catch (_) {
      prompt("Salin teks diagnostik ini:", message);
    }
  });
  window.IceGesture = { toggle, show, stop, changeCamera };
})();