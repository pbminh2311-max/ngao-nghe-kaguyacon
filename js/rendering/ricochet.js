import { BUFF_COLORS } from '../constants.js';

export function drawRicochetEffect(ctx, tank, now) {
    const ricochetState = tank.activeEffects && tank.activeEffects.ricochet;
    if (!ricochetState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (ricochetState.meta && ricochetState.meta.color) || BUFF_COLORS.ricochet;
    const time = now * 0.002;
    const containerRadius = radius + 20;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vẽ trường lực chứa
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, containerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Vẽ các quả cầu năng lượng nảy bật
    const ballCount = 4;
    for (let i = 0; i < ballCount; i++) {
        const angle = time * (i % 2 === 0 ? 1 : -1.2) + (i / ballCount) * Math.PI * 2;
        const bounceProgress = (time * 1.5 + i * 0.7) % 1; // 0 -> 1
        const bounceHeight = Math.sin(bounceProgress * Math.PI); // 0 -> 1 -> 0

        const ballRadius = radius + bounceHeight * (containerRadius - radius - 4);

        const bX = Math.cos(angle) * ballRadius;
        const bY = Math.sin(angle) * ballRadius;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.5 + bounceHeight * 0.5;
        ctx.beginPath();
        ctx.arc(bX, bY, 3 + bounceHeight * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

export function drawRicochetBarrelEffect(ctx, tank, barrelMetrics, now) {
    const ricochetState = tank.activeEffects && tank.activeEffects.ricochet;
    if (!ricochetState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (ricochetState.meta && ricochetState.meta.color) || BUFF_COLORS.ricochet;
    const time = now * 0.01; // Animation speed
    const pulse = Math.sin(time * 2); // Faster pulse for energy
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.shadowColor = color;

    // 1. Pulsating glow around the barrel
    ctx.shadowBlur = 10 + pulse * 5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + pulse * 1;
    ctx.globalAlpha = 0.6 + pulse * 0.3;
    ctx.beginPath();
    ctx.rect(barrelStartX, barrelY, barrelWidth, barrelHeight);
    ctx.stroke();

    // 2. Small energy arcs/pings at the barrel end
    ctx.shadowBlur = 0; // Remove shadow for these small details
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    const pingCount = 3;
    for (let i = 0; i < pingCount; i++) {
        const pingPhase = (time * 3 + i * Math.PI / pingCount) % (Math.PI * 2);
        const pingAlpha = Math.sin(pingPhase); // Fade in/out
        if (pingAlpha > 0) {
            const pingX = barrelEnd + 2 + Math.cos(pingPhase * 0.5) * 4;
            const pingY = (barrelY + barrelHeight / 2) + Math.sin(pingPhase * 0.8) * (barrelHeight / 2);
            const pingSize = 2 + pingAlpha * 1.5;
            ctx.globalAlpha = pingAlpha * 0.7;
            ctx.beginPath();
            ctx.arc(pingX, pingY, pingSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}