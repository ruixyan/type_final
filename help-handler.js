// Help button hover handler
const helpBtn = document.getElementById('help-btn');
const helpPopup = document.getElementById('help-popup');

let isHelpVisible = false;
let hasAutoHidden = false; // Track if auto-hide has happened

// Mouse hover
if (helpBtn) {
    helpBtn.addEventListener('mouseenter', () => {
        showHelp();
    });

    helpBtn.addEventListener('mouseleave', () => {
        if (hasAutoHidden) {
            hideHelp();
        }
    });
}

if (helpPopup) {
    helpPopup.addEventListener('mouseenter', () => {
        showHelp();
    });

    helpPopup.addEventListener('mouseleave', () => {
        if (hasAutoHidden) {
            hideHelp();
        }
    });
}

function showHelp() {
    console.log('Showing help popup');
    isHelpVisible = true;
    if (helpPopup) {
        helpPopup.classList.add('visible');
    }
}

function hideHelp() {
    console.log('Hiding help popup');
    isHelpVisible = false;
    if (helpPopup) {
        helpPopup.classList.remove('visible');
    }
}

// Export function for gesture control integration
// This will be called from gesture-control.js when cursor hovers
window.gestureHoverHelp = function(isHovering) {
    console.log('gestureHoverHelp called:', isHovering);
    // Only respond to hover if auto-hide has already happened
    if (hasAutoHidden) {
        if (isHovering) {
            showHelp();
        } else {
            hideHelp();
        }
    }
};

// Show popup on page load, then hide after 10 seconds
window.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, showing help popup for 10 seconds');
    showHelp();
    
    setTimeout(() => {
        console.log('Auto-hiding help popup after 10 seconds');
        hideHelp();
        hasAutoHidden = true; // Enable hover functionality
    }, 7000);
});

console.log('Help handler loaded, window.gestureHoverHelp available');