"use strict";

// ---------- Tab switching ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// The canvas "screens" are a fixed dark CRT tube in both page themes, so
// their drawing colors are read once from the (theme-invariant) tokens.
const rootStyle = getComputedStyle(document.documentElement);
const cssVar = (name) => rootStyle.getPropertyValue(name).trim();
const SCREEN_GRID = cssVar("--screen-grid") || "rgba(255,255,255,0.06)";
const SCREEN_MID = cssVar("--screen-mid") || "rgba(255,255,255,0.14)";
const ACCENT = cssVar("--accent") || "#e8a33d";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function drawScreenGrid(ctx, w, h, step = 30) {
  ctx.strokeStyle = SCREEN_GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
}

// ============================================================
// Sine Wave Merger
// ============================================================
const WAVE_COLORS = ["#5b8def", "#ef7d63", "#4fb286", "#c98bdb", "#e0c34f", "#63c2d6"];

const waveMerger = {
  waves: [],
  nextId: 0,
  time: 0,
  inputsCanvas: document.getElementById("inputsCanvas"),
  outputCanvas: document.getElementById("outputCanvas"),
  waveList: document.getElementById("waveList"),

  addWave(amp = 0.6, freq = 2, phase = 0) {
    const id = this.nextId++;
    const color = WAVE_COLORS[id % WAVE_COLORS.length];
    this.waves.push({ id, amp, freq, phase, color });
    this.renderControls();
  },

  removeWave(id) {
    this.waves = this.waves.filter((w) => w.id !== id);
    this.renderControls();
  },

  renderControls() {
    this.waveList.innerHTML = "";
    for (const w of this.waves) {
      const row = document.createElement("div");
      row.className = "wave-row";
      row.innerHTML = `
        <span class="swatch" style="background:${w.color}"></span>
        <label>Amplitude: <span data-role="ampVal">${w.amp.toFixed(2)}</span>
          <input type="range" min="0" max="1" step="0.01" value="${w.amp}" data-role="amp">
        </label>
        <label>Frequency: <span data-role="freqVal">${w.freq.toFixed(1)}</span> Hz
          <input type="range" min="0.2" max="10" step="0.1" value="${w.freq}" data-role="freq">
        </label>
        <label>Phase: <span data-role="phaseVal">${w.phase.toFixed(2)}</span> rad
          <input type="range" min="0" max="6.28" step="0.01" value="${w.phase}" data-role="phase">
        </label>
        <button class="secondary" data-role="remove">Remove</button>
      `;
      row.querySelector('[data-role="amp"]').addEventListener("input", (e) => {
        w.amp = parseFloat(e.target.value);
        row.querySelector('[data-role="ampVal"]').textContent = w.amp.toFixed(2);
      });
      row.querySelector('[data-role="freq"]').addEventListener("input", (e) => {
        w.freq = parseFloat(e.target.value);
        row.querySelector('[data-role="freqVal"]').textContent = w.freq.toFixed(1);
      });
      row.querySelector('[data-role="phase"]').addEventListener("input", (e) => {
        w.phase = parseFloat(e.target.value);
        row.querySelector('[data-role="phaseVal"]').textContent = w.phase.toFixed(2);
      });
      row.querySelector('[data-role="remove"]').addEventListener("click", () => this.removeWave(w.id));
      this.waveList.appendChild(row);
    }
  },

  sampleAt(x, width) {
    // x in [0, width) -> fraction of two full cycles baseline scaled by freq
    const t = x / width;
    let sum = 0;
    for (const w of this.waves) {
      sum += w.amp * Math.sin(2 * Math.PI * w.freq * t + w.phase + this.time);
    }
    return sum;
  },

  draw() {
    const inCtx = this.inputsCanvas.getContext("2d");
    const outCtx = this.outputCanvas.getContext("2d");
    const iw = this.inputsCanvas.width, ih = this.inputsCanvas.height;
    const ow = this.outputCanvas.width, oh = this.outputCanvas.height;

    inCtx.clearRect(0, 0, iw, ih);
    outCtx.clearRect(0, 0, ow, oh);

    drawScreenGrid(inCtx, iw, ih);
    drawScreenGrid(outCtx, ow, oh);

    // midlines
    inCtx.strokeStyle = SCREEN_MID;
    inCtx.beginPath();
    inCtx.moveTo(0, ih / 2);
    inCtx.lineTo(iw, ih / 2);
    inCtx.stroke();
    outCtx.strokeStyle = SCREEN_MID;
    outCtx.beginPath();
    outCtx.moveTo(0, oh / 2);
    outCtx.lineTo(ow, oh / 2);
    outCtx.stroke();

    if (this.waves.length === 0) return;

    const inAmpScale = ih / 2 - 10;
    for (const w of this.waves) {
      inCtx.strokeStyle = w.color;
      inCtx.lineWidth = 1.5;
      inCtx.beginPath();
      for (let x = 0; x <= iw; x++) {
        const t = x / iw;
        const y = ih / 2 - w.amp * Math.sin(2 * Math.PI * w.freq * t + w.phase + this.time) * inAmpScale;
        if (x === 0) inCtx.moveTo(x, y); else inCtx.lineTo(x, y);
      }
      inCtx.stroke();
    }

    const maxSum = Math.max(1, this.waves.reduce((s, w) => s + w.amp, 0));
    const outAmpScale = (oh / 2 - 10) / maxSum;
    outCtx.strokeStyle = ACCENT;
    outCtx.lineWidth = 2;
    outCtx.beginPath();
    for (let x = 0; x <= ow; x++) {
      const y = oh / 2 - this.sampleAt(x, ow) * outAmpScale;
      if (x === 0) outCtx.moveTo(x, y); else outCtx.lineTo(x, y);
    }
    outCtx.stroke();
  },
};

