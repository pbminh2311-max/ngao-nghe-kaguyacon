import { ObjectPools } from '../state.js';
import { roundRect } from '../utils.js';

// --- State (moved from state.js) ---
export let explosions = [];
export let hitExplosions = [];
export let pickupFX = [];
export let trails = [];

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

export function clearAnimations() {
    explosions.length = 0;
    hitExplosions.length = 0;
    pickupFX.length = 0;
    trails.length = 0;
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
}

// --- Rendering ---

export function renderAnimations(ctx, now) {
    // Draw trails
    trails.forEach(trail => {
        const elapsed = now - trail.startTime;
        if (elapsed >= trail.duration) return;
        const progress = elapsed / trail.duration;
        const alpha = 1 - progress * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = trail.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(trail.endX, trail.endY);
        ctx.stroke();
        ctx.restore();
    });

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
}