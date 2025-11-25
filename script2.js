const video = document.getElementById("webcam");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const BASE_FONT_SIZE = 320;
let currentLetter = "A";

// 6 fonts
const FONT_NAMES = [
  "FontRegular",
  "Font20",
  "Font40",
  "Font60",
  "Font80",
  "Font100"
];

const FONT_URLS = [
  "fonts/ruixyan-test-Regular.ttf",
  "fonts/ruixyan-test-DIST20.ttf",
  "fonts/ruixyan-test-DIST40.ttf",
  "fonts/ruixyan-test-DIST60.ttf",
  "fonts/ruixyan-test-DIST80.ttf",
  "fonts/ruixyan-test-DIST100.ttf"
];

async function loadAllFonts() {
  for (let i = 0; i < FONT_NAMES.length; i++) {
    const face = new FontFace(FONT_NAMES[i], `url(${FONT_URLS[i]})`);
    await face.load();
    document.fonts.add(face);
  }
  console.log("All fonts loaded!");
}

// === Create alphabet grid ===
const alphabetGrid = document.getElementById("alphabet-grid");
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
  const btn = document.createElement("button");
  btn.textContent = letter;
  btn.className = "letter-btn";
  btn.addEventListener("click", () => (currentLetter = letter));
  alphabetGrid.appendChild(btn);
});

// ==== FONT RANGE SELECTION (1–100) ====
function pickFontFromValue(v) {
  if (v <= 20) return FONT_NAMES[0];   // Regular
  if (v <= 40) return FONT_NAMES[1];   // DIST20
  if (v <= 60) return FONT_NAMES[2];   // DIST40
  if (v <= 80) return FONT_NAMES[3];   // DIST60
  if (v <= 90) return FONT_NAMES[4];   // DIST80
  return FONT_NAMES[5];                // DIST100
}

// ==== HANDS SETUP ====
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

let fontSelectorValue = 1; // 1–100

hands.onResults((results) => {
  if (!video.videoWidth || !video.videoHeight) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // detect pinch → distance → value 1–100
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    const thumb = lm[4];
    const index = lm[8];

    const thumbX = thumb.x * canvas.width;
    const thumbY = thumb.y * canvas.height;
    const indexX = index.x * canvas.width;
    const indexY = index.y * canvas.height;

    const distance = Math.hypot(indexX - thumbX, indexY - thumbY);

    // visualize
    ctx.beginPath();
    ctx.moveTo(thumbX, thumbY);
    ctx.lineTo(indexX, indexY);
    ctx.strokeStyle = "#00FF88";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 8, 0, Math.PI * 2);
    ctx.arc(indexX, indexY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#00FF88";
    ctx.fill();

    // convert distance → 1–100
    fontSelectorValue = Math.min(100, Math.max(1, distance * 2));
  }

  // pick font for drawing
  const activeFont = pickFontFromValue(fontSelectorValue);

  // draw letter
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  ctx.font = `${BASE_FONT_SIZE}px "${activeFont}"`;
  ctx.fillText(currentLetter, canvas.width / 2, canvas.height / 2);

  ctx.restore();
});

// ==== CAMERA ====
async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await new Promise((resolve) => (video.onloadedmetadata = resolve));

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const camera = new Camera(video, {
    onFrame: async () => await hands.send({ image: video }),
    width: video.videoWidth,
    height: video.videoHeight,
  });
  camera.start();
}

// ==== START ====
(async () => {
  await loadAllFonts();
  await initCamera();
})();