document.getElementById("addWaveBtn").addEventListener("click", () => {
  waveMerger.addWave(0.5 + Math.random() * 0.4, 1 + Math.random() * 4, Math.random() * Math.PI * 2);
});

waveMerger.addWave(0.7, 1, 0);
waveMerger.addWave(0.4, 3, 1.2);

// ============================================================
// Signature -> Fourier epicycle animation
// ============================================================
const drawCanvas = document.getElementById("drawCanvas");
const fourierCanvas = document.getElementById("fourierCanvas");
const drawCtx = drawCanvas.getContext("2d");
const fourierCtx = fourierCanvas.getContext("2d");
const clearSigBtn = document.getElementById("clearSigBtn");
const computeSigBtn = document.getElementById("computeSigBtn");
const animateSigBtn = document.getElementById("animateSigBtn");
const termsRange = document.getElementById("termsRange");
const termsVal = document.getElementById("termsVal");
const speedRange = document.getElementById("speedRange");
const showCirclesToggle = document.getElementById("showCirclesToggle");

let rawPoints = [];
let drawing = false;

function canvasPoint(evt) {
  const rect = drawCanvas.getBoundingClientRect();
  const scaleX = drawCanvas.width / rect.width;
  const scaleY = drawCanvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

function redrawStroke() {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawScreenGrid(drawCtx, drawCanvas.width, drawCanvas.height, 40);
  if (rawPoints.length < 2) return;
  drawCtx.strokeStyle = "#edf1f7";
  drawCtx.lineWidth = 2.5;
  drawCtx.lineJoin = "round";
  drawCtx.lineCap = "round";
  drawCtx.beginPath();
  drawCtx.moveTo(rawPoints[0].x, rawPoints[0].y);
  for (const p of rawPoints.slice(1)) drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
}

drawCanvas.addEventListener("pointerdown", (e) => {
  drawing = true;
  rawPoints.push(canvasPoint(e));
  animateSigBtn.disabled = true;
  fourierState = null;
});
drawCanvas.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  rawPoints.push(canvasPoint(e));
  redrawStroke();
});
window.addEventListener("pointerup", () => { drawing = false; });

clearSigBtn.addEventListener("click", () => {
  rawPoints = [];
  fourierState = null;
  animateSigBtn.disabled = true;
  if (animId) { cancelAnimationFrame(animId); animId = null; animateSigBtn.textContent = "Animate"; }
  redrawStroke();
  fourierCtx.clearRect(0, 0, fourierCanvas.width, fourierCanvas.height);
  drawScreenGrid(fourierCtx, fourierCanvas.width, fourierCanvas.height, 40);
});

redrawStroke();
drawScreenGrid(fourierCtx, fourierCanvas.width, fourierCanvas.height, 40);

termsRange.addEventListener("input", () => { termsVal.textContent = termsRange.value; });

// Resample a polyline to N evenly spaced points by arc length.
function resamplePath(points, n) {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    dists.push(dists[i - 1] + Math.hypot(dx, dy));
  }
  const total = dists[dists.length - 1];
  if (total === 0) return points.map((p) => ({ ...p }));

  const result = [];
  let seg = 1;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * total;
    while (seg < dists.length - 1 && dists[seg] < target) seg++;
    const d0 = dists[seg - 1], d1 = dists[seg];
    const t = d1 > d0 ? (target - d0) / (d1 - d0) : 0;
    const p0 = points[seg - 1], p1 = points[seg];
    result.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
  }
  return result;
}

