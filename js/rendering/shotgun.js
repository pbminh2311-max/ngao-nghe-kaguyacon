import { BUFF_COLORS } from '../constants.js';

export function drawShotgunEffect(ctx, tank, now) {
    const shotgunState = tank.activeEffects && tank.activeEffects.shotgun;
    if (!shotgunState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (shotgunState.meta && shotgunState.meta.color) || BUFF_COLORS.shotgun;
    const time = now * 0.003;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle); // Xoay hiệu ứng theo xe tăng

    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;

    // Vẽ 3 vệt năng lượng xoay quanh
    const spreadAngle = Math.PI * 2 / 3;
    for (let i = 0; i < 3; i++) {
        const angle = time + i * spreadAngle;
        const pulse = 0.8 + 0.2 * Math.sin(time * 4 + i);
        const startRadius = radius + 8;
        const endRadius = radius + 18;

        ctx.globalAlpha = 0.4 + pulse * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, (startRadius + endRadius) / 2, angle, angle + Math.PI * 0.4);
        ctx.stroke();
    }
    ctx.restore();
}

export function drawShotgunBarrelEffect(ctx, tank, barrelMetrics, now) {
    const shotgunState = tank.activeEffects && tank.activeEffects.shotgun;
    if (!shotgunState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (shotgunState.meta && shotgunState.meta.color) || BUFF_COLORS.shotgun;
    const time = now * 0.008;
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Vẽ 3 họng súng phát sáng
    for (let i = -1; i <= 1; i++) {
        const pulse = 0.5 + 0.5 * Math.sin(time + i * 2);
        ctx.globalAlpha = 0.4 + pulse * 0.5;
        ctx.beginPath();
        ctx.arc(barrelEnd, i * (barrelHeight * 0.6), 2.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}