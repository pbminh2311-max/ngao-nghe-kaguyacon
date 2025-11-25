import { BUFF_COLORS } from '../constants.js';

export function drawRootEffect(ctx, tank, now) {
    const rootState = tank.activeEffects && tank.activeEffects.root;
    if (!rootState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (rootState.meta && rootState.meta.color) || BUFF_COLORS.root;
    const time = now * 0.002;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vòng ma thuật đất
    const groundRadius = radius + 15;
    const pulse = 0.7 + 0.3 * Math.sin(time * 3);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 * pulse;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, groundRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Rễ cây gai góc quấn quanh
    const numVines = 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < numVines; i++) {
        const angleOffset = (i / numVines) * Math.PI * 2 + time * 0.5;
        const vinePulse = Math.sin(time * 5 + i * 2);

        ctx.globalAlpha = 0.7 + 0.2 * vinePulse;
        ctx.beginPath();
        for (let j = 0; j <= 20; j++) {
            const progress = j / 20;
            const angle = angleOffset + progress * Math.PI * 1.5;
            const r = radius + 2 + progress * 10 + Math.sin(angle * 3) * 3 + vinePulse * 2;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // 3. Hạt bụi đất bị hút vào
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const life = ((time * 1.5 + i * 1.37) % 1); // Chu kỳ từ 0 đến 1
        const angle = (i / particleCount) * Math.PI * 2 + time * 0.4;
        const currentDist = radius + 20 - life * 18; // Di chuyển vào trong
        const x = Math.cos(angle) * currentDist;
        const y = Math.sin(angle) * currentDist;
        ctx.globalAlpha = (1 - life) * 0.6; // Mờ dần khi đến gần
        ctx.beginPath();
        ctx.arc(x, y, (1 - life) * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}