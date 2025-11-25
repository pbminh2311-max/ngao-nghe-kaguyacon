import { ObjectPools } from '../state.js';
import { roundRect } from '../utils.js';
import { BUFF_COLORS } from '../constants.js';
import { W, H } from '../canvas.js'; // Import W và H

// --- State (moved from state.js) ---
export let explosions = [];
export let hitExplosions = [];
export let pickupFX = [];
export let trails = [];
export let telegraphs = [];

export let nukeFlash = { alpha: 0, duration: 0, startTime: 0 };
export let screenShake = { intensity: 0, duration: 0, startTime: 0 };
export let poisonBubbles = []; // Mảng mới cho bong bóng độc

// --- Factory Functions (to create effects) ---

export function addExplosion(config) {
    const exp = ObjectPools.getEffect();
    const defaults = {
        x: 0, y: 0, radius: 50, startTime: performance.now(), duration: 400,
        color: '#f44', isWave: false,
    };
    Object.assign(exp, defaults, config);
    explosions.push(exp);
}

export function addHitExplosion(config) {
    const hit = ObjectPools.getEffect();
    const defaults = {
        x: 0, y: 0, color: '#fff', startTime: performance.now(), duration: 220,
    };
    Object.assign(hit, defaults, config);
    hitExplosions.push(hit);
}

export function addPickupFX(config) {
    const pfx = ObjectPools.getEffect();
    Object.assign(pfx, {
        x: 0, y: 0, color: '#fff', start: performance.now(), duration: 500,
        ...config
    });
    pickupFX.push(pfx);
}

export function addTrail(config) {
    const trail = ObjectPools.getEffect();
    Object.assign(trail, {
        x: 0, y: 0, endX: 0, endY: 0, startTime: performance.now(),
        duration: 10000, width: 6,
        ...config
    });
    trails.push(trail);
}

export function addPoisonBubble(config) {
    const bubble = ObjectPools.getEffect();
    Object.assign(bubble, {
        x: 0, y: 0, startTime: performance.now(), duration: 1200,
        radius: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.2, // Hơi bay lên
        ...config
    });
    poisonBubbles.push(bubble);
}

export function addTelegraph(config) {
    const telegraph = ObjectPools.getEffect();
    Object.assign(telegraph, {
        x: 0,
        y: 0,
        radius: 80,
        startTime: performance.now(),
        duration: 600,
        color: 'rgba(248, 113, 113, 0.25)',
        strokeColor: '#f43f5e',
        lineWidth: 3,
        shape: 'circle',
        endX: 0,
        endY: 0,
        width: 60,
        height: 60,
        pulse: true,
        ringColor: null,
        crosshairColor: 'rgba(255,255,255,0.85)',
        label: null,
        labelColor: '#ffffff',
        icon: null,
        ...config
    });
    telegraphs.push(telegraph);
}

export function triggerNukeAnimation() {
    // 1. Màn hình trắng xóa
    nukeFlash.startTime = performance.now();
    nukeFlash.duration = 400; // Flash trong 0.4 giây
    nukeFlash.alpha = 1.0;

    // 2. Kích hoạt rung màn hình
    screenShake.startTime = performance.now();
    screenShake.duration = 800; // Rung trong 0.8 giây
    screenShake.intensity = 15; // Cường độ rung

    // 3. Tạo vụ nổ chính ở trung tâm (nhiều lớp)
    // Lớp ngoài cùng - trắng sáng
    addExplosion({
        x: W / 2, y: H / 2,
        radius: 300,
        duration: 600,
        color: '#fff',
        isWave: false
    });
    // Lớp bên trong - màu cam/vàng của nuke
    addExplosion({
        x: W / 2, y: H / 2,
        radius: 220,
        duration: 700,
        startTime: performance.now() + 50, // Nổ sau một chút
        color: BUFF_COLORS.nuke || '#ffe76b',
        isWave: false
    });

    // 4. Tạo sóng xung kích khổng lồ
    addExplosion({
        x: W / 2, y: H / 2,
        radius: W, // Lan tỏa ra toàn màn hình
        duration: 1000,
        color: BUFF_COLORS.nuke || '#ffe76b',
        isWave: true
    });
}

export function clearAnimations() {
    explosions.length = 0;
    hitExplosions.length = 0;
    pickupFX.length = 0;
    trails.length = 0;
    telegraphs.length = 0;
    nukeFlash.alpha = 0;

    screenShake.intensity = 0;
    poisonBubbles.length = 0;
}

// --- Update & Cleanup ---

