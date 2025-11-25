import { BUFF_COLORS } from '../constants.js';

export function drawGiantEnemyEffect(ctx, tank, now) {
    const giantState = tank.activeEffects && tank.activeEffects.giantEnemy;
    if (!giantState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (giantState.meta && giantState.meta.color) || BUFF_COLORS.giantEnemy;
    const time = now * 0.002; // Tốc độ chậm hơn để tạo cảm giác nặng nề

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Hào quang áp bức, tối màu
    const outerPulse = 0.7 + 0.3 * Math.sin(time * 2.5);
    ctx.strokeStyle = `rgba(192, 38, 211, 0.4)`; // Màu tím đậm hơn
    ctx.lineWidth = 6 * outerPulse;
    ctx.globalAlpha = 0.4 * outerPulse;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Các xúc tu năng lượng bất ổn
    const tendrilCount = 5;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    for (let i = 0; i < tendrilCount; i++) {
        const angle = (i / tendrilCount) * Math.PI * 2 + time * 0.8;
        const life = (time * 1.5 + i * 0.7) % 1; // Chu kỳ từ 0 đến 1
        
        const startRadius = radius + 5;
        const midRadius = radius + 15 + Math.sin(life * Math.PI * 2) * 8;
        const endRadius = radius + 25 + Math.sin(life * Math.PI) * 10;

        ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
        ctx.quadraticCurveTo(
            Math.cos(angle + 0.3) * midRadius, Math.sin(angle + 0.3) * midRadius,
            Math.cos(angle + 0.5) * endRadius, Math.sin(angle + 0.5) * endRadius
        );
        ctx.stroke();
    }

    // 3. Các hạt năng lượng bị hút vào
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const particleCount = 10;
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + time * 0.5;
        const life = ((time * 2 + i * 1.1) % 1);
        const currentRadius = radius + 30 - (life * 25);
        ctx.globalAlpha = (1 - life) * 0.7;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * currentRadius, Math.sin(angle) * currentRadius, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}