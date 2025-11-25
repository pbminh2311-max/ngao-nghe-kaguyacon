import { BUFF_COLORS } from '../constants.js';

export function drawPoisonEffect(ctx, tank, now) {
    const poisonState = tank.activeEffects && tank.activeEffects.poisonBullet;
    if (!poisonState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (poisonState.meta && poisonState.meta.color) || BUFF_COLORS.poison;
    const time = now * 0.002;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vũng độc sủi bọt dưới chân
    const poolRadius = radius + 10;
    const poolGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, poolRadius);
    poolGradient.addColorStop(0, 'rgba(108, 255, 95, 0.3)');
    poolGradient.addColorStop(0.7, 'rgba(50, 200, 40, 0.15)');
    poolGradient.addColorStop(1, 'rgba(20, 150, 10, 0)');
    ctx.fillStyle = poolGradient;
    ctx.beginPath();
    ctx.arc(0, 0, poolRadius + Math.sin(time * 3) * 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Bong bóng khí độc bay lên
    const bubbleCount = 8;
    for (let i = 0; i < bubbleCount; i++) {
        const lifeTime = 3000;
        const pProgress = ((now + i * (lifeTime / bubbleCount)) % lifeTime) / lifeTime;
        const startAngle = (i * 1.375) * Math.PI * 2;
        const startRadius = Math.random() * poolRadius * 0.8;
        
        const upwardMovement = pProgress * 35;
        const horizontalWobble = Math.sin(pProgress * Math.PI * 4 + startAngle) * 8;
        
        const particleX = Math.cos(startAngle) * startRadius + horizontalWobble;
        const particleY = Math.sin(startAngle) * startRadius - upwardMovement;
        
        const pAlpha = Math.sin(pProgress * Math.PI) * 0.7;
        const pSize = (1 - pProgress) * 4 + 1;

        ctx.globalAlpha = pAlpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particleX, particleY, pSize, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}