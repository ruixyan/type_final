// Hero Text Animation
const fonts = [
    '"DIST-100", sans-serif',
    '"DIST-20", sans-serif',
    '"DIST-40", sans-serif',
    '"DIST-60", sans-serif',
    '"DIST-80", sans-serif',
];

const heroText = document.getElementById('heroText');
let letters = [];

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

letters.forEach((span, i) => {
    const interval = 300;
    const offset = i * 100;
    setInterval(() => {
        const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
        span.style.fontFamily = randomFont;
    }, interval + offset);
});

// Sliders
const sliders = document.querySelectorAll('.size-slider');

sliders.forEach((slider) => {
    slider.addEventListener('input', function() {
        const targetId = this.getAttribute('data-target');
        const targetElement = document.getElementById(targetId);
        
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