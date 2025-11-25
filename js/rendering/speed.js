import { BUFF_COLORS } from '../constants.js';

export function drawSpeedEffect(ctx, tank, now) {
    const speedState = tank.activeEffects && tank.activeEffects.speed;
    if (!speedState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (speedState.meta && speedState.meta.color) || BUFF_COLORS.speed;
    const phase = now * 0.008;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);

    // 1. Vệt sáng khí động học
    const pulse = Math.sin(phase * 1.2);
    const wingLength = radius * 1.8 + pulse * 5;
    const wingWidth = radius * 0.8;

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    for (let i = -1; i <= 1; i += 2) {
        ctx.save();
        ctx.scale(1, i);

        const gradient = ctx.createLinearGradient(0, 0, -wingLength, 0);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.globalAlpha = 0.6 + pulse * 0.2;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(0, wingWidth / 2);
        ctx.quadraticCurveTo(-wingLength * 0.6, wingWidth / 3, -wingLength, wingWidth * 1.3);
        ctx.stroke();

        ctx.globalAlpha = 0.3 + pulse * 0.1;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, wingWidth / 2.5);
        ctx.quadraticCurveTo(-wingLength * 0.5, wingWidth / 4, -wingLength * 1.1, wingWidth * 1.1);
        ctx.stroke();

        ctx.restore();
    }
    ctx.restore();

    // 2. Lửa động cơ
    if (tank.speed > 0.1) {
        const particleCount = 8;
        const lifeTime = 500;
        const spread = 12;

        for (let i = 0; i < particleCount; i++) {
            const pProgress = ((now + i * (lifeTime / particleCount)) % lifeTime) / lifeTime;
            const distance = radius + pProgress * 35;
            const angleOffset = (Math.random() - 0.5) * (spread / distance);
            
            const pX = tank.x - Math.cos(tank.angle + angleOffset) * distance;
            const pY = tank.y - Math.sin(tank.angle + angleOffset) * distance;

            const pAlpha = Math.sin(pProgress * Math.PI) * 0.9;
            const pSize = (1 - pProgress) * (4 + Math.random() * 3);

            ctx.save();
            ctx.globalAlpha = pAlpha;

            const fireGradient = ctx.createRadialGradient(pX, pY, 0, pX, pY, pSize);
            fireGradient.addColorStop(0, 'rgba(255, 235, 150, 1)');
            fireGradient.addColorStop(0.6, color);
            fireGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

            ctx.fillStyle = fireGradient;
            ctx.shadowColor = 'orange';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}