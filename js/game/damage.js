import { p1, p2, tanks, boss, devGodMode, gameMode } from '../state.js';
import { BUFF_COLORS } from '../constants.js';
import { applyEffect, showStatus, tagEffect, applyPoisonEffect } from '../systems/effects.js';
import { lineCircleColl, circleColl } from './collision.js';
import { dist } from '../utils.js';
import { addHitExplosion } from '../rendering/animations.js';
import { spawnShotSplitChildren, triggerShotSplit4 } from '../utils/shotSplit.js';
import Boss from '../classes/Boss.js';

const FIRE_BURN_DURATION = 2000;
const FIRE_BURN_RATIO = 0.5;
const ICE_SLOW_DURATION = 2500;
const ICE_SLOW_MULTIPLIER = 0.7;
const POISON_SHOT_BASE_DURATION = 3000;
const POISON_SHOT_BASE_RATIO = 0.2;
const POISON_SHOT_STACK_DURATION = 1000;
const POISON_SHOT_STACK_RATIO = 0.1;
const POISON_SHOT_MAX_STACK = 3;

function applyFireShotEffect(target, baseDamage) {
    if (!target) return;
    const damageValue = Math.max(0, baseDamage || 0);
    if (damageValue <= 0) return;
    const burnPerMs = (damageValue * FIRE_BURN_RATIO) / 1000;
    const effect = applyEffect(target, 'bossFireShotBurn', FIRE_BURN_DURATION,
        state => {
            state.burnPerMs = burnPerMs;
            state.elapsed = 0;
            target.isBurning = true;
        },
        () => {
            target.isBurning = false;
        },
        (dt, tank, state) => {
            if (!state || state.cancelled || dt <= 0) return;
            const isPlayer = (tank === p1 || tank === p2);
            if (devGodMode && isPlayer) return;
            let damage = state.burnPerMs * dt;
            if (damage <= 0 || tank.hp <= 0) return;
            damage = absorbDamageWithMicroShield(tank, damage, performance.now());
            if (damage <= 0) return;
            tank.hp = Math.max(0, tank.hp - damage);
        }
    );
    if (effect) {
        effect.burnPerMs = burnPerMs;
        showStatus(target, ' Đốt cháy!', BUFF_COLORS.fireIceShot || '#f472b6', 800);
        tagEffect(effect, 'Fire Shot', BUFF_COLORS.fireIceShot || '#f472b6');
    }
}

function applyIceShotEffect(target) {
    if (!target) return;

    const effect = applyEffect(target, 'bossIceShotSlow', ICE_SLOW_DURATION,
        state => {
            state.previousFactor = typeof target.bossIceSlowFactor === 'number' ? target.bossIceSlowFactor : 1;
            target.bossIceSlowFactor = state.previousFactor * ICE_SLOW_MULTIPLIER;
            target.isIceSlowed = true;
        },
        state => {
            if (!state) return;
            const base = typeof state.previousFactor === 'number' ? state.previousFactor : 1;
            target.bossIceSlowFactor = base;
            target.isIceSlowed = false;
        }
    );
    if (effect) {
        if (typeof effect.previousFactor !== 'number') {
            effect.previousFactor = typeof target.bossIceSlowFactor === 'number'
                ? target.bossIceSlowFactor / ICE_SLOW_MULTIPLIER
                : 1;
        }
        target.bossIceSlowFactor = effect.previousFactor * ICE_SLOW_MULTIPLIER;
        showStatus(target, '❄️ Bị làm chậm!', BUFF_COLORS.fireIceShot || '#f472b6', 800);
        tagEffect(effect, 'Ice Shot', BUFF_COLORS.fireIceShot || '#f472b6');
    }
}

function applyBossPoisonShotEffect(target, baseDamage = 1) {
    if (!target || target.hp <= 0) return;
    if (devGodMode && (target === p1 || target === p2)) return;

    const base = Math.max(0.1, baseDamage);
    const existing = target.activeEffects ? target.activeEffects.bossPoisonShot : null;
    const prevStack = existing ? (existing.stack || 0) : 0;
    const newStack = Math.min(POISON_SHOT_MAX_STACK, prevStack + 1);
    const duration = POISON_SHOT_BASE_DURATION + (newStack - 1) * POISON_SHOT_STACK_DURATION;
    const dpsRatio = POISON_SHOT_BASE_RATIO + (newStack - 1) * POISON_SHOT_STACK_RATIO;
    const damagePerSecond = base * dpsRatio;

    const effect = applyEffect(target, 'bossPoisonShot', duration,
        state => {
            state.stack = newStack;
            state.damagePerSecond = damagePerSecond;
            state.meta = state.meta || {};
            state.meta.color = BUFF_COLORS.poisonShot || '#bbf7d0';
            state.meta.label = `Độc x${newStack}`;
        },
        state => {
            if (state) state.stack = 0;
        },
        (dt, tank, state) => {
            if (!state || state.cancelled || dt <= 0) return;
            if (tank.shield) return;
            const isPlayer = (tank === p1 || tank === p2);
            if (devGodMode && isPlayer) return;
            let damage = (state.damagePerSecond || 0) * dt / 1000;
            if (damage <= 0 || tank.hp <= 0) return;
            damage = absorbDamageWithMicroShield(tank, damage, performance.now());
            if (damage <= 0) return;
            tank.hp = Math.max(0, tank.hp - damage);
        }
    );

    if (effect) {
        effect.stack = newStack;
        effect.damagePerSecond = damagePerSecond;
        effect.meta = effect.meta || {};
        effect.meta.color = BUFF_COLORS.poisonShot || '#bbf7d0';
        effect.meta.label = `Độc x${newStack}`;
        showStatus(target, `☠️ Độc x${newStack}`, BUFF_COLORS.poisonShot || '#bbf7d0', 900);
    }
}

