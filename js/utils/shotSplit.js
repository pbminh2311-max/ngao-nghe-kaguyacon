import Bullet from '../classes/Bullet.js';
import { styleBulletForOwner } from '../systems/effects.js';
import { bullets } from '../state.js';

export function spawnShotSplitChildren(parentBullet, { angleSpread = Math.PI / 2 } = {}) {
    if (!parentBullet) return [];
    const owner = parentBullet.owner;
    if (!owner || typeof owner.applyBossBulletTraits !== 'function') return [];

    const baseAngle = Math.atan2(parentBullet.vy || 0, parentBullet.vx || 1);
    const baseDamage = parentBullet.fireIceSourceDamage || parentBullet.damage || 1;
    const children = [];

    for (let i = 0; i < 2; i++) {
        const randomOffset = (Math.random() - 0.5) * angleSpread;
        const direction = i === 0 ? -1 : 1;
        const childAngle = baseAngle + direction * Math.abs(randomOffset);
        const child = new Bullet(parentBullet.x, parentBullet.y, childAngle, owner);
        child._fromShotSplit = true;
        styleBulletForOwner(child, owner);
        owner.applyBossBulletTraits(child);
        child.damage = Math.max(0.1, baseDamage * 0.4);
        child.hasShotSplit = false;
        child._shotSplitConsumed = true;
        child.fireIceSourceDamage = child.damage;
        children.push(child);
        bullets.push(child);
    }

    parentBullet._shotSplitSpawned = true;
    parentBullet.hasShotSplit = false;
    parentBullet._shotSplitConsumed = true;
    return children;
}
