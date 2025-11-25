import { p1, p2, bullets } from '../state.js';
import { input } from './input.js';
import { CHARGE_HOLD_TIME, CHARGE_AMMO_COST } from '../config.js';
import { showStatus, styleBulletForOwner } from '../systems/effects.js';
import { addHitExplosion } from '../rendering/animations.js';
import Bullet from '../classes/Bullet.js';
import { BUFF_COLORS } from '../constants.js';

function fireNormalShot(tank, now) {
    if (!tank || !tank.canShoot(now)) return false;

    if (tank.shotgun) {
        if (tank.ammo < 3) {
            showStatus(tank, 'Không đủ đạn!', '#ffd166', 800);
            return false;
        }
        tank.ammo -= 3;
        tank.lastShot = now;

        for (let i = -1; i <= 1; i++) {
            // Tính toán vị trí đầu nòng súng
            const muzzleOffset = tank.r + 6;
            const angleOffset = i * 0.15;
            const finalAngle = tank.angle + angleOffset;
            const bx = tank.x + Math.cos(tank.angle) * muzzleOffset;
            const by = tank.y + Math.sin(tank.angle) * muzzleOffset;
            // Tạo một viên đạn mới cho mỗi lần lặp
            const bullet = new Bullet(bx, by, finalAngle, tank);
            styleBulletForOwner(bullet, tank); // Định kiểu cho viên đạn vừa tạo
            bullets.push(bullet);
        }
        return true;
    }

    if (tank.ammo <= 0) return false;

    const isTwinShotBonus = tank.hasTwinShot && tank.twinShotBonusCharges > 0;

    const bullet = tank.shoot(now);
    if (bullet) {
        if (isTwinShotBonus) {
            bullets.push(bullet);
            const fireAngle = tank.angle;
            const fireX = tank.x;
            const fireY = tank.y;
            setTimeout(() => {
                const bonusBullet = tank.createBossBonusBullet(fireAngle, fireX, fireY);
                if (bonusBullet) bullets.push(bonusBullet);
            }, 80);
            tank.twinShotBonusCharges--;
            showStatus(tank, '✦ Twin Shot!', BUFF_COLORS.twinShot, 800);
        } else {
            bullets.push(bullet);
        }
        return true;
    }
    return false;
}

function fireChargedShot(tank, now) {
    if (!tank || tank.ammo < CHARGE_AMMO_COST || !tank.canShoot(now)) {
        showStatus(tank, 'Không đủ đạn!', '#ffd166', 800);
        return false;
    }
    tank.ammo = Math.max(0, tank.ammo - CHARGE_AMMO_COST);
    tank.lastShot = now;
    tank.shootHoldTime = 0;
    const bulletRadius = 10;
    const safeDist = tank.r + bulletRadius + 1;
    const bx = tank.x + Math.cos(tank.angle) * safeDist;
    const by = tank.y + Math.sin(tank.angle) * safeDist;
    const bullet = new Bullet(bx, by, tank.angle, tank);
    bullet.damage = Math.max(3, (bullet.damage || 1) * 3);
    bullet.isCharged = true;
    bullet.color = '#ffd166';
    bullet.glow = true;
    bullet.r = bulletRadius;
    bullets.push(bullet);
    showStatus(tank, 'Đạn tụ lực', '#ffd166', 900);
    addHitExplosion({ x: tank.x + Math.cos(tank.angle) * (tank.r + 6), y: tank.y + Math.sin(tank.angle) * (tank.r + 6), color: '#ffd166', startTime: performance.now(), duration: 260 });
    return true;
}

export function handlePlayerShooting(dt, now) {
    for (const t of [p1, p2]) {
        if (t.possession && !t.possessionFired && t.canShoot(now) && !t.silenced) {
            const b = t.shoot(now);
            if (b) bullets.push(b);
            t.possessionFired = true;
        }
        const shootKey = t.controls.shoot;
        const isDown = !!input[shootKey] && !t.possession;
        if (isDown) {
            if (!t.wasShootDown) {
                t.wasShootDown = true;
                t.shootHoldTime = 0;
                t.chargeState = 'charging';
            }
            t.shootHoldTime += dt;
            if (t.shootHoldTime >= CHARGE_HOLD_TIME && t.chargeState === 'charging') {
                t.chargeState = 'armed';
                showStatus(t, 'Đã tụ lực!', '#ffd166', 900);
            }
        } else {
            if (t.wasShootDown) {
                if (!t.silenced && !t.stunned) {
                    if (t.shootHoldTime >= CHARGE_HOLD_TIME) {
                        fireChargedShot(t, now);
                    } else {
                        fireNormalShot(t, now);
                    }
                }
            }
            t.wasShootDown = false;
            t.shootHoldTime = 0;
            t.chargeState = 'idle';
        }
    }
}