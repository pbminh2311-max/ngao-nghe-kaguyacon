import { BUFF_COLORS } from '../constants.js';

export function drawExplosiveEffect(ctx, tank, now) {
    const explosiveState = tank.activeEffects && tank.activeEffects.explosive;
    if (!explosiveState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (explosiveState.meta && explosiveState.meta.color) || BUFF_COLORS.explosive;
    const time = now * 0.003;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Vòng cảnh báo rung động
    const pulse = Math.sin(time * 8);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 + pulse * 0.3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Lõi năng lượng bất ổn với tia sét
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        if (Math.random() > 0.6) {
            const angle = Math.random() * Math.PI * 2;
            const startR = Math.random() * radius * 0.5;
            const endR = radius + 5;
            ctx.globalAlpha = Math.random() * 0.5 + 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR);
            ctx.lineTo(Math.cos(angle) * endR, Math.sin(angle) * endR);
            ctx.stroke();
        }
    }

    // 3. Các mảnh vỡ nóng chảy bắn ra
    const sparkCount = 8;
    ctx.fillStyle = `rgba(255, 180, 100, 1)`;
    ctx.shadowBlur = 0;
    for (let i = 0; i < sparkCount; i++) {
        const life = ((time * 2 + i * 1.37) % 1);
        const angle = (i / sparkCount) * Math.PI * 2 + time * 0.5;
        const currentDist = radius + 5 + life * 15;
        const x = Math.cos(angle) * currentDist;
        const y = Math.sin(angle) * currentDist;
        ctx.globalAlpha = Math.sin(life * Math.PI) * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, (1 - life) * 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

export function drawExplosiveBarrelEffect(ctx, tank, barrelMetrics, now) {
    const explosiveState = tank.activeEffects && tank.activeEffects.explosive;
    if (!explosiveState) return;

    const { barrelStartX, barrelWidth, barrelY, barrelHeight } = barrelMetrics;
    const color = (explosiveState.meta && explosiveState.meta.color) || BUFF_COLORS.explosive;
    const time = now * 0.01;
    const pulse = Math.sin(time * 2);
    const barrelEnd = barrelStartX + barrelWidth;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // 1. Nòng súng siêu nhiệt
    const gradient = ctx.createLinearGradient(barrelStartX, 0, barrelEnd, 0);
    gradient.addColorStop(0, 'rgba(80, 20, 10, 0.8)');
    gradient.addColorStop(0.8, color);
    gradient.addColorStop(1, `rgba(255, 200, 100, ${0.8 + pulse * 0.2})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(barrelStartX, barrelY, barrelWidth, barrelHeight);

    // 2. Tia lửa điện ở đầu nòng
    ctx.strokeStyle = `rgba(255, 220, 180, ${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 1.5;
    if (Math.random() > 0.4) {
        ctx.beginPath();
        ctx.moveTo(barrelEnd, (Math.random() - 0.5) * barrelHeight);
        ctx.lineTo(barrelEnd + 8 + Math.random() * 8, (Math.random() - 0.5) * barrelHeight * 2.5);
        ctx.stroke();
    }

    ctx.restore();
}