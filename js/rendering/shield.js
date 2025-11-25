import { BUFF_COLORS } from '../constants.js';

export function drawShieldEffect(ctx, tank, now) { // Nâng cấp hiệu ứng khiên
    const shieldState = tank.activeEffects && tank.activeEffects.shield;
    if (!shieldState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (shieldState.meta && shieldState.meta.color) || BUFF_COLORS.shield;
    const shieldRadius = radius + 12;
    const time = now * 0.001;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Lõi năng lượng bên trong
    const corePulse = 0.8 + 0.2 * Math.sin(time * 2.5);
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, shieldRadius);
    coreGradient.addColorStop(0, 'rgba(173, 216, 230, 0.05)');
    coreGradient.addColorStop(0.7, 'rgba(107, 200, 255, 0.15)');
    coreGradient.addColorStop(1, 'rgba(107, 200, 255, 0.3)');
    ctx.fillStyle = coreGradient;
    ctx.globalAlpha = corePulse;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vỏ khiên chính và hiệu ứng gợn sóng
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Vỏ ngoài
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Gợn sóng năng lượng đối xứng, lan tỏa từ tâm
    const waveProgress = (time * 0.8) % 1; // Tăng tốc độ một chút
    const waveY = shieldRadius * waveProgress;
    
    // Vẽ 2 gợn sóng đối xứng
    for (let i = -1; i <= 1; i += 2) {
        const currentY = waveY * i;
        const waveRadius = Math.sqrt(shieldRadius * shieldRadius - currentY * currentY);
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = Math.sin(waveProgress * Math.PI) * 0.6; // Độ mờ mềm mại hơn
        ctx.beginPath();
        ctx.arc(0, currentY, waveRadius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    // 3. Hạt năng lượng bay xung quanh
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = time * 0.5 + (i / particleCount) * Math.PI * 2;
        const pX = Math.cos(angle) * shieldRadius;
        const pY = Math.sin(angle) * shieldRadius;
        ctx.fillStyle = `rgba(200, 230, 255, ${0.5 + Math.sin(time * 3 + i) * 0.4})`;
        ctx.beginPath();
        ctx.arc(pX, pY, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}