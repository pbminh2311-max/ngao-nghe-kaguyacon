import { BUFF_COLORS } from '../constants.js';
import { tanks } from '../state.js';

export function showStatus(tank, text, color = '#fff', duration = 1200) {
    if (!tank) return;
    tank.statusText = text;
    tank.statusColor = color;
    tank.statusTimer = duration;
}

export function styleBulletForOwner(bullet, owner) {
    if (!bullet || !owner) return;

    // Mặc định đạn mang màu của chủ sở hữu (boss, player...)
    if (!bullet.color || bullet.color === '#f33') {
        const baseColor = owner.bulletColor || owner.color;
        if (baseColor) {
            bullet.color = baseColor;
        }
    }

    // Big Bullet
    if (owner.bigBullet) {
        bullet.r = 8;
        bullet.damage = (bullet.damage || 1) * 1.5;
    }

    // Homing
    if (owner.homing) {
        if (!bullet.homingTarget) bullet.isHoming = true; // Chỉ bật tự tìm kiếm nếu chưa có mục tiêu
        bullet.homingStartTime = performance.now();
    }

    // Ricochet (Bounce)
    if (owner.ricochet) {
        bullet.isRicochet = true;
        bullet.maxBounces = 999; // Effectively infinite for the buff duration
        bullet.color = BUFF_COLORS.ricochet; // Set bullet color for ricochet
    }

    // Explosive
    if (owner.explosive) {
        bullet.isExplosive = true;
        bullet.shape = 'bomb'; // Đặt hình dạng là bomb
        bullet.r = 10; // Tăng kích thước viên đạn
        bullet.color = BUFF_COLORS.explosive; // Đặt màu cho bomb
    }

    // Pierce (PvP)
    if (owner.pierce) {
        bullet.isPiercing = true;
        bullet.r = 12; // Tăng bán kính cơ bản của viên đạn xuyên
        bullet.pierceCount = 1; // Cho phép xuyên 1 lần (tường hoặc tank)
        bullet.color = BUFF_COLORS.pierce;
        bullet.glow = true;
    }

    // Poison
    if (owner.poisonBullet) {
        bullet.isPoison = true;
        bullet.color = BUFF_COLORS.poison;
        bullet.glow = true;
    }

    // Trail
    if (owner.trailBullet) {
        bullet.isTrail = true;
    }
}

export function applyEffect(tank, effectName, duration, onStart, onEnd, onUpdate) {
    if (!tank) return null;

    // Clear existing effect of the same type
    if (tank.activeEffects && tank.activeEffects[effectName]) {
        const existing = tank.activeEffects[effectName];
        if (existing.timeout) clearTimeout(existing.timeout);
        if (existing.onEnd) existing.onEnd(existing);
    }

    const effectState = {
        name: effectName,
        startTime: performance.now(),
        duration: duration,
        onStart: onStart,
        onEnd: onEnd,
        onUpdate: onUpdate,
        cancelled: false,
        meta: {}
    };

    if (onStart) {
        onStart(effectState);
    }

    if (duration !== Infinity) {
        effectState.timeout = setTimeout(() => {
            if (effectState.cancelled) return;
            if (onEnd) onEnd(effectState);
            if (tank.activeEffects) delete tank.activeEffects[effectName];
        }, duration);
    }

    if (!tank.activeEffects) tank.activeEffects = {};
    tank.activeEffects[effectName] = effectState;

    return effectState;
}

export function tagEffect(effect, label, color) {
    if (!effect) return;
    effect.meta = effect.meta || {};
    effect.meta.label = label;
    effect.meta.color = color;
}

export function applyPoisonEffect(target) {
    if (!target || target.hp <= 0) return;

    // Lấy hiệu ứng độc hiện có (nếu có)
    const existingPoison = target.activeEffects && target.activeEffects.poison;
    
    // Tính toán stack mới
    const currentStack = existingPoison ? (existingPoison.stack || 0) : 0;
    const newStack = currentStack + 1;
    
    // Tính toán sát thương mới dựa trên stack
    const baseDps = 0.1;
    const totalDps = baseDps * newStack;

    // Áp dụng hoặc cập nhật hiệu ứng
    const poisonEffect = applyEffect(target, 'poison', 5000, // Luôn reset thời gian về 5 giây
        (state) => {
            state.stack = newStack;
            state.dps = totalDps;
            showStatus(target, `☠️ Độc x${newStack}!`, BUFF_COLORS.poison, 1000);
        },
        () => { /* No on-end effect */ },
        (dt, tank, state) => {
            if (tank.shield) return;
            tank.hp = Math.max(0, tank.hp - (state.dps * dt / 1000)); // Sử dụng DPS từ state
        }
    );
    tagEffect(poisonEffect, `Độc x${newStack}`, BUFF_COLORS.poison);
}

export function updateAllEffects(dt) {
    if (!tanks || tanks.length === 0) return;

    for (const tank of tanks) {
        if (!tank || !tank.activeEffects) continue;

        for (const effectName in tank.activeEffects) {
            const effect = tank.activeEffects[effectName];
            if (effect && effect.onUpdate && !effect.cancelled) {
                effect.onUpdate(dt, tank, effect);
            }
        }
    }
}