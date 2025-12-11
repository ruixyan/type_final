import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

// Gesture Control State
let landmarker = null;
let video = document.getElementById('gesture-video');
let widget = document.getElementById('gesture-widget');
let loading = document.getElementById('gesture-loading');
let error = document.getElementById('gesture-error');
let statusDot = document.querySelector('.gesture-status-dot');
let statusText = document.getElementById('gesture-status-text');
let minimizeBtn = document.getElementById('gesture-minimize-btn');

let gestureState = {
    isHandDetected: false,
    cursorX: 0.5,
    cursorY: 0.5,
    leftHandRotation: 0,
    leftHandY: 0.5,
    isLeftFist: false,
    rightHandPinching: false,
    rightHandPinchStrength: 0
};

let isMinimized = false;
let dwellElement = null;
let dwellStartTime = null;
let dwellTimeout = null;

// Character selection dwell tracking
let charDwellChar = null;
let charDwellStartTime = null;
let lastRotationChar = null;

// Text scaling state
let isScalingText = false;
let scalingStartY = 0;
let scalingStartSize = 64;

// All available characters for rotation selection
const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.,;:\'"\\-_()[]{}/@#$%*+=& '.split('');

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

function processGesture(results) {
    if (!results.landmarks || results.landmarks.length === 0) {
        gestureState.isHandDetected = false;
        resetDwell();
        hideCursor();
        
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
        const handedness = results.handednesses[i][0].categoryName;
        
        if (handedness === "Right") {
            handleRightHand(landmarks);
        } else if (handedness === "Left") {
            handleLeftHand(landmarks);
        }
    }

    updateUI();
}

function handleRightHand(landmarks) {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Flip X for mirror
    const rawX = 1 - indexTip.x;
    const rawY = indexTip.y;

    gestureState.isHandDetected = true;
    gestureState.cursorX += (rawX - gestureState.cursorX) * 0.2;
    gestureState.cursorY += (rawY - gestureState.cursorY) * 0.2;

    // Detect pinch gesture
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const pinchDistance = Math.sqrt(dx * dx + dy * dy);
    
    gestureState.rightHandPinching = pinchDistance < 0.05;
    gestureState.rightHandPinchStrength = Math.max(0, 1 - pinchDistance / 0.05);

    showCursor();
    
    // Check if hovering over help popup trigger area
    checkHelpButtonHover(gestureState.cursorX, gestureState.cursorY);
    
    // Handle text scaling if pinching near top-right of text
    if (gestureState.rightHandPinching) {
        handleTextScaling(gestureState.cursorX, gestureState.cursorY);
    } else {
        if (isScalingText) {
            isScalingText = false;
            console.log('Stopped text scaling');
            // Remove scaling indicator
            const indicator = document.getElementById('scaling-indicator');
            if (indicator) indicator.remove();
        }
        handleDwellClick(gestureState.cursorX, gestureState.cursorY);
    }
}

function handleLeftHand(landmarks) {
    // Calculate hand rotation using wrist to middle finger
    const wrist = landmarks[0];
    const middleFinger = landmarks[9];
    
    const dx = middleFinger.x - wrist.x;
    const dy = middleFinger.y - wrist.y;
    const rotation = Math.atan2(dy, dx);
    
    gestureState.leftHandRotation = rotation;
    
    // Get Y position (average of wrist and middle finger)
    gestureState.leftHandY = (wrist.y + middleFinger.y) / 2;
    
    // Detect fist: check if all fingertips are close to palm
    const palm = landmarks[0];
    const fingertips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
    
    const distances = fingertips.map(tip => {
        const dx = tip.x - palm.x;
        const dy = tip.y - palm.y;
        return Math.sqrt(dx * dx + dy * dy);
    });
    
    const avgDistance = distances.reduce((a, b) => a + b) / distances.length;
    const wasFist = gestureState.isLeftFist;
    gestureState.isLeftFist = avgDistance < 0.15;
    
    // Reset character dwell if transitioning to/from fist
    if (wasFist !== gestureState.isLeftFist) {
        charDwellChar = null;
        charDwellStartTime = null;
    }
    
    // Apply controls
    if (gestureState.isLeftFist) {
        handleDistortionControl();
        // Reset character preview when in fist mode
        updateCharacterPreview(null);
    } else {
        handleCharacterRotation();
    }
}

