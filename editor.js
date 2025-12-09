// Character customization storage
const charSettings = {};

// All available characters
const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.,;:\'"\\-_()[]{}/@#$%*+=& '.split('');

// Initialize default settings for all characters
allChars.forEach(char => {
    charSettings[char] = {
        dist: 400,
        color: '#ffffff'
    };
});

// Get elements
const textInput = document.getElementById('text-input');
const weightSlider = document.getElementById('weightSlider');
const weightValue = document.getElementById('weightValue');
const colorPicker = document.getElementById('colorPicker');
const bgColorPicker = document.getElementById('bgColorPicker');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const playspace = document.querySelector('.playspace');
const charGrid = document.getElementById('char-grid');
const currentCharDisplay = document.getElementById('current-char');
const saveCharBtn = document.getElementById('save-char-btn');

let selectedChar = 'A';
let textScale = 64;

// Background color control
if (bgColorPicker) {
    bgColorPicker.addEventListener('input', () => {
        playspace.style.backgroundColor = bgColorPicker.value;
    });
}

// Scale slider control
if (scaleSlider) {
    scaleSlider.addEventListener('input', () => {
        textScale = parseInt(scaleSlider.value);
        scaleValue.textContent = textScale;
        updateDisplayText();
    });
}

// Create character grid
function createCharGrid() {
    charGrid.innerHTML = '';
    allChars.forEach(char => {
        const cell = document.createElement('div');
        cell.className = 'char-cell';
        cell.textContent = char === ' ' ? '␣' : char;
        cell.dataset.char = char;
        
        // Check if character has custom settings
        if (charSettings[char].dist !== 400 || charSettings[char].color !== '#ffffff') {
            cell.classList.add('customized');
        }
        
        cell.addEventListener('click', () => {
            selectChar(char);
        });
        
        charGrid.appendChild(cell);
    });
}

// Select character for editing
function selectChar(char) {
    selectedChar = char;
    
    // Update UI
    document.querySelectorAll('.char-cell').forEach(cell => {
        cell.classList.toggle('active', cell.dataset.char === char);
    });
    
    // Display current character (show space as ␣)
    currentCharDisplay.textContent = char === ' ' ? '␣' : char;
    
    // Load character settings
    const settings = charSettings[char];
    weightSlider.value = settings.dist;
    weightValue.textContent = settings.dist;
    colorPicker.value = settings.color;
    
    // Update preview
    updateCharPreview();
}

// Update character preview
function updateCharPreview() {
    const value = parseInt(weightSlider.value);
    weightValue.textContent = value;
    
    let fontFamily;
    if (value <= 150) {
        fontFamily = 'Hand';
    } else if (value <= 300) {
        fontFamily = 'DIST-20';
    } else if (value <= 500) {
        fontFamily = 'DIST-40';
    } else if (value <= 700) {
        fontFamily = 'DIST-60';
    } else if (value <= 850) {
        fontFamily = 'DIST-80';
    } else {
        fontFamily = 'DIST-100';
    }
    
    currentCharDisplay.style.fontFamily = `"${fontFamily}", serif`;
    currentCharDisplay.style.color = colorPicker.value;
}

// Save character settings
function saveCharSettings() {
    charSettings[selectedChar] = {
        dist: parseInt(weightSlider.value),
        color: colorPicker.value
    };
    
    console.log('Saved settings for', selectedChar, ':', charSettings[selectedChar]);
    console.log('All char settings:', charSettings);
    
    // Update grid to show customization
    createCharGrid();
    selectChar(selectedChar);
    
    // Update display text
    updateDisplayText();
    
    // Visual feedback
    saveCharBtn.textContent = 'Saved!';
    setTimeout(() => {
        saveCharBtn.textContent = 'Save Character';
    }, 1000);
}

