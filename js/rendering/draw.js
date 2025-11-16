import { W, H } from '../canvas.js';
import { drawMaze } from '../game/obstacles.js';
import { drawGameUI } from '../ui/hud.js';
import { renderAnimations } from './animations.js';
import {
    tanks, boss, bullets, buffs,
    overlayText, overlayUntil, roundEnding, devMode
} from '../state.js';

export function render(ctx, now) {
    // Optimized background rendering - cache gradient
    if (!render.bgGradient) {
        const safeH = isFinite(H) && H > 0 ? H : 560;
        render.bgGradient = ctx.createLinearGradient(0, 0, 0, safeH);
        render.bgGradient.addColorStop(0, '#f5f1eb');
        render.bgGradient.addColorStop(0.5, '#e8ddd4');
        render.bgGradient.addColorStop(1, '#d4c4b0');
    }
    ctx.fillStyle = render.bgGradient;
    ctx.fillRect(0, 0, W, H);

    // Optimized grid pattern - batch draw calls
    ctx.strokeStyle = 'rgba(139,117,93,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
    }
    ctx.stroke();

    drawMaze(ctx);

    buffs.forEach(b => b.draw(ctx));
    
    renderAnimations(ctx, now);

    tanks.forEach(t => t.draw(ctx));
    bullets.forEach(b => { if (b && typeof b.draw === 'function') b.draw(ctx); });

    if (boss) boss.draw(ctx);

    // Vẽ overlay thắng/thua đẹp
    if (overlayText && performance.now() < overlayUntil) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);

        // Gradient text - ensure safe values
        const safeH = isFinite(H) && H > 0 ? H : 560;
        const gradient = ctx.createLinearGradient(0, safeH / 2 - 50, 0, safeH / 2 + 50);
        gradient.addColorStop(0, '#ffd700');
        gradient.addColorStop(0.5, '#ff6b35');
        gradient.addColorStop(1, '#f7931e');

        ctx.fillStyle = gradient;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 20;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 80px Arial, sans-serif';
        ctx.fillText(overlayText, W / 2, H / 2);

        // Glow effect
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 30;
        ctx.fillText(overlayText, W / 2, H / 2);

        ctx.restore();
    }

    // Draw in-game UI buttons
    drawGameUI(ctx);
}