// Discrete Fourier Transform of a complex signal, frequencies centered at 0.
function computeDFT(complexPoints) {
  const N = complexPoints.length;
  const coeffs = [];
  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      re += complexPoints[n].re * cos - complexPoints[n].im * sin;
      im += complexPoints[n].re * sin + complexPoints[n].im * cos;
    }
    re /= N;
    im /= N;
    const freq = k < N / 2 ? k : k - N;
    coeffs.push({ freq, re, im, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  coeffs.sort((a, b) => b.amp - a.amp);
  return coeffs;
}

let fourierState = null; // { coeffs, N }
let animId = null;
let animT = 0;
let trail = [];

computeSigBtn.addEventListener("click", () => {
  if (rawPoints.length < 4) {
    alert("Draw a signature first.");
    return;
  }
  const N = 200;
  const resampled = resamplePath(rawPoints, N);
  const cx = resampled.reduce((s, p) => s + p.x, 0) / N;
  const cy = resampled.reduce((s, p) => s + p.y, 0) / N;
  const complexPoints = resampled.map((p) => ({ re: p.x - cx, im: p.y - cy }));
  const coeffs = computeDFT(complexPoints);
  fourierState = { coeffs, N };
  animateSigBtn.disabled = false;
  animT = 0;
  trail = [];
  if (animId) cancelAnimationFrame(animId);
  drawFourierFrame(0);
});

animateSigBtn.addEventListener("click", () => {
  if (!fourierState) return;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
    animateSigBtn.textContent = "Animate";
    return;
  }
  animateSigBtn.textContent = "Stop";
  trail = [];
  animT = 0;
  animLoop();
});

function animLoop() {
  const speed = parseFloat(speedRange.value) / 1000;
  animT += speed;
  if (animT > 1) {
    animT -= 1;
    trail = [];
  }
  drawFourierFrame(animT);
  animId = requestAnimationFrame(animLoop);
}

function drawFourierFrame(t) {
  const { coeffs } = fourierState;
  const terms = Math.min(parseInt(termsRange.value, 10), coeffs.length);
  const cx = fourierCanvas.width / 2;
  const cy = fourierCanvas.height / 2;

  fourierCtx.clearRect(0, 0, fourierCanvas.width, fourierCanvas.height);
  drawScreenGrid(fourierCtx, fourierCanvas.width, fourierCanvas.height, 40);

  let x = cx, y = cy;
  const showCircles = showCirclesToggle.checked;
  for (let i = 0; i < terms; i++) {
    const { freq, amp, phase } = coeffs[i];
    const prevX = x, prevY = y;
    const angle = 2 * Math.PI * freq * t + phase;
    x += amp * Math.cos(angle);
    y += amp * Math.sin(angle);

    if (showCircles && amp > 0.5) {
      fourierCtx.strokeStyle = "rgba(255,255,255,0.18)";
      fourierCtx.lineWidth = 1;
      fourierCtx.beginPath();
      fourierCtx.arc(prevX, prevY, amp, 0, Math.PI * 2);
      fourierCtx.stroke();
    }
    if (showCircles) {
      fourierCtx.strokeStyle = "rgba(237,241,247,0.5)";
      fourierCtx.beginPath();
      fourierCtx.moveTo(prevX, prevY);
      fourierCtx.lineTo(x, y);
      fourierCtx.stroke();
    }
  }

  trail.push({ x, y });
  if (trail.length > 1) {
    fourierCtx.strokeStyle = ACCENT;
    fourierCtx.lineWidth = 2;
    fourierCtx.beginPath();
    fourierCtx.moveTo(trail[0].x, trail[0].y);
    for (const p of trail.slice(1)) fourierCtx.lineTo(p.x, p.y);
    fourierCtx.stroke();
  }

  fourierCtx.fillStyle = "#63c2d6";
  fourierCtx.beginPath();
  fourierCtx.arc(x, y, 3, 0, Math.PI * 2);
  fourierCtx.fill();
}

// ============================================================
// Main render loop (wave merger only; signature animates via its own rAF)
// ============================================================
const animateToggleEl = document.getElementById("animateToggle");
if (prefersReducedMotion) animateToggleEl.checked = false;

function mainLoop() {
  if (animateToggleEl.checked) waveMerger.time += 0.02;
  waveMerger.draw();
  requestAnimationFrame(mainLoop);
}
mainLoop();