function absorbDamageWithMicroShield(target, incomingDamage, now) {
    if (!target || !target.microShieldEnabled || target.microShieldValue <= 0) return incomingDamage;
    const absorbed = Math.min(target.microShieldValue, incomingDamage);
    target.microShieldValue -= absorbed;
    target.microShieldNextRegen = now + 5000;
    if (target.microShieldValue <= 0) {
        target.microShieldValue = 0;
        showStatus(target, '🧿 Shield vỡ!', BUFF_COLORS.microShield || '#7dd3fc', 600);
    }
    return incomingDamage - absorbed;
}

export function handleBulletCollisions(now, bullets) {
    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        if (!b || !b.alive) continue;

        for (let j = 0; j < tanks.length; j++) {
            const t = tanks[j];
            if (!t || t.hp <= 0 || t.invisible) continue;

            const dx = t.x - b.x, dy = t.y - b.y;
            // Cho phép đạn tự gây sát thương lên chủ sở hữu ngay lập tức
            // (Nếu đạn va chạm với chủ sở hữu, nó sẽ gây sát thương)
            const maxDist = t.r + (b.r || 4) + Math.hypot(b.vx || 0, b.vy || 0);
            if (dx * dx + dy * dy > maxDist * maxDist) continue;

            const hitLine = lineCircleColl(b.prevX, b.prevY, b.x, b.y, t.x, t.y, t.r);
            const hitPoint = circleColl(t, b);

            if (hitLine || hitPoint) {
                if (gameMode === 'vsboss' && (b.owner === p1 || b.owner === p2) && (t === p1 || t === p2)) continue;
                if (b.owner instanceof Boss || (b.owner && b.owner.isMiniSlime)) {
                    if (t instanceof Boss || t.isMiniSlime) continue;
                }
                if (b.isPiercing && b.piercedTargets && b.piercedTargets.has(t)) continue;

                const isPlayer = (t === p1 || t === p2);
                const skipDamage = devGodMode && isPlayer;
                const baseEffectDamage = b.fireIceSourceDamage || b.damage || 1;
                addHitExplosion({ x: b.x, y: b.y, color: '#f00', startTime: now });

                let damageDealt = 0;
                let applyDirectDamage = !skipDamage;

                if (applyDirectDamage && t.hasBossShield && t.bossShieldReady) {
                    t.bossShieldReady = false;
                    showStatus(t, '🛡️ Khiên chặn đòn!', BUFF_COLORS.bossShield || '#6ee7b7', 900);
                    applyDirectDamage = false;
                }

                if (b.fireIceType === 'fire') applyFireShotEffect(t, baseEffectDamage);
                else if (b.fireIceType === 'ice') applyIceShotEffect(t);
                if (b.hasPoisonShot) applyBossPoisonShotEffect(t, b.poisonShotBaseDamage || baseEffectDamage);

                const shouldTriggerSplit4OnHit = b.hasShotSplit4 && !b._shotSplit4Triggered && t !== b.owner;

                if (!t.shield && applyDirectDamage) {
                    let damage = Math.max(0.1, b.damage || 1);
                    if (b.criticalMultiplier && b.criticalMultiplier > 1) {
                        damage *= b.criticalMultiplier;
                        showStatus(t, '💥 Chí mạng!', BUFF_COLORS.criticalHit || '#fb7185', 600);
                        if (b.owner) showStatus(b.owner, '💥 Chí mạng!', BUFF_COLORS.criticalHit || '#fb7185', 600);
                    }
                    damage = absorbDamageWithMicroShield(t, damage, now);
                    if (damage > 0) {
                        if (t instanceof Boss && t.damageReduction && t.damageReduction < 1) damage *= t.damageReduction;
                        const prevHp = t.hp;
                        t.hp = Math.max(0, t.hp - damage);
                        damageDealt = Math.max(0, prevHp - t.hp);
                        if (b.isPoison) applyPoisonEffect(t);
                    }
                }

                if (shouldTriggerSplit4OnHit) triggerShotSplit4(b);

                if (damageDealt > 0 && b.owner && b.owner.lifeStealAmount > 0 && b.owner.hp > 0) {
                    const healAmount = damageDealt * b.owner.lifeStealAmount;
                    if (healAmount > 0) {
                        b.owner.hp = Math.min(b.owner.maxHp, b.owner.hp + healAmount);
                        b.owner.lifeStealPulseTimer = 600;
                        showStatus(b.owner, 'Hút máu!', BUFF_COLORS.lifeSteal, 600);
                    }
                }

                let consumedOnHit = false;
                if (b.isPiercing) {
                    b.piercedTargets.add(t);
                    if (typeof b.bossPierceRemaining === 'number') {
                        if (b.bossPierceDamageFactor && b.bossPierceDamageFactor < 1) b.damage = Math.max(0.1, (b.damage || 1) * b.bossPierceDamageFactor);
                        b.bossPierceRemaining--;
                        if (b.bossPierceRemaining <= 0) consumedOnHit = true;
                    } else if (typeof b.pierceCount === 'number') {
                        b.pierceCount--;
                        if (b.pierceCount <= 0) consumedOnHit = true;
                    }
                } else {
                    consumedOnHit = true;
                }

                if (b.hasShotSplit4 && !b._shotSplit4Triggered) {
                    triggerShotSplit4(b);
                    consumedOnHit = true;
                }

                if (consumedOnHit) {
                    if (b.hasShotSplit && !b._shotSplitConsumed && t instanceof Boss) spawnShotSplitChildren(b);
                    b.alive = false;
                    break;
                }
            }
        }
    }
}