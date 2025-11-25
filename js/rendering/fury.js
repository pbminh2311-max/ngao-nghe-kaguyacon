import { BUFF_COLORS } from '../constants.js';

export function drawFuryEffect(ctx, tank, now) {
    const furyState = tank.activeEffects && tank.activeEffects.fury;
    if (!furyState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (furyState.meta && furyState.meta.color) || BUFF_COLORS.fury;
    const time = now * 0.004;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Hào quang lửa giận
    const flameCount = 16;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    for (let i = 0; i < flameCount; i++) {
        const angle = (i / flameCount) * Math.PI * 2;
        const pulse1 = Math.sin(time * 6 + i * 2.5);
        const pulse2 = Math.sin(time * 4 + i * 1.5);

        const startRadius = radius + 8;
        const endRadius = radius + 18 + pulse1 * 6;

        const gradient = ctx.createLinearGradient(
            Math.cos(angle) * startRadius, Math.sin(angle) * startRadius,
            Math.cos(angle) * endRadius, Math.sin(angle) * endRadius
        );
        gradient.addColorStop(0, 'rgba(255, 100, 80, 0)');
        gradient.addColorStop(0.5, `rgba(255, 50, 50, ${0.6 + pulse2 * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 200, 150, 0.1)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 + pulse2 * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
        ctx.lineTo(Math.cos(angle) * endRadius, Math.sin(angle) * endRadius);
        ctx.stroke();
    }

    // 2. Than hồng bay lên
    const emberCount = 8;
    for (let i = 0; i < emberCount; i++) {
        const lifeTime = 2000;
        const pProgress = ((now + i * (lifeTime / emberCount)) % lifeTime) / lifeTime;
        const startAngle = (i * 1.375) * Math.PI * 2;
        const startRadius = Math.random() * radius * 0.8;
        const upwardMovement = pProgress * 40;
        const horizontalWobble = Math.sin(pProgress * Math.PI * 3 + startAngle) * 10;

        const pX = Math.cos(startAngle) * startRadius + horizontalWobble;
        const pY = Math.sin(startAngle) * startRadius - upwardMovement;

        const pAlpha = Math.sin(pProgress * Math.PI) * 0.9;
        const pSize = (1 - pProgress) * 3 + 1;

        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = `rgba(255, 180, 100, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(pX, pY, pSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function drawFuryBarrelEffect(ctx, tank, barrelMetrics, now) {
    const furyState = tank.activeEffects && tank.activeEffects.fury;
    if (!furyState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (furyState.meta && furyState.meta.color) || BUFF_COLORS.fury;
    const time = now * 0.008;
    const pulse = 0.8 + 0.2 * Math.sin(time * 5);

    ctx.save();
    const gradient = ctx.createLinearGradient(barrelStartX, 0, barrelStartX + barrelWidth, 0);
    gradient.addColorStop(0, 'rgba(127, 29, 29, 0.8)');
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, `rgba(255, 150, 100, ${pulse})`);
    ctx.fillStyle = gradient;
    ctx.shadowColor = `rgba(255, 100, 80, ${pulse})`;
    ctx.shadowBlur = 15;
    ctx.fillRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
    ctx.restore();
}