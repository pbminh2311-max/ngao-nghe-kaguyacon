import { BUFF_COLORS } from '../constants.js';
import { drawEffectRing, drawChainAround } from '../utils.js';

export function drawOtherEffects(ctx, tank) {
    const radius = tank.displayRadius || tank.r;

    if (tank.microShieldEnabled && tank.microShieldValue > 0) {
        const ratio = Math.max(0, Math.min(1, tank.microShieldValue / (tank.microShieldMax || 1)));
        const color = BUFF_COLORS.microShield || '#7dd3fc';
        drawEffectRing(ctx, tank.x, tank.y, radius + 6, color, { lineWidth: 3, alpha: 0.5 + 0.4 * ratio, glow: true });
    }

    if (tank.poisonBullet) {
        const color = BUFF_COLORS.poison;
        const pulse = 1 + Math.sin(tank.effectPhase * 3) * 0.5;
        drawEffectRing(ctx, tank.x, tank.y, radius + 8 + pulse, color, { lineWidth: 3, alpha: 0.6 });
    }
}