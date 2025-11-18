import Bullet from '../classes/Bullet.js';
import { styleBulletForOwner } from '../systems/effects.js';
import { bullets } from '../state.js';

export function spawnShotSplitChildren(parentBullet, options = {}) {
    if (!parentBullet) return [];
    const owner = parentBullet.owner;
    if (!owner || typeof owner.applyBossBulletTraits !== 'function') return [];

    const {
        angleSpread = Math.PI / 2,
        count = 2,
        damageScale = 0.4,
        speedMultiplier = 1,
        consumeParentSplit = true
    } = options;

    const baseAngle = Math.atan2(parentBullet.vy || 0, parentBullet.vx || 1);
    const baseDamage = parentBullet.fireIceSourceDamage || parentBullet.damage || 1;
    const baseSpeed = Math.hypot(parentBullet.vx || 0, parentBullet.vy || 0) || parentBullet.baseSpeed || 6.5;
    const children = [];

    const total = Math.max(1, count);
    const spread = Math.max(0, angleSpread);

    for (let i = 0; i < total; i++) {
        const fraction = total === 1 ? 0 : (i / (total - 1)) - 0.5;
        const offset = spread * fraction;
        const childAngle = baseAngle + offset;
        const child = new Bullet(parentBullet.x, parentBullet.y, childAngle, owner);
        child._fromShotSplit = true;
        styleBulletForOwner(child, owner);
        owner.applyBossBulletTraits(child);

        const speed = baseSpeed * Math.max(0.1, speedMultiplier);
        child.vx = Math.cos(childAngle) * speed;
        child.vy = Math.sin(childAngle) * speed;

        const dir = Math.hypot(child.vx, child.vy) || 1;
        const offsetDistance = Math.max(child.r + (parentBullet?.r || 4) + 1, 4);
        child.x += (child.vx / dir) * offsetDistance;
        child.y += (child.vy / dir) * offsetDistance;
        child.prevX = child.x;
        child.prevY = child.y;

        child.damage = Math.max(0.1, baseDamage * damageScale);
        child.fireIceSourceDamage = child.damage;
        child.hasShotSplit = false;
        child._shotSplitConsumed = true;
        child.hasShotSplit4 = false;
        child._shotSplit4Triggered = true;
        children.push(child);
        bullets.push(child);
    }

    parentBullet._shotSplitSpawned = true;
    if (consumeParentSplit) {
        parentBullet.hasShotSplit = false;
        parentBullet._shotSplitConsumed = true;
    }
    return children;
}

export function triggerShotSplit4(bullet, overrides = {}) {
    if (!bullet || bullet._shotSplit4Triggered || !bullet.hasShotSplit4) return [];
    const spawned = spawnShotSplitChildren(bullet, {
        angleSpread: Math.PI * 0.9,
        count: 4,
        damageScale: 0.4,
        speedMultiplier: 1,
        consumeParentSplit: false,
        ...overrides
    });
    bullet._shotSplit4Triggered = true;
    return spawned;
}
