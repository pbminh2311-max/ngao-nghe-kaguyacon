import { circleColl, dist as getDistance } from '../utils.js';
import { createDamageNumber } from './damageNumber.js';

const ABSORB_RADIUS = 150;
const ABSORB_DAMAGE_PER_SECOND = 5;
const ABSORB_HEAL_MULTIPLIER = 1.5;

export function updateCorruptedAbsorb(boss, player, now, dt) {
    if (!boss.isAlive() || !player.isAlive()) return;

    const skill = boss.skills.corruptedAbsorb;
    if (!skill || !skill.active) return;

    const distance = getDistance(boss, player);

    if (distance < ABSORB_RADIUS) {
        // Nếu người chơi trong tầm, gây sát thương và hồi máu cho boss
        const damageToDeal = (ABSORB_DAMAGE_PER_SECOND * dt) / 1000;

        if (player.takeDamage(damageToDeal, 'corrupted_absorb')) {
            createDamageNumber(player.x, player.y, damageToDeal, { isPlayer: true, type: 'magic' });

            const amountHealed = damageToDeal * ABSORB_HEAL_MULTIPLIER;
            boss.heal(amountHealed);
            createDamageNumber(boss.x, boss.y, amountHealed, { isHeal: true });
        }

        skill.isAbsorbing = true;
    } else {
        skill.isAbsorbing = false;
    }
}

export function drawCorruptedAbsorbEffect(ctx, boss, now) {
    const skill = boss.skills && boss.skills.corruptedAbsorb;
    if (!skill || !skill.active) return;

    const color = '#8b00ff'; // Màu tím đậm
    const time = now * 0.002;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = skill.isAbsorbing ? 0.6 + Math.sin(time * 10) * 0.2 : 0.3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, ABSORB_RADIUS, time, time + Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}