function handleCharacterRotation() {
    // Map rotation (-PI to PI) to character index
    // Invert the rotation so rotating right goes to next character
    // Lowercase 'a' is at index 26 (after A-Z), so we offset to start there
    const targetIndex = 26; // lowercase 'a'
    const offsetRadians = (targetIndex / allChars.length) * (2 * Math.PI);
    const normalizedRotation = (-gestureState.leftHandRotation + Math.PI + offsetRadians) / (2 * Math.PI);
    // Wrap around if we go past 1
    const wrappedRotation = normalizedRotation % 1;
    const charIndex = Math.floor(wrappedRotation * allChars.length);
    const hoveredChar = allChars[Math.max(0, Math.min(charIndex, allChars.length - 1))];
    
    // Check if we're hovering on the same character
    if (hoveredChar === charDwellChar) {
        // Same character - check dwell time
        const dwellTime = Date.now() - charDwellStartTime;
        if (dwellTime >= 2000 && hoveredChar !== lastRotationChar) {
            // Select this character after 2 seconds
            const charCells = document.querySelectorAll('.char-cell');
            charCells.forEach(cell => {
                if (cell.dataset.char === hoveredChar) {
                    cell.click();
                    lastRotationChar = hoveredChar;
                    console.log('Selected character via rotation dwell:', hoveredChar);
                }
            });
        }
    } else {
        // Different character - reset dwell timer
        charDwellChar = hoveredChar;
        charDwellStartTime = Date.now();
    }
    
    // Update the preview (highlight the character without selecting)
    updateCharacterPreview(hoveredChar);
}

function updateCharacterPreview(char) {
    const charCells = document.querySelectorAll('.char-cell');
    charCells.forEach(cell => {
        // Add a preview class to show which character we're hovering on
        if (char && cell.dataset.char === char) {
            cell.style.border = '2px solid #f5f5f5';
        } else if (!cell.classList.contains('active')) {
            cell.style.border = '';
        }
    });
}

function handleTextScaling(normalizedX, normalizedY) {
    const textContainer = document.querySelector('.playspace-text-container');
    const playspace = document.querySelector('.playspace');
    
    // If no text container, check if there's any text in playspace
    if (!textContainer && !playspace) {
        console.log('No text container or playspace found');
        return;
    }
    
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    // Use playspace bounds if no text container
    const targetElement = textContainer || playspace;
    const containerRect = targetElement.getBoundingClientRect();
    
    // Define scaling zone: anywhere on the right side of the text/playspace
    const isInScalingZone = x > containerRect.left + (containerRect.width * 0.7);
    
    console.log('Pinching:', gestureState.rightHandPinching, 'In zone:', isInScalingZone, 'Scaling:', isScalingText);
    
    if (isInScalingZone || isScalingText) {
        if (!isScalingText) {
            // Start scaling
            isScalingText = true;
            scalingStartY = normalizedY;
            const scaleSlider = document.getElementById('scaleSlider');
            scalingStartSize = scaleSlider ? parseInt(scaleSlider.value) : 64;
            console.log('Started text scaling at Y:', scalingStartY, 'size:', scalingStartSize);
        }
        
        // Calculate new size based on vertical movement
        const deltaY = normalizedY - scalingStartY;
        const sizeDelta = -deltaY * 500; // Move up = bigger, move down = smaller (increased range for 400px max)
        let newSize = Math.round(scalingStartSize + sizeDelta);
        newSize = Math.max(16, Math.min(400, newSize)); // Clamp to slider range (now up to 400px)
        
        // Update slider
        const scaleSlider = document.getElementById('scaleSlider');
        if (scaleSlider && parseInt(scaleSlider.value) !== newSize) {
            scaleSlider.value = newSize;
            const event = new Event('input', { bubbles: true });
            scaleSlider.dispatchEvent(event);
        }
        
        // Show visual feedback at cursor position
        showScalingIndicator(x, y, newSize);
    }
}

