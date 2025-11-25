import { BUFF_COLORS } from '../constants.js';

export function drawReverseEffect(ctx, tank, now) {
    const reverseState = tank.activeEffects && tank.activeEffects.reverse;
    if (!reverseState) return;

    const radius = tank.displayRadius || tank.r;
    const color = (reverseState.meta && reverseState.meta.color) || BUFF_COLORS.reverse;
    const time = now * 0.003;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // 1. Hào quang hỗn loạn
    const pulse = 0.8 + 0.2 * Math.sin(time * 5);
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2;
    
    // Vòng ngoài
    ctx.globalAlpha = 0.5 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, time, time + Math.PI * 1.5);
    ctx.stroke();
    
    // Vòng trong chạy ngược chiều
    ctx.globalAlpha = 0.4 * pulse;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 14, -time * 1.2, -time * 1.2 + Math.PI * 1.5);
    ctx.stroke();

    // 2. Các mũi tên xoay tròn
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    const arrowCount = 4;
    for (let i = 0; i < arrowCount; i++) {
        const angle = (i / arrowCount) * Math.PI * 2 + time;
        const dist = radius + 16;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2); // Mũi tên hướng ra ngoài
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 4 + i);

        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(5, 5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
}