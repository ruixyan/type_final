// P5.js Noise Background
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
    fill(245, 245, 245); // #f5f5f5
    setResolution();
}

function draw() {
    background(8, 8, 8); // #080808
    
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