function handleDistortionControl() {
    // Map Y position to distortion value (100-900)
    const distValue = Math.floor(100 + (1 - gestureState.leftHandY) * 800);
    
    const weightSlider = document.getElementById('weightSlider');
    if (weightSlider) {
        weightSlider.value = distValue;
        const event = new Event('input', { bubbles: true });
        weightSlider.dispatchEvent(event);
    }
}

function checkHelpButtonHover(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    // Check both the widget and the area above it for help popup
    const widget = document.getElementById('gesture-widget');
    if (!widget) return;
    
    const widgetRect = widget.getBoundingClientRect();
    
    // Trigger area: above the widget
    const triggerArea = {
        left: widgetRect.left,
        right: widgetRect.right,
        top: widgetRect.top - 100, // 100px above widget
        bottom: widgetRect.top
    };
    
    const isOverTrigger = (
        x >= triggerArea.left && 
        x <= triggerArea.right && 
        y >= triggerArea.top && 
        y <= triggerArea.bottom
    );
    
    // Show/hide help popup
    if (window.gestureHoverHelp) {
        window.gestureHoverHelp(isOverTrigger);
    }
}

function handleDwellClick(normalizedX, normalizedY) {
    const x = normalizedX * window.innerWidth;
    const y = normalizedY * window.innerHeight;
    
    const element = document.elementFromPoint(x, y);
    
    // Check if element is clickable
    const isClickable = element && (
        element.tagName === 'A' ||
        element.tagName === 'BUTTON' ||
        element.tagName === 'INPUT' ||
        element.onclick ||
        element.classList.contains('char-cell') ||
        element.closest('a') ||
        element.closest('button')
    );
    
    if (isClickable) {
        const targetElement = element.closest('a') || 
                             element.closest('button') || 
                             (element.classList.contains('char-cell') ? element : element);
        
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

function showCursor() {
    let cursor = document.getElementById('gesture-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'gesture-cursor';
        cursor.innerHTML = `
            <div style="
                width: 24px;
                height: 24px;
                border-radius: 50%;
                border: 2px solid #10b981;
                background: rgba(16, 185, 129, 0.2);
            "></div>
        `;
        cursor.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
            transition: left 0.05s, top 0.05s;
        `;
        document.body.appendChild(cursor);
    }
    
    cursor.style.display = 'block';
    cursor.style.left = `${gestureState.cursorX * 100}%`;
    cursor.style.top = `${gestureState.cursorY * 100}%`;
}

function hideCursor() {
    const cursor = document.getElementById('gesture-cursor');
    if (cursor) {
        cursor.style.display = 'none';
    }
}

function showScalingIndicator(x, y, size) {
    let indicator = document.getElementById('scaling-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'scaling-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -50%);
        padding: 8px 16px;
        background: rgba(16, 185, 129, 0.9);
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    indicator.textContent = `${size}px`;
}

function updateUI() {
    // Status
    if (gestureState.isHandDetected || gestureState.isLeftFist || gestureState.leftHandRotation !== 0) {
        statusDot.classList.add('active');
        
        if (isScalingText) {
            const scaleSlider = document.getElementById('scaleSlider');
            const currentSize = scaleSlider ? parseInt(scaleSlider.value) : 64;
            statusText.textContent = `Scaling text | ${currentSize}px`;
        } else if (gestureState.isLeftFist) {
            statusText.textContent = 'Left Fist | DISTORTION';
        } else if (gestureState.leftHandRotation !== 0 && charDwellChar) {
            const dwellTime = Date.now() - charDwellStartTime;
            const remaining = Math.max(0, (2000 - dwellTime) / 1000);
            statusText.textContent = `${charDwellChar} | ${remaining.toFixed(1)}s`;
        } else if (dwellElement) {
            const elapsed = Date.now() - dwellStartTime;
            const remaining = Math.max(0, Math.ceil((1500 - elapsed) / 1000 * 10) / 10);
            statusText.textContent = `Clicking in ${remaining.toFixed(1)}s`;
        } else {
            statusText.textContent = 'Hand detected';
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

// Add CSS for ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        from {
            transform: scale(0);
            opacity: 1;
        }
        to {
            transform: scale(3);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Start
init();