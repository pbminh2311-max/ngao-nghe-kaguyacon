import { BUFF_COLORS } from '../constants.js';

export function drawSilenceEffect(ctx, tank, now) {
    const silenceState = tank.silenced;
    if (!silenceState) return;

    const radius = tank.displayRadius || tank.r;
    const color = BUFF_COLORS.silence || '#b59bff';
    const time = now * 0.0025;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Trường năng lượng áp chế
    const pulse1 = Math.sin(time * 4);
    const outerRadius = radius + 16 + pulse1 * 3;

    const gradient = ctx.createRadialGradient(0, 0, radius, 0, 0, outerRadius);
    gradient.addColorStop(0, 'rgba(181, 155, 255, 0)');
    gradient.addColorStop(0.8, `rgba(181, 155, 255, ${0.1 + pulse1 * 0.05})`);
    gradient.addColorStop(1, `rgba(200, 180, 255, ${0.2 + pulse1 * 0.1})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Biểu tượng "Cấm" xoay tròn
    const glyphCount = 4;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.5;

    for (let i = 0; i < glyphCount; i++) {
        const angle = time + (i / glyphCount) * Math.PI * 2;
        const dist = radius + 12;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        const size = 4;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time * 2); // Xoay tại chỗ
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5 + i);

        ctx.beginPath();
        ctx.moveTo(-size, -size);
        ctx.lineTo(size, size);
        ctx.moveTo(size, -size);
        ctx.lineTo(-size, size);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}