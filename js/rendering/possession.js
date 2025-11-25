import { BUFF_COLORS } from '../constants.js';

export function drawPossessionEffect(ctx, tank, now) {
    const possessionState = tank.activeEffects && tank.activeEffects.possession;
    if (!possessionState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (possessionState.meta && possessionState.meta.color) || BUFF_COLORS.possession;
    const time = now * 0.001;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Con mắt thao túng ở trung tâm
    const eyePulse = Math.sin(time * 5);
    const eyeRadius = radius * 0.4 + eyePulse * 1.5;
    const pupilRadius = eyeRadius * 0.5;

    // Vòng ngoài của mắt
    const eyeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeRadius);
    eyeGradient.addColorStop(0, 'rgba(255, 150, 255, 0.8)');
    eyeGradient.addColorStop(1, color);
    ctx.fillStyle = eyeGradient;
    ctx.globalAlpha = 0.7 + eyePulse * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Con ngươi nhìn xung quanh
    const pupilAngle = time * 3;
    const pupilDist = eyeRadius - pupilRadius;
    const pupilX = Math.cos(pupilAngle) * pupilDist * 0.5;
    const pupilY = Math.sin(pupilAngle * 1.3) * pupilDist * 0.5; // Chuyển động không đều
    ctx.fillStyle = '#2e005c';
    ctx.beginPath();
    ctx.arc(pupilX, pupilY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vòng xoáy năng lượng tâm linh
    const spiralCount = 3;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (let i = 0; i < spiralCount; i++) {
        const angleOffset = (i / spiralCount) * Math.PI * 2;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 6 + i);
        ctx.beginPath();
        const startAngle = time * 2 * (i % 2 === 0 ? 1 : -1) + angleOffset;
        ctx.arc(0, 0, radius + 12 + Math.sin(time * 4 + i) * 4, startAngle, startAngle + Math.PI * 1.8);
        ctx.stroke();
    }

    // 3. Dây rối năng lượng
    const stringCount = 3;
    ctx.lineWidth = 1;
    for (let i = 0; i < stringCount; i++) {
        const angle = -Math.PI / 2 + (i - 1) * 0.4; // Hướng lên trên
        const length = 25 + Math.sin(time * 7 + i) * 5;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 8 + i);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.lineTo(Math.cos(angle) * (radius + length), Math.sin(angle) * (radius + length));
        ctx.stroke();
    }

    ctx.restore();
}