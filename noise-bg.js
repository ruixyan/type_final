let baseCols = 300;
let cols;
let zoom = 0.02;
let speed = 0.004;
let threshold = 0.5;

let mouseRadius = 200;
let mouseStrength = 0.18;

let canvas;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('hero');
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  pixelDensity(1);
  noiseDetail(4, 0.5);
  noStroke();
  fill(245, 245, 245); // Changed to #f5f5f5

  setResolution();
}

function draw() {
  background(8, 8, 8); // Changed to #080808

  const rows = round(cols * (height / width));
  const cellW = width / cols;
  const cellH = height / rows;

  let inputX = mouseX;
  let inputY = mouseY;
  if (touches.length > 0) {
    inputX = touches[0].x;
    inputY = touches[0].y;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let px = x * cellW;
      let py = y * cellH;

      let d = dist(inputX, inputY, px, py);
      let influence = (d < mouseRadius) ? map(d, 0, mouseRadius, mouseStrength, 0) : 0;
      let localThreshold = threshold - influence;

      let current = noise(x * zoom, y * zoom, frameCount * speed) > localThreshold;
      if (current) rect(int(px), int(py), ceil(cellW), ceil(cellH));
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setResolution();
}

function setResolution() {
  if (windowWidth <= 500) cols = round(baseCols * 0.28);
  else if (windowWidth <= 900) cols = round(baseCols * 0.55);
  else cols = baseCols;
}

// Fonts you want to cycle
const fonts = [
    '"DIST-100", sans-serif',
    '"DIST-20", sans-serif',
    '"DIST-40", sans-serif',
    '"DIST-60", sans-serif',
    '"DIST-80", sans-serif',

  ];
  
  const heroText = document.getElementById('heroText');
let letters = [];

// Wrap each letter in a span
function wrapLetters() {
  const text = heroText.textContent;
  heroText.innerHTML = '';
  letters = [];
  for (let char of text) {
    const span = document.createElement('span');
    span.textContent = char;
    heroText.appendChild(span);
    letters.push(span);
  }
}

wrapLetters();

// Staggered font changes
letters.forEach((span, i) => {
  const interval = 300;        // how often fonts change
  const offset = i * 100;      // time offset per letter

  setInterval(() => {
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    span.style.fontFamily = randomFont;
  }, interval + offset);
});
  

const sliders = document.querySelectorAll('.size-slider');
const textInput = document.getElementById('text-input');
const fontDisplays = document.querySelectorAll('.font-display');

// Handle all sliders (both font-display and paragraph-display)
sliders.forEach((slider) => {
    slider.addEventListener('input', function() {
        const targetId = this.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        
        // Find the corresponding value display
        // Extract number from targetId (e.g., "font-1" or "para-1")
        let valueDisplayId;
        if (targetId.startsWith('para-')) {
            valueDisplayId = 'para-value-' + targetId.split('-')[1];
        } else {
            valueDisplayId = 'value-' + targetId.split('-')[1];
        }
        
        const valueDisplay = document.getElementById(valueDisplayId);
        
        const size = this.value;
        targetElement.style.fontSize = size + 'px';
        if (valueDisplay) {
            valueDisplay.textContent = size + 'px';
        }
    });
});

// Handle text input if it exists
if (textInput) {
    textInput.addEventListener('input', function() {
        const text = this.value || 'The quick brown fox jumps';
        fontDisplays.forEach(display => {
            display.textContent = text;
        });
    });
}