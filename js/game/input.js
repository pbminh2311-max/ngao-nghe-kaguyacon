// Optimized input handling
export const input = {};
const preventDefaultKeys = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter',' ']);

// Consolidated key event handler
function handleKeyEvent(e, isDown) {
    const k = (e.key.length === 1) ? e.key.toLowerCase() : e.key;
    input[k] = isDown;
    
    if (preventDefaultKeys.has(e.key)) {
        e.preventDefault();
    }
}

document.addEventListener('keydown', e => handleKeyEvent(e, true));
document.addEventListener('keyup', e => handleKeyEvent(e, false));

// Handle focus loss to prevent stuck keys
window.addEventListener('blur', () => {
    Object.keys(input).forEach(k => input[k] = false);
});