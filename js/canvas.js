// This module initializes and exports the main canvas and its context.

export const canvas = document.getElementById('c');
export const ctx = canvas.getContext('2d');
export const W = canvas.width;
export const H = canvas.height;

export function initCanvas() {
    canvas.tabIndex = 1000;
    canvas.style.outline = 'none';
}