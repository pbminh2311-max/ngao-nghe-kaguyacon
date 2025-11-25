import { BUFF_COLORS } from '../constants.js';
import { drawEffectRing } from '../utils.js';

export function drawPierceEffect(ctx, tank, now) {
    const pierceState = tank.activeEffects && tank.activeEffects.pierce;
    if (!pierceState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (pierceState.meta && pierceState.meta.color) || BUFF_COLORS.pierce;
    const time = now * 0.004;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle); // Xoay hiệu ứng theo xe tăng

    // 1. Pulsating, sharp outer aura
    const pulse = 0.8 + 0.2 * Math.sin(time * 5);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2.5 * pulse;
    ctx.globalAlpha = 0.6 + 0.3 * pulse;
    ctx.beginPath();
    // Vẽ hình kim cương hoặc góc cạnh
    ctx.moveTo(radius + 18, 0);
    ctx.lineTo(radius + 10, -(radius + 8));
    ctx.lineTo(-(radius + 18), 0);
    ctx.lineTo(radius + 10, (radius + 8));
    ctx.closePath();
    ctx.stroke();

    // 2. Converging energy lines towards the front
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 3);
    const lineLength = radius + 10;
    const lineOffset = radius + 2;
    for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(lineOffset, i * radius * 0.4);
        ctx.lineTo(lineLength, i * radius * 0.1);
        ctx.stroke();
    }

    ctx.restore();
}