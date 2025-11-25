import { BUFF_COLORS } from '../constants.js';

export function drawShrinkEffect(ctx, tank, now) {
    const shrinkState = tank.activeEffects && tank.activeEffects.shrink;
    if (!shrinkState) return;

    const radius = tank.displayRadius || tank.r;
    const color = BUFF_COLORS.shrink || '#f8f';
    const phase = now * 0.003;

    ctx.save();
    ctx.translate(tank.x, tank.y);

    // Hiệu ứng xoáy nén
    const numLines = 4;
    for (let i = 0; i < numLines; i++) {
        const angleOffset = (i / numLines) * Math.PI * 2;
        const currentAngle = phase + angleOffset;
        
        const startRadius = radius + 20 + Math.sin(phase * 2 + i) * 4;
        const endRadius = radius + 5;

        ctx.beginPath();
        ctx.arc(0, 0, (startRadius + endRadius) / 2, currentAngle, currentAngle + Math.PI * 0.8);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3 + Math.sin(phase * 3 + i) * 0.2;
        ctx.setLineDash([2, 6]);
        ctx.stroke();
    }
    ctx.restore();
}