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
let dwellElement = null;
let dwellStartTime = null;
let dwellTimeout = null;
let lastFingerCount = -1;
let fingerCountStableTime = null;
const FINGER_COUNT_STABLE_DURATION = 800;
const DWELL_CLICK_DURATION = 1500; // 1.5 seconds instead of 3

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
            predictWebcam();
        };
    } catch (err) {
        console.error(err);
        loading.style.display = 'none';
        error.style.display = 'flex';
    }
}

function predictWebcam() {
    if (!landmarker || !video) return;

    const nowInMs = Date.now();
    const results = landmarker.detectForVideo(video, nowInMs);
    
    processGesture(results);
    requestAnimationFrame(predictWebcam);
}

function countExtendedFingers(landmarks) {
    const fingers = [
        { tip: 8, pip: 6 },
        { tip: 12, pip: 10 },
        { tip: 16, pip: 14 },
        { tip: 20, pip: 18 }
    ];
    
    let count = 0;
    
    // Check thumb separately - more strict check
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const wrist = landmarks[0];
    
    // Thumb is extended only if tip is significantly farther from palm than MCP joint
    const thumbTipDist = Math.sqrt(
        Math.pow(thumbTip.x - wrist.x, 2) + 
        Math.pow(thumbTip.y - wrist.y, 2)
    );
    const thumbMCPDist = Math.sqrt(
        Math.pow(thumbMCP.x - wrist.x, 2) + 
        Math.pow(thumbMCP.y - wrist.y, 2)
    );
    
    // Thumb must be at least 30% farther from wrist than MCP joint
    if (thumbTipDist > thumbMCPDist * 1.3) {
        count++;
    }
    
    // Check other fingers (vertical extension)
    fingers.forEach(finger => {
        const tipY = landmarks[finger.tip].y;
        const pipY = landmarks[finger.pip].y;
        
        // Finger is extended if tip is significantly above pip joint
        if (tipY < pipY - 0.02) {
            count++;
        }
    });
    
    return count;
}

function switchFontByFingerCount(fingerCount) {
    const fontMap = {
        0: 'font-Hand',
        1: 'font-DIST-20',
        2: 'font-DIST-40',
        3: 'font-DIST-60',
        4: 'font-DIST-80',
        5: 'font-DIST-100'
    };
    
    const fontValue = fontMap[fingerCount];
    if (!fontValue) return;
    
    // Update the font buttons instead of dropdown
    const buttons = document.querySelectorAll('.font-btn');
    buttons.forEach(btn => {
        if (btn.dataset.font === fontValue) {
            btn.classList.add('active');
            btn.style.opacity = '1';
        } else {
            btn.classList.remove('active');
            btn.style.opacity = '0.5';
        }
    });
    
    // Update the current font and trigger display update
    if (window.currentFont !== fontValue) {
        window.currentFont = fontValue;
        
        // Update all glyph cells
        document.querySelectorAll('.glyph-cell').forEach(cell => {
            cell.className = `glyph-cell ${fontValue}`;
            if (cell.textContent === window.currentChar) {
                cell.classList.add('active');
            }
        });
        
        // Update the main display
        if (window.updateGlyphDisplay && window.currentChar) {
            window.updateGlyphDisplay(window.currentChar);
        }
        
        console.log(`Font switched to: ${fontValue} (${fingerCount} fingers)`);
    }
}

function handleGlyphHover(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const element = document.elementFromPoint(x, y);
    
    // Check if hovering over a glyph cell
    if (element && element.classList.contains('glyph-cell')) {
        const char = element.textContent;
        // Trigger preview just like mouse hover does
        if (window.previewGlyph) {
            window.previewGlyph(char);
        }
    } else {
        // Not over a glyph cell, restore to current selection
        if (window.restoreGlyph) {
            window.restoreGlyph();
        }
    }
}

