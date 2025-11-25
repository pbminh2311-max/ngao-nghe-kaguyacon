import { roundRect } from '../utils.js';
import { p1, p2 } from '../state.js';

export function drawTankHUD(ctx, tank) {
    const drawHUD = tank.hp > 0 && !tank.pendingRemoval && !tank.invisible && !tank.isClone && (tank === p1 || tank === p2);
    if (!drawHUD) return;

    const radius = tank.displayRadius || tank.r;
    const hpWidth = 48, hpHeight = 6;
    const hpX = tank.x - hpWidth / 2;
    const hpY = tank.y + radius + 12;
    const hpPerc = Math.max(0, Math.min(1, tank.hp / tank.maxHp));

    ctx.fillStyle = '#273344';
    ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
    ctx.strokeStyle = '#0b0f18';
    ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
    ctx.fillStyle = tank.color;
    ctx.fillRect(hpX + 1, hpY + 1, (hpWidth - 2) * hpPerc, hpHeight - 2);

    const ammoWidth = hpWidth;
    const ammoHeight = 5;
    const ammoX = tank.x - ammoWidth / 2;
    const ammoY = hpY + hpHeight + 6;
    
    ctx.fillStyle = '#273344';
    ctx.fillRect(ammoX, ammoY, ammoWidth, ammoHeight);
    ctx.strokeStyle = '#0b0f18';
    ctx.strokeRect(ammoX, ammoY, ammoWidth, ammoHeight);
    
    const ammoPercent = tank.ammo / (tank.maxAmmo || 3);
    const fillWidth = ammoWidth * ammoPercent;
    ctx.fillStyle = '#21d0ff';
    ctx.fillRect(ammoX + 1, ammoY + 1, fillWidth - 2, ammoHeight - 2);

    if(tank.statusText){
        ctx.save();
        ctx.font = '600 12px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const txt = tank.statusText;
        const textWidth = ctx.measureText(txt).width;
        const padX = 12;
        const boxW = textWidth + padX * 2;
        const boxH = 18;
        const boxX = tank.x - boxW / 2;
        const boxY = ammoY + ammoHeight + 8;
        ctx.fillStyle = 'rgba(13,22,36,0.82)';
        roundRect(ctx, boxX, boxY, boxW, boxH, 9, true, false);
        ctx.strokeStyle = tank.statusColor || '#eaf2ff';
        ctx.lineWidth = 1.5;
        roundRect(ctx, boxX, boxY, boxW, boxH, 9, false, true);
        ctx.fillStyle = tank.statusColor || '#eaf2ff';
        ctx.fillText(txt, tank.x, boxY + boxH / 2);
        ctx.restore();
    }
}