export function updateAnimations(now) {
    // Cleanup expired effects
    for (let i = explosions.length - 1; i >= 0; i--) {
        if (now - explosions[i].startTime >= explosions[i].duration) {
            ObjectPools.returnEffect(explosions.splice(i, 1)[0]);
        }
    }
    for (let i = hitExplosions.length - 1; i >= 0; i--) {
        if (now - hitExplosions[i].startTime >= hitExplosions[i].duration) {
            ObjectPools.returnEffect(hitExplosions.splice(i, 1)[0]);
        }
    }
    for (let i = pickupFX.length - 1; i >= 0; i--) {
        if (now - pickupFX[i].start >= pickupFX[i].duration) {
            ObjectPools.returnEffect(pickupFX.splice(i, 1)[0]);
        }
    }
    for (let i = trails.length - 1; i >= 0; i--) {
        if (now - trails[i].startTime >= trails[i].duration) {
            ObjectPools.returnEffect(trails.splice(i, 1)[0]);
        }
    }
    for (let i = telegraphs.length - 1; i >= 0; i--) {
        if (now - telegraphs[i].startTime >= telegraphs[i].duration) {
            ObjectPools.returnEffect(telegraphs.splice(i, 1)[0]);
        }
    }

    for (let i = poisonBubbles.length - 1; i >= 0; i--) {
        const bubble = poisonBubbles[i];
        if (now - bubble.startTime >= bubble.duration) {
            ObjectPools.returnEffect(poisonBubbles.splice(i, 1)[0]);
        } else {
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
        }
    }

    // Update nuke flash
    if (nukeFlash.alpha > 0) {
        const elapsed = now - nukeFlash.startTime;
        if (elapsed >= nukeFlash.duration) {
            nukeFlash.alpha = 0;
        } else {
            nukeFlash.alpha = 1 - (elapsed / nukeFlash.duration);
        }
    }

    // Update screen shake
    if (screenShake.intensity > 0) {
        const elapsed = now - screenShake.startTime;
        if (elapsed >= screenShake.duration) {
            screenShake.intensity = 0;
        } else {
            screenShake.intensity = Math.max(0, 15 * (1 - elapsed / screenShake.duration));
        }
    }
}

// --- Rendering ---

