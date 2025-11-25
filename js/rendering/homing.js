import { BUFF_COLORS } from '../constants.js';

export function drawHomingTargetMarker(ctx, tank, now) {
    if (!tank.isHomingTarget) return;

    const radius = tank.displayRadius || tank.r;
    const time = now * 0.004;
    const color = BUFF_COLORS.homing || '#ff0';

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vòng tròn quét
    const scanProgress = (time * 0.8) % 1;
    const scanRadius = radius + 20;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = Math.sin(scanProgress * Math.PI) * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, scanRadius * scanProgress, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Tâm ngắm và các dấu ngoặc
    const pulse = Math.sin(time * 5);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7 + pulse * 0.3;

    // Tâm ngắm trung tâm
    const crosshairSize = 4 + pulse * 2;
    ctx.beginPath();
    ctx.moveTo(-crosshairSize, 0);
    ctx.lineTo(crosshairSize, 0);
    ctx.moveTo(0, -crosshairSize);
    ctx.lineTo(0, crosshairSize);
    ctx.stroke();

    // Dấu ngoặc bao quanh
    const bracketSize = 10;
    const bracketDist = radius + 12 + pulse * 2;
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 2 + time * 0.5);
        ctx.beginPath();
        ctx.arc(0, bracketDist, bracketSize, Math.PI * 0.8, Math.PI * 1.2);
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

export function drawHomingBarrelEffect(ctx, tank, barrelMetrics, now) {
    const homingState = tank.activeEffects && tank.activeEffects.homing;
    if (!homingState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (homingState.meta && homingState.meta.color) || BUFF_COLORS.homing;
    const time = now * 0.008;
    const pulse = 0.5 + 0.5 * Math.sin(time);
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    // 1. Năng lượng hội tụ ở đầu nòng
    const gradient = ctx.createRadialGradient(barrelEnd, 0, 0, barrelEnd, 0, 8 * pulse);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(barrelEnd, 0, 8 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Các đường năng lượng chạy dọc nòng súng
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = color;
    const lineProgress = (time * 0.5) % 1;
    ctx.fillRect(barrelStartX + barrelWidth * lineProgress, barrelY, 10, 1);
    ctx.fillRect(barrelStartX + barrelWidth * lineProgress, barrelY + barrelHeight - 1, 10, 1);

    // Tia laser dẫn đường (nếu có mục tiêu)
    ctx.globalAlpha = 0.2 + pulse * 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(barrelEnd, barrelY + barrelHeight / 2 - 0.5, 50, 1);
    ctx.restore();
}