// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    let currentChar = 'A';
    let currentFont = 'font-Hand';

    const glyphData = {
        'A': { name: 'Latin Capital Letter A', unicode: 'U+0041', category: 'Uppercase Letter' },
        'B': { name: 'Latin Capital Letter B', unicode: 'U+0042', category: 'Uppercase Letter' },
        'C': { name: 'Latin Capital Letter C', unicode: 'U+0043', category: 'Uppercase Letter' },
        'D': { name: 'Latin Capital Letter D', unicode: 'U+0044', category: 'Uppercase Letter' },
        'E': { name: 'Latin Capital Letter E', unicode: 'U+0045', category: 'Uppercase Letter' },
        'F': { name: 'Latin Capital Letter F', unicode: 'U+0046', category: 'Uppercase Letter' },
        'G': { name: 'Latin Capital Letter G', unicode: 'U+0047', category: 'Uppercase Letter' },
        'H': { name: 'Latin Capital Letter H', unicode: 'U+0048', category: 'Uppercase Letter' },
        'I': { name: 'Latin Capital Letter I', unicode: 'U+0049', category: 'Uppercase Letter' },
        'J': { name: 'Latin Capital Letter J', unicode: 'U+004A', category: 'Uppercase Letter' },
        'K': { name: 'Latin Capital Letter K', unicode: 'U+004B', category: 'Uppercase Letter' },
        'L': { name: 'Latin Capital Letter L', unicode: 'U+004C', category: 'Uppercase Letter' },
        'M': { name: 'Latin Capital Letter M', unicode: 'U+004D', category: 'Uppercase Letter' },
        'N': { name: 'Latin Capital Letter N', unicode: 'U+004E', category: 'Uppercase Letter' },
        'O': { name: 'Latin Capital Letter O', unicode: 'U+004F', category: 'Uppercase Letter' },
        'P': { name: 'Latin Capital Letter P', unicode: 'U+0050', category: 'Uppercase Letter' },
        'Q': { name: 'Latin Capital Letter Q', unicode: 'U+0051', category: 'Uppercase Letter' },
        'R': { name: 'Latin Capital Letter R', unicode: 'U+0052', category: 'Uppercase Letter' },
        'S': { name: 'Latin Capital Letter S', unicode: 'U+0053', category: 'Uppercase Letter' },
        'T': { name: 'Latin Capital Letter T', unicode: 'U+0054', category: 'Uppercase Letter' },
        'U': { name: 'Latin Capital Letter U', unicode: 'U+0055', category: 'Uppercase Letter' },
        'V': { name: 'Latin Capital Letter V', unicode: 'U+0056', category: 'Uppercase Letter' },
        'W': { name: 'Latin Capital Letter W', unicode: 'U+0057', category: 'Uppercase Letter' },
        'X': { name: 'Latin Capital Letter X', unicode: 'U+0058', category: 'Uppercase Letter' },
        'Y': { name: 'Latin Capital Letter Y', unicode: 'U+0059', category: 'Uppercase Letter' },
        'Z': { name: 'Latin Capital Letter Z', unicode: 'U+005A', category: 'Uppercase Letter' },
        'a': { name: 'Latin Small Letter A', unicode: 'U+0061', category: 'Lowercase Letter' },
        'b': { name: 'Latin Small Letter B', unicode: 'U+0062', category: 'Lowercase Letter' },
        'c': { name: 'Latin Small Letter C', unicode: 'U+0063', category: 'Lowercase Letter' },
        'd': { name: 'Latin Small Letter D', unicode: 'U+0064', category: 'Lowercase Letter' },
        'e': { name: 'Latin Small Letter E', unicode: 'U+0065', category: 'Lowercase Letter' },
        'f': { name: 'Latin Small Letter F', unicode: 'U+0066', category: 'Lowercase Letter' },
        'g': { name: 'Latin Small Letter G', unicode: 'U+0067', category: 'Lowercase Letter' },
        'h': { name: 'Latin Small Letter H', unicode: 'U+0068', category: 'Lowercase Letter' },
        'i': { name: 'Latin Small Letter I', unicode: 'U+0069', category: 'Lowercase Letter' },
        'j': { name: 'Latin Small Letter J', unicode: 'U+006A', category: 'Lowercase Letter' },
        'k': { name: 'Latin Small Letter K', unicode: 'U+006B', category: 'Lowercase Letter' },
        'l': { name: 'Latin Small Letter L', unicode: 'U+006C', category: 'Lowercase Letter' },
        'm': { name: 'Latin Small Letter M', unicode: 'U+006D', category: 'Lowercase Letter' },
        'n': { name: 'Latin Small Letter N', unicode: 'U+006E', category: 'Lowercase Letter' },
        'o': { name: 'Latin Small Letter O', unicode: 'U+006F', category: 'Lowercase Letter' },
        'p': { name: 'Latin Small Letter P', unicode: 'U+0070', category: 'Lowercase Letter' },
        'q': { name: 'Latin Small Letter Q', unicode: 'U+0071', category: 'Lowercase Letter' },
        'r': { name: 'Latin Small Letter R', unicode: 'U+0072', category: 'Lowercase Letter' },
        's': { name: 'Latin Small Letter S', unicode: 'U+0073', category: 'Lowercase Letter' },
        't': { name: 'Latin Small Letter T', unicode: 'U+0074', category: 'Lowercase Letter' },
        'u': { name: 'Latin Small Letter U', unicode: 'U+0075', category: 'Lowercase Letter' },
        'v': { name: 'Latin Small Letter V', unicode: 'U+0076', category: 'Lowercase Letter' },
        'w': { name: 'Latin Small Letter W', unicode: 'U+0077', category: 'Lowercase Letter' },
        'x': { name: 'Latin Small Letter X', unicode: 'U+0078', category: 'Lowercase Letter' },
        'y': { name: 'Latin Small Letter Y', unicode: 'U+0079', category: 'Lowercase Letter' },
        'z': { name: 'Latin Small Letter Z', unicode: 'U+007A', category: 'Lowercase Letter' },
        '0': { name: 'Digit Zero', unicode: 'U+0030', category: 'Number' },
        '1': { name: 'Digit One', unicode: 'U+0031', category: 'Number' },
        '2': { name: 'Digit Two', unicode: 'U+0032', category: 'Number' },
        '3': { name: 'Digit Three', unicode: 'U+0033', category: 'Number' },
        '4': { name: 'Digit Four', unicode: 'U+0034', category: 'Number' },
        '5': { name: 'Digit Five', unicode: 'U+0035', category: 'Number' },
        '6': { name: 'Digit Six', unicode: 'U+0036', category: 'Number' },
        '7': { name: 'Digit Seven', unicode: 'U+0037', category: 'Number' },
        '8': { name: 'Digit Eight', unicode: 'U+0038', category: 'Number' },
        '9': { name: 'Digit Nine', unicode: 'U+0039', category: 'Number' },
        '!': { name: 'Exclamation Mark', unicode: 'U+0021', category: 'Punctuation' },
        '?': { name: 'Question Mark', unicode: 'U+003F', category: 'Punctuation' },
        '.': { name: 'Full Stop', unicode: 'U+002E', category: 'Punctuation' },
        ',': { name: 'Comma', unicode: 'U+002C', category: 'Punctuation' },
        ':': { name: 'Colon', unicode: 'U+003A', category: 'Punctuation' },
        ';': { name: 'Semicolon', unicode: 'U+003B', category: 'Punctuation' },
        '"': { name: 'Quotation Mark', unicode: 'U+0022', category: 'Punctuation' },
        "'": { name: 'Apostrophe', unicode: 'U+0027', category: 'Punctuation' },
        '-': { name: 'Hyphen-Minus', unicode: 'U+002D', category: 'Punctuation' },
        '_': { name: 'Low Line', unicode: 'U+005F', category: 'Punctuation' },
        '(': { name: 'Left Parenthesis', unicode: 'U+0028', category: 'Punctuation' },
        ')': { name: 'Right Parenthesis', unicode: 'U+0029', category: 'Punctuation' },
        '[': { name: 'Left Square Bracket', unicode: 'U+005B', category: 'Punctuation' },
        ']': { name: 'Right Square Bracket', unicode: 'U+005D', category: 'Punctuation' },
        '{': { name: 'Left Curly Bracket', unicode: 'U+007B', category: 'Punctuation' },
        '}': { name: 'Right Curly Bracket', unicode: 'U+007D', category: 'Punctuation' },
        '/': { name: 'Solidus', unicode: 'U+002F', category: 'Punctuation' },
        '\\': { name: 'Reverse Solidus', unicode: 'U+005C', category: 'Punctuation' },
        '&': { name: 'Ampersand', unicode: 'U+0026', category: 'Symbol' },
        '@': { name: 'Commercial At', unicode: 'U+0040', category: 'Symbol' },
        '#': { name: 'Number Sign', unicode: 'U+0023', category: 'Symbol' },
        '$': { name: 'Dollar Sign', unicode: 'U+0024', category: 'Symbol' },
        '%': { name: 'Percent Sign', unicode: 'U+0025', category: 'Symbol' },
        '*': { name: 'Asterisk', unicode: 'U+002A', category: 'Symbol' },
        '+': { name: 'Plus Sign', unicode: 'U+002B', category: 'Symbol' },
        '=': { name: 'Equals Sign', unicode: 'U+003D', category: 'Symbol' },
    };

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const numbers = '0123456789'.split('');
    const special = '!?.,;:\'"\\-_()[]{}/@#$%*+=&'.split('');

    const letters = [...uppercase, ...lowercase];
    const numbersAndSpecial = [...numbers, ...special];

    function createGrid(container, chars) {
        container.innerHTML = '';
        chars.forEach(char => {
            const cell = document.createElement('div');
            cell.className = `glyph-cell ${currentFont}`;
            cell.textContent = char;
            
            // Preview on hover
            cell.onmouseenter = () => {
                updateGlyphDisplay(char);
            };
            
            // Restore on mouse leave
            cell.onmouseleave = () => {
                updateGlyphDisplay(currentChar);
            };
            
            // Select on click
            cell.onclick = () => {
                currentChar = char;
                updateGlyphDisplay(char);
                
                document.querySelectorAll('.glyph-cell').forEach(c => {
                    c.classList.toggle('active', c.textContent === char);
                });
            };
            
            if (char === currentChar) cell.classList.add('active');
            container.appendChild(cell);
        });
    }

    function initGrids() {
        createGrid(document.getElementById('lettersGrid'), letters);
        createGrid(document.getElementById('numbersSpecialGrid'), numbersAndSpecial);
    }

    function updateGlyphDisplay(char) {
        const data = glyphData[char];
        const glyphDisplay = document.getElementById('currentGlyph');
        glyphDisplay.textContent = char;
        glyphDisplay.className = `current-glyph ${currentFont}`;
        document.getElementById('charName').textContent = data.name;
        document.getElementById('unicode').textContent = data.unicode;
        document.getElementById('category').textContent = data.category;
    }

    function changeFont(fontClass) {
        currentFont = fontClass;
        
        // Update all glyph cells
        document.querySelectorAll('.glyph-cell').forEach(cell => {
            cell.className = `glyph-cell ${fontClass}`;
            if (cell.textContent === currentChar) {
                cell.classList.add('active');
            }
        });
        
        // Update the large display
        updateGlyphDisplay(currentChar);
    }

    // Font button handlers - using inline onclick
    window.handleFontClick = function(button) {
        const fontClass = button.dataset.font;
        
        // Update button states
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Change the font
        changeFont(fontClass);
    };

    // Initialize
    initGrids();
    updateGlyphDisplay(currentChar);
});