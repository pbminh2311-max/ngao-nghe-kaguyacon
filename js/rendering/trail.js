import { BUFF_COLORS } from '../constants.js';

export function drawTrailEffect(ctx, tank, now) {
    const trailState = tank.activeEffects && tank.activeEffects.trailBullet;
    if (!trailState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (trailState.meta && trailState.meta.color) || BUFF_COLORS.trail;
    const time = now * 0.003;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vũng dung nham sôi sục
    const poolRadius = radius + 8;
    const poolGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, poolRadius);
    poolGradient.addColorStop(0, 'rgba(255, 180, 50, 0.5)');
    poolGradient.addColorStop(0.6, 'rgba(255, 80, 0, 0.3)');
    poolGradient.addColorStop(1, 'rgba(200, 20, 0, 0)');
    ctx.fillStyle = poolGradient;
    ctx.beginPath();
    ctx.arc(0, 0, poolRadius + Math.sin(time * 4) * 3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Các mảnh vỡ nóng chảy bắn ra
    const sparkCount = 7;
    for (let i = 0; i < sparkCount; i++) {
        const life = ((time * 1.5 + i * 1.37) % 1);
        const angle = (i / sparkCount) * Math.PI * 2 + time * 0.5;
        const startRadius = radius + 5;
        const endRadius = radius + 20;
        const currentRadius = startRadius + (endRadius - startRadius) * life;

        const x = Math.cos(angle) * currentRadius;
        const y = Math.sin(angle) * currentRadius;

        ctx.fillStyle = `rgba(255, 220, 150, ${Math.sin(life * Math.PI) * 0.9})`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, (1 - life) * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}