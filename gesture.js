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
    lastDiagnostic: "", libraryOrigin: "", loadedVersion: "", lastErrorPhase: "", cameraChange: false, cameraVersion: 0,
    grab: null, gestureCooldown: 0, noHandFrames: 0, releaseFrames: 0
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
    "#gestureGuide{margin:8px 0;padding:10px;border-radius:12px;background:#e6f5fe;color:#15537c}" +
    "#gestureMeter{height:9px;border-radius:20px;background:#b8ddef;overflow:hidden;margin:7px 0}" +
    "#gestureMeterFill{height:100%;width:0;background:linear-gradient(90deg,#6bbad9,#36a976);transition:width 70ms linear}" +
    "@media(max-width:600px){#gesturePanel{right:7px;bottom:7px;width:calc(100vw - 14px);max-height:85vh;overflow:auto}}";
  document.head.appendChild(css);

  const panel = document.createElement("section");
  panel.id = "gesturePanel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Panel kawalan gestur kamera");
  panel.innerHTML =
    '<div class="gesture-top"><strong>✋ Mod Gestur Tangan</strong><button id="closeGesturePanel" class="secondary" aria-label="Tutup panel">✕</button></div>' +
    '<p class="gesture-hint">📖 <b>Cara selak buku:</b> Rapatkan ibu jari dan telunjuk seperti mencubit pada <b>sebelah kanan</b> kamera, gerakkan tangan ke <b>kiri</b> sambil terus mencubit, kemudian <b>lepaskan jari</b>. Untuk halaman sebelumnya, mula di sebelah kiri dan seret ke kanan. Di rak buku, cubit untuk membuka buku.</p>' +
    '<p class="gesture-hint">Kamera hanya aktif selepas anda menekan Mula Kamera. Video diproses pada peranti; laman ini tidak merakam atau memuat naik video. Model dan pustaka dimuat turun melalui internet.</p>' +
    '<video id="gestureVideo" autoplay playsinline muted aria-label="Pratonton kamera" style="transform:scaleX(-1)"></video>' +
    '<div id="gestureGuide" role="status" aria-live="polite">✋ Tunjukkan tangan. Cubit di sebelah kanan untuk mencengkam halaman.</div>' +
    '<div id="gestureMeter"><div id="gestureMeterFill"></div></div>' +
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
    // Downloaded by GitHub Actions at build time, served from this same GitHub Pages origin.
    const siteRoot = new URL("./", location.href);
    const base = new URL("vendor/mediapipe/", siteRoot);
    const moduleUrl = new URL("vision_bundle.mjs", base).href;
    const api = await import(moduleUrl);
    if (!api || !api.FilesetResolver || !api.HandLandmarker) {
      throw new Error("Pustaka MediaPipe yang diterbitkan tidak lengkap: " + moduleUrl);
    }
    state.libraryOrigin = moduleUrl;
    state.loadedVersion = VERSION;
    return { api, wasm: new URL("wasm", base).href,
      model: new URL("models/hand_landmarker.task", base).href };
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
    cancelGesture();
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
    cancelGesture();
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
        baseOptions: { modelAssetPath: loaded.model, delegate: "CPU" },
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
          ? "Fail MediaPipe belum tersedia di laman ini. Semak status deploy GitHub Actions."
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
  function gestureHint(message, progress) {
    const guide = el("gestureGuide");
    if (guide && message && guide.textContent !== message) guide.textContent = message;
    const meter = el("gestureMeterFill");
    if (meter && progress !== undefined) {
      meter.style.width = Math.round(Math.max(0,Math.min(1,progress))*100)+"%";
    }
  }
  function cancelGesture() {
    if (state.grab) {
      try { window.IceFlipbook?.finishGesture(false); } catch (error) { console.warn(error); }
    }
    state.grab = null;
    state.releaseFrames = 0;
    gestureHint("✋ Cubit pada sebelah kanan untuk halaman seterusnya; sebelah kiri untuk sebelumnya.",0);
  }
  // Webcam preview is mirrored. x measures the thumb/index pinch point in that preview.
  function process(points, now) {
    if (!Array.isArray(points) || points.length < 21) return;
    const rawX = (points[4].x + points[8].x)*0.5;
    const x = state.mirrored ? 1-rawX : rawX;
    const pinch = isPinching(points);
    state.noHandFrames=0;

    if (shelving()) {
      if (state.grab) cancelGesture();
      highlightBook(x);
      if (pinch) {
        if (!state.pinchAt) state.pinchAt=now;
        if (!state.pinchLatched && now-state.pinchAt>320 && now-state.lastAction>1250) {
          state.pinchLatched=true;state.lastAction=now;state.pinchAt=0;
          clearSelection();
          if (typeof openBook==="function") openBook(state.chosenBook);
          gestureHint("📖 Buku dibuka! Cubit di kanan, seret ke kiri dan lepaskan.",0);
        }
      } else {
        state.pinchAt=0;
        state.pinchLatched=false;
      }
      return;
    }
    if (!reading()) {
      if (state.grab) cancelGesture();
      state.start=null;
      return;
    }
    const flip=window.IceFlipbook;
    if (!flip || typeof flip.beginGesture!=="function") {
      gestureHint("⚠️ Komponen selak buku belum dimuat. Muat semula halaman.",0);
      return;
    }

    // Existing grab is tracked across frames, independent of the open-palm swipe system.
    if (state.grab) {
      const grab=state.grab;
      if (!pinch) {
        state.releaseFrames++;
        if(state.releaseFrames<2)return; // avoid a one-frame pinch jitter
        const completed=grab.progress>=0.45;
        flip.finishGesture(completed);
        state.grab=null;
        state.pinchLatched=true; // require open fingers before next grab
        state.gestureCooldown=now+1050;
        state.releaseFrames=0;
        state.start=null;
        gestureHint(completed?"✅ Halaman diselak! Sedia untuk selak lagi.":"↩️ Belum cukup jauh, halaman kembali.",0);
        return;
      }
      state.releaseFrames=0;
      // Pinch left/right stays attached to the page. Opposite movement retracts the page.
      const traveled=grab.direction===1 ? grab.origin-x : x-grab.origin;
      const progress=Math.max(0,Math.min(1,traveled/0.34));
      grab.progress=grab.progress*0.18+progress*0.82;
      flip.moveGesture(grab.progress);
      gestureHint("📖 Halaman dipegang — terus seret, kemudian LEPASKAN jari!",grab.progress);
      return;
    }
    if(!pinch){
      state.pinchLatched=false;
      state.pinchAt=0;
      state.releaseFrames=0;
      return;
    }
    if(state.pinchLatched||now<state.gestureCooldown||flip.isBusy())return;
    // Start near the visible book's page corner. Right side -> next, left side -> previous.
    const direction=x>=0.54?1:x<=0.46?-1:0;
    if(!direction){
      gestureHint("↔️ Alihkan tangan ke sebelah kanan atau kiri sebelum mencubit.",0);
      return;
    }
    if(!flip.canTurn(direction)){
      gestureHint(direction===1?"📕 Ini halaman terakhir.":"📕 Ini halaman pertama.",0);
      return;
    }
    if(!state.pinchAt)state.pinchAt=now;
    if(now-state.pinchAt<140)return;
    if(flip.beginGesture(direction)){
      state.grab={origin:x,direction,progress:0};
      state.releaseFrames=0;
      state.start=null;
      gestureHint(direction===1?"✊ Halaman dicengkam! Gerakkan tangan ke kiri.":"✊ Halaman dicengkam! Gerakkan tangan ke kanan.",0);
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
          state.noHandFrames++;
          if(state.grab && state.noHandFrames>8) {
            cancelGesture();
            state.gestureCooldown=now+800;
          }
          state.start = null;
          state.pinchAt = 0;
          if (!state.grab) state.pinchLatched = false;
          clearSelection();
        }
      } catch (error) {
        cancelGesture();
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
    cancelGesture();
  });
  document.addEventListener("visibilitychange", () => {
    if (!state.stream) return;
    if (document.hidden) {
      cancelGesture();
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