import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

// Gesture Control State
let landmarker = null;
let video = document.getElementById('gesture-video');
let cursor = document.getElementById('gesture-cursor');
let cursorDot = cursor.querySelector('.gesture-cursor-dot');
let cursorLabel = cursor.querySelector('.gesture-cursor-label');
let widget = document.getElementById('gesture-widget');
let loading = document.getElementById('gesture-loading');
let error = document.getElementById('gesture-error');
let statusDot = document.querySelector('.gesture-status-dot');
let statusText = document.getElementById('gesture-status-text');
let minimizeBtn = document.getElementById('gesture-minimize-btn');

let gestureState = {
    isHandDetected: false,
    isPinching: false,
    cursorX: 0.5,
    cursorY: 0.5
};

let lastPinchY = null;
let isMinimized = false;
let pinchStartTime = null;
let pinchStartY = null;
let hasMovedWhilePinching = false;
let activeSlider = null;
let lastSliderValue = null;
let dwellElement = null;
let dwellStartTime = null;
let dwellTimeout = null;

// Canvas overlay for drawing landmarks
let canvas = null;
let ctx = null;

// Initialize MediaPipe
async function init() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        await startCamera();
    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        error.style.display = 'flex';
        error.querySelector('span').textContent = 'Failed to initialize';
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" }
        });

        video.srcObject = stream;
        video.onloadeddata = () => {
            loading.style.display = 'none';
            video.classList.remove('hidden');
            
            // Create canvas overlay for landmarks
            createLandmarkCanvas();
            
            predictWebcam();
        };
    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        error.style.display = 'flex';
    }
}

