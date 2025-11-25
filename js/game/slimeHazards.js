const slimePuddles = [];
let puddleIdCounter = 1;

export function isPointInsidePuddle(puddle, x = 0, y = 0) {
    if (!puddle) return false;
    const dx = x - puddle.x;
    const dy = y - puddle.y;
    return dx * dx + dy * dy <= Math.pow(puddle.radius, 2);
}

export function addSlimePuddle(config = {}) {
    const now = performance.now();
    const type = config.type || 'sticky';
    const duration = Math.max(500, config.duration || 4000);
    const puddle = {
        id: config.id || `puddle_${puddleIdCounter++}`,
        type,
        x: config.x || 0,
        y: config.y || 0,
        radius: Math.max(20, config.radius || 80),
        createdAt: now,
        duration,
        expiresAt: now + duration,
        slowPlayerFactor: config.slowPlayerFactor ?? (type === 'sticky' ? 0.65 : 1),
        slowBulletFactor: config.slowBulletFactor ?? (type === 'sticky' ? 0.75 : 1),
        visionAlpha: config.visionAlpha ?? (type === 'vision' ? 0.6 : 0),
        color: config.color || (type === 'vision' ? '#1e293b' : '#34d399'),
        pulse: config.pulse ?? (type === 'vision' ? 0.08 : 0.12),
        damagePerSecond: config.damagePerSecond || 0,
        playerDamageDebuff: config.playerDamageDebuff ?? 1,
        bossSpeedBuff: config.bossSpeedBuff ?? 1,
        createdBy: config.createdBy || null,
    };
    slimePuddles.push(puddle);
    return puddle;
}

export function updateSlimePuddles(now = performance.now()) {
    for (let i = slimePuddles.length - 1; i >= 0; i--) {
        const puddle = slimePuddles[i];
        if (now >= puddle.expiresAt) {
            slimePuddles.splice(i, 1);
        }
    }
}

export function clearSlimePuddles() {
    slimePuddles.length = 0;
}

export function getSlimePuddles() {
    return slimePuddles;
}

export function getCorrosivePuddleAt(x = 0, y = 0) {
    for (let i = slimePuddles.length - 1; i >= 0; i--) {
        const puddle = slimePuddles[i];
        if (puddle.type !== 'corrosive') continue;
        if (isPointInsidePuddle(puddle, x, y)) {
            return puddle;
        }
    }
    return null;
}

export function getPlayerPuddleSlowFactor(x = 0, y = 0) {
    let slowest = 1;
    for (const puddle of slimePuddles) {
        if (puddle.type !== 'sticky') continue;
        if (!isPointInsidePuddle(puddle, x, y)) continue;
        slowest = Math.min(slowest, puddle.slowPlayerFactor ?? 1);
    }
    return slowest;
}

export function getBulletPuddleSlowFactor(x = 0, y = 0) {
    let slowest = 1;
    for (const puddle of slimePuddles) {
        if (!isPointInsidePuddle(puddle, x, y)) continue;
        slowest = Math.min(slowest, puddle.slowBulletFactor ?? 1);
    }
    return slowest;
}

export function drawSlimePuddles(ctx, now = performance.now()) {
    if (!ctx || slimePuddles.length === 0) return;
    ctx.save();
    slimePuddles.forEach((puddle, index) => {
        const ageRatio = Math.max(0, Math.min(1, (now - puddle.createdAt) / puddle.duration));
        const baseAlpha = puddle.type === 'vision' ? puddle.visionAlpha : 0.35;
        const alpha = Math.max(0.1, baseAlpha * (1 - ageRatio * 0.6));
        const pulse = 1 + Math.sin(now * 0.002 + index) * (puddle.pulse || 0.05);
        const radius = puddle.radius * pulse;

        ctx.globalAlpha = alpha;
        const gradient = ctx.createRadialGradient(puddle.x, puddle.y, radius * 0.1, puddle.x, puddle.y, radius);
        gradient.addColorStop(0, `${puddle.color}99`);
        gradient.addColorStop(1, `${puddle.color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(puddle.x, puddle.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (puddle.type === 'vision') {
            ctx.globalAlpha = alpha * 0.9;
            ctx.fillStyle = 'rgba(15,23,42,0.35)';
            ctx.beginPath();
            ctx.arc(puddle.x, puddle.y, radius * 0.65, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.restore();
}