// Create display text with individual character styling
function updateDisplayText() {
    playspace.innerHTML = '';
    const text = textInput.value;
    
    console.log('Updating display text:', text);
    console.log('Character settings:', charSettings);
    
    if (!text) {
        playspace.innerHTML = '<div class="playspace-empty">Text will appear here...</div>';
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'playspace-text-container';
    container.style.fontSize = `${textScale}px`;
    
    text.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'char-span';
        span.textContent = char;
        
        console.log('Processing char:', char, 'Settings:', charSettings[char]);
        
        // Use character settings if available, otherwise use defaults
        const settings = charSettings[char];
        if (!settings) {
            // If character not customized, use default settings
            console.log('Using defaults for:', char);
            span.style.fontFamily = '"Hand", serif';
            span.style.color = '#ffffff';
        } else {
            console.log('Using custom settings for:', char);
            const value = settings.dist;
            
            let fontFamily;
            if (value <= 150) {
                fontFamily = 'Hand';
            } else if (value <= 300) {
                fontFamily = 'DIST-20';
            } else if (value <= 500) {
                fontFamily = 'DIST-40';
            } else if (value <= 700) {
                fontFamily = 'DIST-60';
            } else if (value <= 850) {
                fontFamily = 'DIST-80';
            } else {
                fontFamily = 'DIST-100';
            }
            
            span.style.fontFamily = `"${fontFamily}", serif`;
            span.style.color = settings.color;
            console.log('Applied font:', fontFamily, 'color:', settings.color);
        }
        
        container.appendChild(span);
    });
    
    playspace.appendChild(container);
}

// Event listeners
weightSlider.addEventListener('input', updateCharPreview);
colorPicker.addEventListener('input', updateCharPreview);
textInput.addEventListener('input', updateDisplayText);
saveCharBtn.addEventListener('click', saveCharSettings);

// Save PNG functionality
const savePngBtn = document.getElementById('save-png-btn');
if (savePngBtn) {
    savePngBtn.addEventListener('click', async () => {
        const originalText = savePngBtn.textContent;
        savePngBtn.textContent = 'Saving...';
        
        try {
            // Create a canvas and draw the playspace content
            const playspaceRect = playspace.getBoundingClientRect();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size (2x for better quality)
            const scale = 2;
            canvas.width = playspaceRect.width * scale;
            canvas.height = playspaceRect.height * scale;
            
            // Fill background
            ctx.fillStyle = bgColorPicker.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Get the text container
            const textContainer = playspace.querySelector('.playspace-text-container');
            if (textContainer) {
                ctx.scale(scale, scale);
                
                // Get all character spans
                const spans = textContainer.querySelectorAll('.char-span');
                
                // Measure total text width and prepare character data
                let totalWidth = 0;
                const charData = [];
                
                spans.forEach(span => {
                    const computedStyle = window.getComputedStyle(span);
                    const fontSize = parseFloat(computedStyle.fontSize);
                    const fontFamily = computedStyle.fontFamily;
                    const color = computedStyle.color;
                    const char = span.textContent;
                    
                    ctx.font = `${fontSize}px ${fontFamily}`;
                    const metrics = ctx.measureText(char);
                    
                    charData.push({
                        char,
                        fontSize,
                        fontFamily,
                        color,
                        width: metrics.width
                    });
                    
                    totalWidth += metrics.width;
                });
                
                // Center the text
                let currentX = (playspaceRect.width - totalWidth) / 2;
                const centerY = playspaceRect.height / 2;
                
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                // Draw each character
                charData.forEach(data => {
                    ctx.font = `${data.fontSize}px ${data.fontFamily}`;
                    ctx.fillStyle = data.color;
                    ctx.fillText(data.char, currentX, centerY);
                    currentX += data.width;
                });
            }
            
            // Download
            const link = document.createElement('a');
            link.download = 'SYMBIOSIS_EDITOR.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            savePngBtn.textContent = 'Saved!';
            setTimeout(() => {
                savePngBtn.textContent = originalText;
            }, 1500);
        } catch (error) {
            console.error('Error saving PNG:', error);
            savePngBtn.textContent = 'Error!';
            setTimeout(() => {
                savePngBtn.textContent = originalText;
            }, 1500);
        }
    });
}

// Initialize
createCharGrid();
selectChar('A');
updateDisplayText();