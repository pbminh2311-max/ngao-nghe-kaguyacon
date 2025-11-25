import { BUFF_COLORS } from '../constants.js';

export function drawHealEffect(ctx, tank, now) {
    const healState = tank.activeEffects && tank.activeEffects.heal;
    if (!healState) return;

    const radius = tank.displayRadius || tank.r;
    const elapsed = now - healState.startTime;
    const color = BUFF_COLORS.heal || '#6ee7b7';

    ctx.save();

    // 1. Vòng xoáy năng lượng
    const ringRadius = radius + 10;
    const phase = (now * 0.005) % (Math.PI * 2);
    ctx.globalAlpha = 0.5 + Math.sin(phase * 2) * 0.2;
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(110, 231, 183, ${0.4 + Math.sin(phase*3)*0.2})`;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, ringRadius, phase, phase + Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, ringRadius, phase + Math.PI, phase + Math.PI * 2.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Các hạt ánh sáng bay lên
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
        const lifeTime = 2500; // ms
        const pProgress = ((elapsed + i * (lifeTime / particleCount)) % lifeTime) / lifeTime;
        const startAngle = (i * 1.375) * Math.PI * 2;
        const startRadius = radius + 5 + Math.sin(startAngle + phase) * 3;
        const upwardMovement = pProgress * 45;
        const horizontalWobble = Math.sin(pProgress * Math.PI * 2 + startAngle) * 5;
        const particleX = tank.x + Math.cos(startAngle) * startRadius + horizontalWobble;
        const particleY = tank.y + Math.sin(startAngle) * startRadius - upwardMovement;
        const pAlpha = Math.sin(pProgress * Math.PI) * 0.9;
        const pSize = (1.5 + Math.sin(pProgress * Math.PI)) * 1.5;

        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particleX, particleY, pSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}