export function renderAnimations(ctx, now) {
    // Draw telegraphs first so other FX render on top
    if (telegraphs.length > 0) {
        ctx.save();
        telegraphs.forEach(tg => {
            const elapsed = now - tg.startTime;
            const progress = Math.min(1, elapsed / tg.duration);
            if (progress >= 1) return;
            const pulse = tg.pulse ? (0.8 + Math.sin(progress * Math.PI * 2) * 0.2) : 1;
            const alpha = (1 - progress * 0.85) * pulse;
            const baseColor = tg.color || 'rgba(248, 113, 113, 0.25)';
            const strokeColor = tg.strokeColor || '#f43f5e';

            if (tg.shape !== 'circle') {
                ctx.globalAlpha = alpha;
                ctx.lineWidth = tg.lineWidth || 3;
                ctx.strokeStyle = strokeColor;
                ctx.fillStyle = baseColor;
                switch (tg.shape) {
                    case 'rect': {
                        const w = tg.width || 60;
                        const h = tg.height || 60;
                        ctx.fillRect(tg.x - w / 2, tg.y - h / 2, w, h);
                        ctx.strokeRect(tg.x - w / 2, tg.y - h / 2, w, h);
                        break;
                    }
                    case 'line': {
                        ctx.beginPath();
                        ctx.moveTo(tg.x, tg.y);
                        ctx.lineTo(tg.endX, tg.endY);
                        ctx.stroke();
                        break;
                    }
                }
                return;
            }

            const radius = tg.radius || 60;
            const gradient = ctx.createRadialGradient(tg.x, tg.y, 0, tg.x, tg.y, radius);
            gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
            gradient.addColorStop(0.55, baseColor);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.globalAlpha = alpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(tg.x, tg.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = tg.lineWidth || 3;
            ctx.strokeStyle = strokeColor;
            ctx.stroke();

            // Rotating dashed ring (stays within radius)
            ctx.save();
            ctx.translate(tg.x, tg.y);
            ctx.rotate(progress * Math.PI * 2);
            ctx.setLineDash([10, 10]);
            ctx.lineWidth = (tg.lineWidth || 3) + 2;
            ctx.strokeStyle = tg.ringColor || strokeColor;
            ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.setLineDash([]);

            // Crosshair accent
            ctx.save();
            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = tg.crosshairColor || 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 1.5;
            const crossLength = radius;
            ctx.beginPath();
            ctx.moveTo(tg.x - crossLength, tg.y);
            ctx.lineTo(tg.x + crossLength, tg.y);
            ctx.moveTo(tg.x, tg.y - crossLength);
            ctx.lineTo(tg.x, tg.y + crossLength);

            ctx.stroke();
            ctx.restore();

            // Optional icon / label text
            if (tg.icon || tg.label) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = tg.labelColor || '#ffffff';
                if (tg.icon) {
                    ctx.font = tg.iconFont || '600 20px "Segoe UI Symbol", sans-serif';
                    ctx.fillText(tg.icon, tg.x, tg.y - (tg.label ? 10 : 0));
                }
                if (tg.label) {
                    ctx.font = tg.labelFont || '600 15px "Segoe UI", sans-serif';
                    const offset = tg.icon ? 14 : 0;
                    ctx.fillText(tg.label, tg.x, tg.y + offset);
                }
                ctx.restore();
            }
        });
        ctx.restore();
    }

    // Draw trails
    if (trails.length > 0) { // Nâng cấp hiệu ứng vệt dung nham
        ctx.save();
        trails.forEach(trail => {
            const elapsed = now - trail.startTime;
            if (elapsed >= trail.duration) return;
            const progress = elapsed / trail.duration;
            const alpha = 1 - progress * 0.7; // Mờ dần nhanh hơn một chút
            const time = now * 0.005;

            const dx = trail.endX - trail.x;
            const dy = trail.endY - trail.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 1) return;

            const nx = dx / dist;
            const ny = dy / dist;

            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 12;

            // Vẽ một chuỗi các hình tròn "sôi sục" thay vì một đường thẳng
            const segments = Math.max(1, Math.floor(dist / 4));
            for (let i = 0; i < segments; i++) {
                const segmentProgress = i / segments;
                const x = trail.x + nx * (dist * segmentProgress);
                const y = trail.y + ny * (dist * segmentProgress);

                const pulse = 0.8 + 0.2 * Math.sin(time * 8 + i * 0.5);
                const radius = (trail.width / 2) * pulse * (1 - progress * 0.3); // Co lại khi mờ dần

                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, 'rgba(255, 255, 200, 1)'); // Lõi trắng-vàng
                gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.8)');
                gradient.addColorStop(1, 'rgba(200, 0, 0, 0.6)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();
    }

    // Draw explosions
    if (explosions.length > 0) {
        ctx.save();
        explosions.forEach(exp => {
            const elapsed = now - exp.startTime;
            const progress = elapsed / exp.duration;
            const alpha = 1 - progress;
            const currentRadius = Math.max(0, exp.radius * (0.5 + progress * 0.5));
            
            if (exp.isWave) {
                ctx.save();
                ctx.globalAlpha = alpha * 0.4;
                ctx.strokeStyle = exp.color || '#6366f1';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            } else {
            ctx.globalAlpha = alpha * 0.6;
            ctx.fillStyle = exp.color || '#f44';
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
        ctx.restore();
    }

    // Draw hit explosions
    if (hitExplosions.length > 0) {
        ctx.save();
        hitExplosions.forEach(exp => {
            const elapsed = now - exp.startTime;
            const progress = Math.min(1, elapsed / exp.duration);
            const alpha = 1 - progress;
            const radius = 10 + progress * 12;
            ctx.globalAlpha = alpha * 0.85;
            ctx.fillStyle = exp.color || '#fff';
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // Draw pickup effects
    if (pickupFX.length > 0) {
        ctx.save();
        ctx.lineWidth = 2;
        pickupFX.forEach(fx => {
            const elapsed = now - fx.start;
            const progress = Math.min(1, elapsed / fx.duration);
            const radius = 8 + progress * 40;
            const alpha = 0.75 * (1 - progress);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = fx.color || '#fff';
            ctx.beginPath();
            ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.restore();
    }

    // Draw poison bubbles
    if (poisonBubbles.length > 0) {
        ctx.save();
        poisonBubbles.forEach(bubble => {
            const elapsed = now - bubble.startTime;
            const progress = Math.min(1, elapsed / bubble.duration);
            const alpha = Math.sin((1 - progress) * Math.PI); // Fade in and out
            const radius = bubble.radius * (1 - progress * 0.5); // Shrink over time

            ctx.globalAlpha = alpha * 0.8;
            ctx.fillStyle = BUFF_COLORS.poison;
            ctx.shadowColor = BUFF_COLORS.poison;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }
}