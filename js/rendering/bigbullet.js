import { BUFF_COLORS } from '../constants.js';

export function drawBigBulletEffect(ctx, tank, now) { // Nâng cấp hiệu ứng Đạn to
    const bigBulletState = tank.activeEffects && tank.activeEffects.bigBullet;
    if (!bigBulletState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (bigBulletState.meta && bigBulletState.meta.color) || BUFF_COLORS.bigbullet;
    const time = now * 0.002;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Hiệu ứng sét năng lượng phóng ra
    const boltCount = 5;
    for (let i = 0; i < boltCount; i++) {
        const life = ((time * 2 + i * 1.37) % 1);
        if (life < 0.5) { // Chỉ vẽ khi đang trong chu kỳ "sống"
            const angle = (i / boltCount) * Math.PI * 2 + Math.sin(time + i) * 0.2;
            const startRadius = radius + 8;
            const endRadius = radius + 25 + Math.sin(time * 3 + i) * 5;
            
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * startRadius, Math.sin(angle) * startRadius);
            
            // Vẽ tia sét zig-zag
            for (let j = 1; j <= 4; j++) {
                const progress = j / 4;
                const currentRadius = startRadius + (endRadius - startRadius) * progress;
                const offsetAngle = (Math.random() - 0.5) * 0.3;
                ctx.lineTo(Math.cos(angle + offsetAngle) * currentRadius, Math.sin(angle + offsetAngle) * currentRadius);
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5 + Math.sin(life * Math.PI) * 2;
            ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
            ctx.stroke();
        }
    }
    ctx.restore();
}

export function drawBigBulletBarrelEffect(ctx, tank, barrelMetrics, now) { // Nâng cấp hiệu ứng nòng súng
    const bigBulletState = tank.activeEffects && tank.activeEffects.bigBullet;
    if (!bigBulletState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (bigBulletState.meta && bigBulletState.meta.color) || BUFF_COLORS.bigbullet;
    const time = now * 0.005;
    const pulse = Math.sin(time * 2); // Xung nhịp nhanh hơn
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    // Hiệu ứng nòng súng "thở"
    const expansion = 1 + pulse * 0.8;
    ctx.lineWidth = expansion;
    ctx.globalAlpha = 0.6 + pulse * 0.3;
    ctx.strokeRect(barrelStartX, barrelY - expansion / 2 + 0.5, barrelWidth, barrelHeight + expansion - 1);

    // Tia lửa điện ở đầu nòng
    for (let i = 0; i < 3; i++) {
        if (Math.random() > 0.6) {
            ctx.beginPath();
            ctx.moveTo(barrelEnd, (Math.random() - 0.5) * barrelHeight);
            ctx.lineTo(barrelEnd + 5 + Math.random() * 5, (Math.random() - 0.5) * barrelHeight * 2);
            ctx.lineWidth = Math.random() * 1.5;
            ctx.globalAlpha = Math.random() * 0.5 + 0.3;
            ctx.stroke();
        }
    }
    ctx.restore();
}