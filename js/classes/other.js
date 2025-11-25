import { BUFF_COLORS } from '../../constants.js';
import { drawEffectRing, drawChainAround } from '../../utils.js';

export function drawOtherEffects(ctx, tank) {
    const radius = tank.displayRadius || tank.r;

    if (tank.microShieldEnabled && tank.microShieldValue > 0) {
        const ratio = Math.max(0, Math.min(1, tank.microShieldValue / (tank.microShieldMax || 1)));
        const color = BUFF_COLORS.microShield || '#7dd3fc';
        drawEffectRing(ctx, tank.x, tank.y, radius + 6, color, { lineWidth: 3, alpha: 0.5 + 0.4 * ratio, glow: true });
    }

    if (tank.silenced) {
        const color = BUFF_COLORS.silence;
        const pulse = 1 + Math.sin(tank.effectPhase * 4) * 0.4;
        drawEffectRing(ctx, tank.x, tank.y, radius + 10 + pulse, color, { lineWidth: 2.5, alpha: 0.8, dash: [3, 3], glow: true });
    }

    const rootState = tank.activeEffects && tank.activeEffects.root;
    if (rootState) {
        const color = (rootState.meta && rootState.meta.color) || BUFF_COLORS.root;
        drawChainAround(ctx, tank.x, tank.y, radius + 5, color, 12);
    }
}