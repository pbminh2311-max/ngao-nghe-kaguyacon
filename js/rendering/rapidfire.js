import { BUFF_COLORS } from '../constants.js';

export function drawRapidfireEffect(ctx, tank, now) {
    const rapidfireState = tank.activeEffects && tank.activeEffects.rapidfire;
    if (!rapidfireState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (rapidfireState.meta && rapidfireState.meta.color) || BUFF_COLORS.rapidfire;
    const time = now * 0.005; // General time for animation

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vòng năng lượng bên ngoài pulsating
    const pulse = 0.8 + 0.2 * Math.sin(time * 4);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2.5 * pulse;
    ctx.globalAlpha = 0.6 + 0.3 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Các hạt năng lượng di chuyển nhanh về trung tâm
    const particleCount = 10;
    const particleSpeed = 0.02; // Tốc độ hạt di chuyển
    const spawnRadius = radius + 25; // Bán kính xuất hiện hạt
    const despawnRadius = radius * 0.5; // Bán kính biến mất hạt

    for (let i = 0; i < particleCount; i++) {
        const particlePhase = (time * particleSpeed * (i % 2 === 0 ? 1 : -1) + (i / particleCount) * Math.PI * 2) % (Math.PI * 2);
        const currentProgress = (time * 0.01 + i * 0.1) % 1; // Chu kỳ 0 đến 1 cho mỗi hạt

        // Tính toán bán kính hiện tại của hạt
        const currentRadius = spawnRadius - (spawnRadius - despawnRadius) * currentProgress;

        if (currentRadius > despawnRadius) {
            const pX = Math.cos(particlePhase) * currentRadius;
            const pY = Math.sin(particlePhase) * currentRadius;

            ctx.globalAlpha = Math.sin(currentProgress * Math.PI) * 0.8; // Hiệu ứng mờ dần/hiện ra
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pX, pY, 1.5 + Math.sin(currentProgress * Math.PI) * 1.5, 0, Math.PI * 2); // Kích thước hạt pulsating
            ctx.fill();
        }
    }
    ctx.restore();
}

export function drawRapidfireBarrelEffect(ctx, tank, barrelMetrics, now) {
    const rapidfireState = tank.activeEffects && tank.activeEffects.rapidfire;
    if (!rapidfireState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (rapidfireState.meta && rapidfireState.meta.color) || BUFF_COLORS.rapidfire;
    const time = now * 0.012; // Tốc độ animation nhanh hơn
    const fastPulse = Math.sin(time * 2.5);
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.shadowColor = color;

    // 1. Nòng súng phát sáng
    ctx.shadowBlur = 12 + fastPulse * 4;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5 + fastPulse * 0.25;
    ctx.fillRect(barrelEnd - 8, barrelY, 8, barrelHeight); // Phần đầu nòng
    ctx.globalAlpha = 0.4 + Math.sin(time) * 0.2;
    ctx.fillRect(barrelStartX, barrelY, 10, barrelHeight); // Phần gốc nòng

    // 2. Các hạt năng lượng/tia lửa bắn ra từ đầu nòng
    ctx.shadowBlur = 0;
    const particleCount = 4;
    for (let i = 0; i < particleCount; i++) {
        const pProgress = ((now + i * 120) % 400) / 400; // Chu kỳ sống ngắn
        const pX = barrelEnd + pProgress * 20;
        const pY = (Math.random() - 0.5) * barrelHeight * 1.4;
        const pSize = (1 - pProgress) * 2.5;
        ctx.fillStyle = `rgba(255, 200, 100, ${1 - pProgress})`;
        ctx.fillRect(pX, pY - pSize/2, pSize * 2, pSize); // Vẽ hạt hình chữ nhật dài
    }
    ctx.restore();
}