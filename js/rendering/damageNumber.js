import { ObjectPools } from '../state.js';

export let damageNumbers = [];

export function createDamageNumber(x, y, amount, options = {}) {
    const num = ObjectPools.getEffect();
    const defaults = {
        isPlayer: false,
        isHeal: false,
        isCrit: false,
        type: 'physical',
        duration: 1200,
        startTime: performance.now()
    };
    Object.assign(num, defaults, options, { x, y, amount });
    damageNumbers.push(num);
}

export function updateDamageNumbers(now) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const num = damageNumbers[i];
        if (now - num.startTime > num.duration) {
            ObjectPools.returnEffect(damageNumbers.splice(i, 1)[0]);
        } else {
            num.y -= 0.5; // Move up
        }
    }
}

export function renderDamageNumbers(ctx, now) {
    if (damageNumbers.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    damageNumbers.forEach(num => {
        const elapsed = now - num.startTime;
        const progress = elapsed / num.duration;

        const alpha = Math.max(0, 1 - progress * 1.5);
        const scale = 1 + Math.sin(progress * Math.PI) * (num.isCrit ? 0.6 : 0.3);

        ctx.globalAlpha = alpha;
        ctx.font = `${num.isCrit ? 'bold' : 'normal'} ${14 * scale}px Arial`;

        let color;
        if (num.isHeal) {
            color = '#4ade80'; // Green
        } else if (num.type === 'magic') {
            color = '#a78bfa'; // Purple
        } else if (num.isCrit) {
            color = '#f97316'; // Orange
        } else {
            color = '#e2e8f0'; // White/Gray
        }

        const text = (num.isHeal ? '+' : '') + Math.round(num.amount);

        // Draw stroke for readability
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(text, num.x, num.y);

        // Draw fill
        ctx.fillStyle = color;
        ctx.fillText(text, num.x, num.y);
    });

    ctx.restore();
}

export function clearDamageNumbers() {
    damageNumbers.length = 0;
}