import { BUFF_COLORS } from '../constants.js';

export function drawCloneEffect(ctx, tank, now) {
    const cloneState = tank.activeEffects && tank.activeEffects.clone;
    if (!cloneState) return;

    const radius = tank.displayRadius || tank.r;
    const color = BUFF_COLORS.clone || '#a855f7';
    const time = now * 0.005;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Nhấp nháy màu
    const flashIntensity = 0.7 + 0.3 * Math.sin(time * 10);
    ctx.fillStyle = color;
    ctx.globalAlpha = flashIntensity;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Các tia sáng phóng ra
    const rayCount = 6;
    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const rayLength = 10 + Math.sin(time * 5 + i) * 5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(time * 5 + i) * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
        ctx.stroke();
    }

    ctx.restore();
}