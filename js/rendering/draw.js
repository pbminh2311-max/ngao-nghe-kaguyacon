import { W, H } from '../canvas.js';
import { drawMaze } from '../game/obstacles.js';
import { drawSlimePuddles } from '../game/slimeHazards.js';
import { clamp } from '../utils.js';

import { drawGameUI } from '../ui/hud.js';
import { renderAnimations, screenShake, nukeFlash } from './animations.js';
import { renderDamageNumbers } from './damageNumber.js';
import {
    tanks, boss, bullets, buffs,
    overlayText, overlayUntil, roundEnding, devMode
} from '../state.js';

function getStageKey() {
    if (boss && boss.bossType === 'slime') {
        return boss.isCorruptedPhase ? 'slime_corrupted' : 'slime_default';
    }
    return 'default';
}

function ensureBackgroundGradient(ctx, key) {
    const safeH = isFinite(H) && H > 0 ? H : 560;
    if (!render.bgGradients) {
        render.bgGradients = {};
    }
    if (render.bgGradients[key]) return render.bgGradients[key];

    let gradient;
    switch (key) {
        case 'slime_corrupted': {
            gradient = ctx.createLinearGradient(0, 0, 0, safeH);
            gradient.addColorStop(0, '#050810');
            gradient.addColorStop(0.45, '#0f172a');
            gradient.addColorStop(1, '#111827');
            break;
        }
        case 'slime_default': {
            gradient = ctx.createLinearGradient(0, 0, 0, safeH);
            gradient.addColorStop(0, '#eefdf3');
            gradient.addColorStop(0.55, '#d9f99d');
            gradient.addColorStop(1, '#bbf7d0');
            break;
        }
        default: {
            gradient = ctx.createLinearGradient(0, 0, 0, safeH);
            gradient.addColorStop(0, '#f5f1eb');
            gradient.addColorStop(0.5, '#e8ddd4');
            gradient.addColorStop(1, '#d4c4b0');
        }
    }
    render.bgGradients[key] = gradient;
    return gradient;
}

function buildSlimeDecor(stageKey) {
    const orbCount = stageKey === 'slime_corrupted' ? 26 : 18;
    const tendrilCount = stageKey === 'slime_corrupted' ? 6 : 4;
    const orbs = Array.from({ length: orbCount }).map((_, idx) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        baseRadius: stageKey === 'slime_corrupted' ? 26 + Math.random() * 22 : 18 + Math.random() * 16,
        pulseSpeed: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        hueShift: idx / orbCount
    }));

    const tendrils = Array.from({ length: tendrilCount }).map(() => {
        const segments = 4 + Math.floor(Math.random() * 4);
        const nodes = [];
        let anchorX = Math.random() * W;
        let anchorY = Math.random() * H;
        for (let i = 0; i < segments; i++) {
            anchorX += (Math.random() - 0.5) * 160;
            anchorY += (Math.random() - 0.5) * 160;
            nodes.push({
                x: clamp(anchorX, 40, W - 40),
                y: clamp(anchorY, 40, H - 40)
            });
        }
        return {
            nodes,
            offset: Math.random() * Math.PI * 2
        };
    });

    return { orbs, tendrils };
}

function drawSlimeDecor(ctx, stageKey, now) {
    if (!stageKey.startsWith('slime')) return;
    if (render.lastStageKey !== stageKey) {
        render.lastStageKey = stageKey;
        render.slimeDecor = null;
    }
    if (!render.slimeDecor) {
        render.slimeDecor = buildSlimeDecor(stageKey);
    }

    const decor = render.slimeDecor;
    const time = now * 0.001;

    ctx.save();
    decor.orbs.forEach(({ x, y, baseRadius, pulseSpeed, phase, hueShift }) => {
        const pulse = 0.65 + Math.sin(time * pulseSpeed + phase) * 0.2;
        const radius = baseRadius * pulse;
        const gradient = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius);
        if (stageKey === 'slime_corrupted') {
            gradient.addColorStop(0, `rgba(163, 230, 53, ${0.45 + pulse * 0.25})`);
            gradient.addColorStop(0.7, 'rgba(21, 128, 61, 0.25)');
            gradient.addColorStop(1, 'rgba(6, 78, 59, 0)');
        } else {
            gradient.addColorStop(0, `rgba(187, 247, 208, ${0.5 + hueShift * 0.3})`);
            gradient.addColorStop(0.65, 'rgba(74, 222, 128, 0.2)');
            gradient.addColorStop(1, 'rgba(45, 212, 191, 0)');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    decor.tendrils.forEach(({ nodes, offset }) => {
        ctx.save();
        ctx.lineWidth = stageKey === 'slime_corrupted' ? 5 : 4;
        ctx.strokeStyle = stageKey === 'slime_corrupted'
            ? 'rgba(74, 222, 128, 0.18)'
            : 'rgba(59, 130, 246, 0.18)';
        ctx.shadowColor = stageKey === 'slime_corrupted' ? '#4ade80' : '#60a5fa';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        nodes.forEach((node, idx) => {
            const wave = Math.sin(time * 0.6 + offset + idx * 0.8) * 14;
            const wobbleX = node.x + wave;
            const wobbleY = node.y + Math.cos(time * 0.4 + offset + idx) * 12;
            if (idx === 0) {
                ctx.moveTo(wobbleX, wobbleY);
            } else {
                ctx.lineTo(wobbleX, wobbleY);
            }
        });
        ctx.stroke();
        ctx.restore();
    });
    ctx.restore();
}

export function render(ctx, now) {
    ctx.save();
    const stageKey = getStageKey();

    // Áp dụng hiệu ứng rung màn hình
    if (screenShake.intensity > 0) {
        const dx = (Math.random() - 0.5) * screenShake.intensity;
        const dy = (Math.random() - 0.5) * screenShake.intensity;
        ctx.translate(dx, dy);
    }

    // Optimized background rendering - cache gradient per stage
    ctx.fillStyle = ensureBackgroundGradient(ctx, stageKey);
    ctx.fillRect(0, 0, W, H);

    if (stageKey.startsWith('slime')) {
        ctx.fillStyle = stageKey === 'slime_corrupted' ? 'rgba(4, 7, 15, 0.55)' : 'rgba(240, 253, 244, 0.35)';
        ctx.fillRect(0, 0, W, H);
        drawSlimeDecor(ctx, stageKey, now);
    }

    // Optimized grid pattern - batch draw calls
    const gridColor = stageKey === 'slime_corrupted'
        ? 'rgba(148, 163, 184, 0.14)'
        : stageKey === 'slime_default'
            ? 'rgba(30, 64, 175, 0.12)'
            : 'rgba(139,117,93,0.15)';
    ctx.strokeStyle = gridColor;
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

    ctx.save();
    if (stageKey === 'slime_corrupted') {
        ctx.globalAlpha = 0.6;
    } else if (stageKey === 'slime_default') {
        ctx.globalAlpha = 0.8;
    }
    drawMaze(ctx);
    ctx.restore();

    drawSlimePuddles(ctx, now);

    buffs.forEach(b => b.draw(ctx));

    renderAnimations(ctx, now);

    renderDamageNumbers(ctx, now);

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

    // Vẽ hiệu ứng màn hình trắng xóa của Nuke (vẽ trên cùng)
    if (nukeFlash.alpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${nukeFlash.alpha})`;
        ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
}