function processGesture(results) {
    if (!results.landmarks || results.landmarks.length === 0) {
        gestureState.isHandDetected = false;
        gestureState.isPinching = false;
        lastPinchY = null;
        lastFingerCount = -1;
        fingerCountStableTime = null;
        resetDwell();
        updateUI();
        return;
    }

    let leftHandDetected = false;
    let rightHandDetected = false;

    for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const handedness = results.handednesses[i][0].categoryName;
        
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        const distance = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) + 
            Math.pow(indexTip.y - thumbTip.y, 2)
        );

        const PINCH_THRESHOLD = 0.06;
        const isPinching = distance < PINCH_THRESHOLD;

        const rawX = 1 - indexTip.x;
        const rawY = indexTip.y;

        if (handedness === "Right") {
            rightHandDetected = true;
            gestureState.isHandDetected = true;
            gestureState.isPinching = isPinching;
            gestureState.cursorX += (rawX - gestureState.cursorX) * 0.2;
            gestureState.cursorY += (rawY - gestureState.cursorY) * 0.2;

            // Handle glyph hover
            handleGlyphHover(gestureState.cursorX, gestureState.cursorY);

            /* SCROLL FUNCTION - COMMENTED OUT FOR NOW
            if (isPinching) {
                if (lastPinchY === null) {
                    lastPinchY = rawY;
                    pinchStartTime = Date.now();
                    pinchStartY = rawY;
                    hasMovedWhilePinching = false;
                } else {
                    const deltaY = rawY - lastPinchY;
                    const totalMovement = Math.abs(rawY - pinchStartY);
                    
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
                
                resetDwell();
            } else {
                lastPinchY = null;
                pinchStartTime = null;
                pinchStartY = null;
                hasMovedWhilePinching = false;
                
                handleDwellClick(gestureState.cursorX, gestureState.cursorY);
            }
            */

            // Dwell click (without scroll)
            if (!isPinching) {
                handleDwellClick(gestureState.cursorX, gestureState.cursorY);
            } else {
                resetDwell();
            }

        } else if (handedness === "Left") {
            leftHandDetected = true;
            gestureState.isHandDetected = true;
            const fingerCount = countExtendedFingers(landmarks);
            
            if (fingerCount !== lastFingerCount) {
                lastFingerCount = fingerCount;
                fingerCountStableTime = Date.now();
            } else if (fingerCountStableTime) {
                const stableTime = Date.now() - fingerCountStableTime;
                if (stableTime >= FINGER_COUNT_STABLE_DURATION) {
                    switchFontByFingerCount(fingerCount);
                    fingerCountStableTime = null;
                }
            }
        }
    }

    if (!leftHandDetected) {
        lastFingerCount = -1;
        fingerCountStableTime = null;
    }
    if (!rightHandDetected) {
        gestureState.isPinching = false;
        lastPinchY = null;
    }

    updateUI();
}

function handleDwellClick(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const element = document.elementFromPoint(x, y);
    
    const isClickable = element && (
        element.tagName === 'A' ||
        element.tagName === 'BUTTON' ||
        element.onclick ||
        element.closest('a') ||
        element.closest('button')
    );
    
    if (isClickable) {
        const targetElement = element.closest('a') || element.closest('button') || element;
        
        if (dwellElement === targetElement) {
            const dwellTime = Date.now() - dwellStartTime;
            const progress = Math.min(dwellTime / DWELL_CLICK_DURATION, 1);
            
            updateDwellProgress(x, y, progress);
            
            if (dwellTime >= DWELL_CLICK_DURATION && !dwellTimeout) {
                dwellTimeout = true;
                performClick(normalizedX, normalizedY);
                setTimeout(() => {
                    resetDwell();
                }, 500);
            }
        } else {
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

    if (gestureState.isHandDetected) {
        statusDot.classList.add('active');
        if (lastFingerCount >= 0 && fingerCountStableTime) {
            const elapsed = Date.now() - fingerCountStableTime;
            const remaining = Math.max(0, FINGER_COUNT_STABLE_DURATION - elapsed);
            statusText.textContent = `Left Hand | ${lastFingerCount} fingers (${(remaining / 1000).toFixed(1)}s)`;
        } else if (gestureState.isPinching) {
            statusText.textContent = 'Right Hand | Pinching';
        } else if (dwellElement) {
            const elapsed = Date.now() - dwellStartTime;
            const remaining = Math.ceil((DWELL_CLICK_DURATION - elapsed) / 1000);
            statusText.textContent = `Clicking in ${remaining}s`;
        } else {
            statusText.textContent = 'Hand detected';
        }
    } else {
        statusDot.classList.remove('active');
        statusText.textContent = 'Raise hand';
    }
}

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

const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        from {
            transform: scale(1);
            opacity: 1;
        }
        to {
            transform: scale(3);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

init();