function createLandmarkCanvas() {
    canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        transform: scaleX(-1);
    `;
    
    ctx = canvas.getContext('2d');
    video.parentElement.appendChild(canvas);
}

function predictWebcam() {
    if (!landmarker || !video) return;

    const nowInMs = Date.now();
    const results = landmarker.detectForVideo(video, nowInMs);
    
    processGesture(results);
    requestAnimationFrame(predictWebcam);
}

function processGesture(results) {
    // Clear canvas
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    if (!results.landmarks || results.landmarks.length === 0) {
        gestureState.isHandDetected = false;
        gestureState.isPinching = false;
        lastPinchY = null;
        activeSlider = null;
        lastSliderValue = null;
        resetDwell();
        
        // Hide help popup when no hand detected
        if (window.gestureHoverHelp) {
            window.gestureHoverHelp(false);
        }
        
        updateUI();
        return;
    }

    // Process each detected hand
    for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handednesses[i][0].categoryName; // "Left" or "Right"
        
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Calculate pinch distance
        const distance = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) + 
            Math.pow(indexTip.y - thumbTip.y, 2)
        );

        const PINCH_THRESHOLD = 0.06;
        const isPinching = distance < PINCH_THRESHOLD;

        // Flip X for mirror
        const rawX = 1 - indexTip.x;
        const rawY = indexTip.y;

        if (handedness === "Right") {
            // RIGHT HAND: Draw index finger dot
            drawLandmark(indexTip, '#10b981', 8);
            
            // RIGHT HAND: Cursor, Pinch to Scroll, Dwell to Click
            gestureState.isHandDetected = true;
            gestureState.isPinching = isPinching;
            gestureState.cursorX += (rawX - gestureState.cursorX) * 0.2;
            gestureState.cursorY += (rawY - gestureState.cursorY) * 0.2;

            // Check if hovering over help button (instant show, no click)
            checkHelpButtonHover(gestureState.cursorX, gestureState.cursorY);

            // Scroll logic
            if (isPinching) {
                if (lastPinchY === null) {
                    // Just started pinching
                    lastPinchY = rawY;
                    pinchStartTime = Date.now();
                    pinchStartY = rawY;
                    hasMovedWhilePinching = false;
                } else {
                    const deltaY = rawY - lastPinchY;
                    const totalMovement = Math.abs(rawY - pinchStartY);
                    
                    // Track if significant movement occurred
                    if (totalMovement > 0.03) {
                        hasMovedWhilePinching = true;
                    }
                    
                    const SENSITIVITY = 2500;
                    window.scrollBy({
                        top: deltaY * SENSITIVITY,
                        behavior: 'auto'
                    });
                    lastPinchY = rawY;
                }
                
                // Reset dwell while pinching
                resetDwell();
            } else {
                // Not pinching - check for dwell click
                lastPinchY = null;
                pinchStartTime = null;
                pinchStartY = null;
                hasMovedWhilePinching = false;
                
                handleDwellClick(gestureState.cursorX, gestureState.cursorY);
            }

        } else if (handedness === "Left") {
            // LEFT HAND: Draw index, thumb, and connecting line
            drawLandmark(indexTip, '#f59e0b', 8);
            drawLandmark(thumbTip, '#f59e0b', 8);
            drawLine(indexTip, thumbTip, '#f59e0b', 3);
            
            // LEFT HAND: Slider Control
            handleSliderControl(rawX, rawY, distance);
        }
    }

    updateUI();
}

function drawLandmark(landmark, color, size) {
    if (!ctx || !canvas) return;
    
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
}

function drawLine(point1, point2, color, width) {
    if (!ctx || !canvas) return;
    
    const x1 = point1.x * canvas.width;
    const y1 = point1.y * canvas.height;
    const x2 = point2.x * canvas.width;
    const y2 = point2.y * canvas.height;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function checkHelpButtonHover(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const helpBtn = document.getElementById('help-btn');
    if (!helpBtn) {
        console.log('Help button not found');
        return;
    }
    
    const helpRect = helpBtn.getBoundingClientRect();
    const isOverHelp = (
        x >= helpRect.left && 
        x <= helpRect.right && 
        y >= helpRect.top && 
        y <= helpRect.bottom
    );
    
    if (isOverHelp) {
        console.log('Cursor over help button!', x, y);
    }
    
    // Instantly show/hide popup on hover
    if (window.gestureHoverHelp) {
        window.gestureHoverHelp(isOverHelp);
    } else {
        console.log('window.gestureHoverHelp not available');
    }
}

function handleSliderControl(cursorX, cursorY, pinchDistance) {
    const handX = cursorX * window.innerWidth;
    const handY = cursorY * window.innerHeight;
    
    // Find the section containing the hand position
    const hoveredElement = document.elementFromPoint(handX, handY);
    if (!hoveredElement) return;
    
    // Find the closest parent that contains a slider
    const section = hoveredElement.closest('.font-item, .paragraph-item');
    if (!section) {
        activeSlider = null;
        return;
    }
    
    // Find the slider within this section
    const slider = section.querySelector('.size-slider');
    if (!slider) {
        activeSlider = null;
        return;
    }
    
    activeSlider = slider;
    
    // Map pinch distance to slider value
    const minDist = 0.03;
    const maxDist = 0.20;
    const clampedDist = Math.max(minDist, Math.min(maxDist, pinchDistance));
    const normalizedDist = (clampedDist - minDist) / (maxDist - minDist);
    
    console.log('Left hand - Updating slider in section. Distance:', pinchDistance.toFixed(3), 'Normalized:', normalizedDist.toFixed(2));
    
    // Update the slider
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const newValue = min + (normalizedDist * (max - min));
    
    slider.value = Math.round(newValue);
    
    // Trigger input event to update the display
    const event = new Event('input', { bubbles: true });
    slider.dispatchEvent(event);
    
    // Visual feedback at hand position
    createSliderFeedback(handX, handY);
}

function createSliderFeedback(x, y) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        background: #10b981;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.8;
    `;
    
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 200);
}

function handleDwellClick(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const element = document.elementFromPoint(x, y);
    
    // Skip dwell click for hover-only elements (like help button)
    if (element && element.classList.contains('gesture-hover-only')) {
        resetDwell();
        return;
    }
    
    // Check if element is clickable
    const isClickable = element && (
        element.tagName === 'A' ||
        element.tagName === 'BUTTON' ||
        element.onclick ||
        element.classList.contains('size-slider') ||
        element.closest('a') ||
        element.closest('button')
    );
    
    if (isClickable) {
        const targetElement = element.closest('a') || element.closest('button') || element;
        
        // Skip if it's a hover-only element
        if (targetElement.classList.contains('gesture-hover-only')) {
            resetDwell();
            return;
        }
        
        // Same element as before
        if (dwellElement === targetElement) {
            const dwellTime = Date.now() - dwellStartTime;
            const progress = Math.min(dwellTime / 1500, 1); // 1.5 seconds
            
            // Update progress indicator
            updateDwellProgress(x, y, progress);
            
            if (dwellTime >= 1500 && !dwellTimeout) {
                // Click after 1.5 seconds
                dwellTimeout = true;
                performClick(normalizedX, normalizedY);
                setTimeout(() => {
                    resetDwell();
                }, 500);
            }
        } else {
            // New element - start dwell timer
            resetDwell();
            dwellElement = targetElement;
            dwellStartTime = Date.now();
        }
    } else {
        resetDwell();
    }
}

function resetDwell() {
    dwellElement = null;
    dwellStartTime = null;
    dwellTimeout = null;
    
    // Remove any progress indicator
    const existing = document.getElementById('dwell-progress');
    if (existing) existing.remove();
}

function updateDwellProgress(x, y, progress) {
    let progressRing = document.getElementById('dwell-progress');
    
    if (!progressRing) {
        progressRing = document.createElement('div');
        progressRing.id = 'dwell-progress';
        document.body.appendChild(progressRing);
    }
    
    const size = 50;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress * circumference);
    
    progressRing.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        margin: -${size/2}px 0 0 -${size/2}px;
        pointer-events: none;
        z-index: 9999;
    `;
    
    progressRing.innerHTML = `
        <svg width="${size}" height="${size}" style="transform: rotate(-90deg);">
            <circle
                cx="${size/2}"
                cy="${size/2}"
                r="${radius}"
                stroke="#10b981"
                stroke-width="${strokeWidth}"
                fill="none"
                opacity="0.3"
                mix-blend-mode="difference"
            />
            <circle
                cx="${size/2}"
                cy="${size/2}"
                r="${radius}"
                stroke="#10b981"
                stroke-width="${strokeWidth}"
                fill="none"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                mix-blend-mode="difference"
            />
        </svg>
    `;
}

function performClick(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const element = document.elementFromPoint(x, y);
    
    if (element) {
        createClickFeedback(x, y);
        element.click();
        console.log('Gesture clicked:', element);
    }
}

function createClickFeedback(x, y) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #10b981;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        animation: ripple 0.6s ease-out;
    `;
    
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function updateUI() {
    // Cursor
    if (gestureState.isHandDetected) {
        cursor.classList.add('visible');
        cursor.style.left = `${gestureState.cursorX * 100}%`;
        cursor.style.top = `${gestureState.cursorY * 100}%`;
        
        if (gestureState.isPinching) {
            cursorDot.classList.add('pinching');
            cursorLabel.classList.add('visible');
        } else {
            cursorDot.classList.remove('pinching');
            cursorLabel.classList.remove('visible');
        }
    } else {
        cursor.classList.remove('visible');
    }

    // Status
    if (gestureState.isHandDetected) {
        statusDot.classList.add('active');
        if (activeSlider) {
            statusText.textContent = 'Left Hand | SLIDERS';
        } else if (gestureState.isPinching) {
            statusText.textContent = 'Right Hand | PINCH & DRAG';
        } else if (dwellElement) {
            const elapsed = Date.now() - dwellStartTime;
            const remaining = Math.max(0, Math.ceil((1500 - elapsed) / 1000 * 10) / 10);
            statusText.textContent = `Clicking in ${remaining.toFixed(1)}s`;
        } else {
            statusText.textContent = 'Hand detected (PINCH)';
        }
    } else {
        statusDot.classList.remove('active');
        statusText.textContent = 'Raise hand';
    }
}

// Minimize button
minimizeBtn.onclick = () => {
    isMinimized = !isMinimized;
    if (isMinimized) {
        widget.classList.add('minimized');
        minimizeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    } else {
        widget.classList.remove('minimized');
        minimizeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';
    }
};

// Start
init();