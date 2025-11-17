import { W, H } from '../canvas.js';
import { clamp, dist } from '../utils.js';
import { circleRectColl, findCollisionPoint, lineRectColl } from './collision.js';
import { obstacles } from './obstacles.js';
import { devNoWalls, tanks, gameMode, boss, p1, p2, p1FocusMode, p2FocusMode, enemySlowFactor } from '../state.js';
import { flashMsg } from '../main.js';
import { addExplosion } from '../rendering/animations.js';
import { spawnShotSplitChildren } from '../utils/shotSplit.js';

function collidesAt(px, py, r) {
    if (devNoWalls) return false;
    for (const o of obstacles) {
        if (circleRectColl({ x: px, y: py, r: r }, o)) {
            return true;
        }
    }
    return false;
}

export function updateTankPhysics(tank, dt, input) {
    if (tank.stunned) {
        tank.speed = 0;
        tank.vx = 0;
        tank.vy = 0;
        return; // No input processing if stunned
    }

    const focusMode = (tank === p1 && p1FocusMode) || (tank === p2 && p2FocusMode);
    const isRooted = !!tank.rooted;
    const slowFactor = typeof tank.bossIceSlowFactor === 'number' ? tank.bossIceSlowFactor : 1;

    if (focusMode) {
        // --- FOCUS MODE LOGIC ---

        // 1. Auto-aiming
        let target = null;
        if (gameMode === 'vsboss' && boss && boss.hp > 0) {
            target = boss;
        } else {
            target = (tank === p1) ? p2 : p1;
        }

        if (target && target.hp > 0) {
            tank.angle = Math.atan2(target.y - tank.y, target.x - tank.x);
        }

        // 2. Movement (Forward/Backward + Strafing)
        if (!isRooted) {
            let moveX = 0;
            let moveY = 0;
            if (input[tank.controls.forward]) moveY -= 1;
            if (input[tank.controls.back]) moveY += 1;
            if (input[tank.controls.left]) moveX -= 1;
            if (input[tank.controls.right]) moveX += 1;

            // Normalize diagonal movement to prevent faster speed
            const magnitude = Math.hypot(moveX, moveY);
            if (magnitude > 1) {
                moveX /= magnitude;
                moveY /= magnitude;
            }
            
            // Apply movement with friction
            const effectiveMoveSpeed = tank.moveSpeed * slowFactor;
            tank.vx = (tank.vx * tank.friction) + (moveX * effectiveMoveSpeed * dt / 16);
            tank.vy = (tank.vy * tank.friction) + (moveY * effectiveMoveSpeed * dt / 16);

            const targetX = clamp(tank.x + tank.vx, tank.r + 4, W - tank.r - 4);
            const targetY = clamp(tank.y + tank.vy, tank.r + 4, H - tank.r - 4);

            if (devNoWalls || !collidesAt(targetX, targetY, tank.r)) {
                tank.x = targetX;
                tank.y = targetY;
            } else {
                if (!collidesAt(tank.x, targetY, tank.r)) tank.y = targetY;
                if (!collidesAt(targetX, tank.y, tank.r)) tank.x = targetX;
                tank.vx *= -0.3;
                tank.vy *= -0.3;
            }
        } else {
            tank.vx = 0;
            tank.vy = 0;
        }

    } else {
        // --- NORMAL MODE LOGIC ---

        // --- Rotation ---
        if (tank.possession) {
            const chaos = Math.random();
            if (chaos < 0.3) tank.angle += (Math.random() - 0.5) * 0.2 * dt / 16;
            else if (chaos < 0.6) tank.angle -= tank.turnSpeed * dt / 16;
            else tank.angle += tank.turnSpeed * dt / 16;
        } else {
            if (input[tank.controls.left]) tank.angle -= tank.turnSpeed * dt / 16;
            if (input[tank.controls.right]) tank.angle += tank.turnSpeed * dt / 16;
        }

        // --- Movement (Normal Mode) ---
        if (!isRooted) {
            if (tank.possession) {
                // Chaotic movement
                if (Math.random() < 0.3) {
                    tank.speed += tank.moveSpeed * slowFactor * dt / 16;
                } else if (Math.random() < 0.5) {
                    tank.speed -= tank.moveSpeed * slowFactor * dt / 16;
                }
            } else {
                if (input[tank.controls.forward]) tank.speed += tank.moveSpeed * slowFactor * dt / 16;
                if (input[tank.controls.back]) tank.speed -= tank.moveSpeed * slowFactor * dt / 16;
            }
            tank.speed *= tank.friction;

            const moveX = Math.cos(tank.angle) * tank.speed;
            const moveY = Math.sin(tank.angle) * tank.speed;
            const targetX = clamp(tank.x + moveX, tank.r + 4, W - tank.r - 4);
            const targetY = clamp(tank.y + moveY, tank.r + 4, H - tank.r - 4);

            let moved = false;
            if (devNoWalls || !collidesAt(targetX, targetY, tank.r)) {
                tank.x = targetX;
                tank.y = targetY;
                moved = true;
            } else {
                const canSlideY = !collidesAt(tank.x, targetY, tank.r);
                const canSlideX = !collidesAt(targetX, tank.y, tank.r);

                if (canSlideY) {
                    tank.y = targetY;
                    tank.speed *= 0.85;
                    moved = true;
                }
                if (!moved && canSlideX) {
                    tank.x = targetX;
                    tank.speed *= 0.85;
                    moved = true;
                }
                if (!moved) {
                    tank.speed *= -0.35;
                }
            }

            tank.x = clamp(tank.x, tank.r + 4, W - tank.r - 4);
            tank.y = clamp(tank.y, tank.r + 4, H - tank.r - 4);
        } else {
            // Ensure rooted tank does not move
            tank.speed = 0;
        }
    }
}

function bounceBullet(bullet, wall) {
    if (bullet.bounces >= bullet.maxBounces) {
        bullet.alive = false;
        return;
    }

    if (wall) { // Va chạm tường
        const cx = wall.x + wall.w / 2;
        const cy = wall.y + wall.h / 2;
        const distToLeft = Math.abs(bullet.x - wall.x);
        const distToRight = Math.abs(bullet.x - (wall.x + wall.w));
        const distToTop = Math.abs(bullet.y - wall.y);
        const distToBottom = Math.abs(bullet.y - (wall.y + wall.h));
        const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

        if (minDist === distToLeft) { // Hit left side
            bullet.vx = -Math.abs(bullet.vx);
            bullet.x = wall.x - bullet.r - 0.1;
        } else if (minDist === distToRight) { // Hit right side
            bullet.vx = Math.abs(bullet.vx);
            bullet.x = wall.x + wall.w + bullet.r + 0.1;
        } else if (minDist === distToTop) { // Hit top side
            bullet.vy = -Math.abs(bullet.vy);
            bullet.y = wall.y - bullet.r - 0.1;
        } else {
            bullet.vy = Math.abs(bullet.vy);
            bullet.y = wall.y + wall.h + bullet.r + 0.1;
        }
    } else { // Va chạm biên
        if (bullet.x <= bullet.r) { bullet.vx = Math.abs(bullet.vx); bullet.x = bullet.r + 0.1; }
        else if (bullet.x >= W - bullet.r) { bullet.vx = -Math.abs(bullet.vx); bullet.x = W - bullet.r - 0.1; }
        if (bullet.y <= bullet.r) { bullet.vy = Math.abs(bullet.vy); bullet.y = bullet.r + 0.1; }
        else if (bullet.y >= H - bullet.r) { bullet.vy = -Math.abs(bullet.vy); bullet.y = H - bullet.r - 0.1; }
    }

    // Small push to ensure it's out
    const sp = Math.hypot(bullet.vx, bullet.vy) || 1;
    bullet.x += (bullet.vx / sp) * 0.5;
    bullet.y += (bullet.vy / sp) * 0.5;

    bullet.bounces++;

    if (bullet.bossBounceDamageFactor) {
        const factor = bullet.bossBounceDamageFactor;
        bullet.damage = Math.max(0.1, (bullet.damage || 1) * factor);
        if (typeof bullet.bossBounceRemaining === 'number') {
            bullet.bossBounceRemaining--;
            if (bullet.bossBounceRemaining <= 0) {
                delete bullet.bossBounceRemaining;
                delete bullet.bossBounceDamageFactor;
            }
        }
    }
}

export function updateBulletPhysics(bullet) {
    const owner = bullet.owner;
    const isEnemyBullet = owner && owner !== p1 && owner !== p2;
    const slowFactor = isEnemyBullet ? (enemySlowFactor || 1) : 1;
    const stepVx = bullet.vx * slowFactor;
    const stepVy = bullet.vy * slowFactor;
    const newX = bullet.x + stepVx;
    const newY = bullet.y + stepVy;

    // --- Xử lý đạn nổ ---
    if (bullet.isExplosive) {
        let hitWallExplosive = false;
        if (!devNoWalls) {
            for (const o of obstacles) {
                if (lineRectColl(bullet.prevX, bullet.prevY, newX, newY, o.x, o.y, o.w, o.h, bullet.r)) {
                    hitWallExplosive = true;
                    const t = findCollisionPoint(bullet.prevX, bullet.prevY, newX, newY, o, bullet.r);
                    if (t !== null) {
                        bullet.x = bullet.prevX + (newX - bullet.prevX) * t;
                        bullet.y = bullet.prevY + (newY - bullet.prevY) * t;
                    }
                    break;
                }
            }
        }
        let hitBoundaryExplosive = false;
        if ((bullet.prevX >= bullet.r && newX < bullet.r) || (bullet.prevX <= W - bullet.r && newX > W - bullet.r) ||
            (bullet.prevY >= bullet.r && newY < bullet.r) || (bullet.prevY <= H - bullet.r && newY > H - bullet.r)) {
            hitBoundaryExplosive = true;
            let explosiveBoundaryT = 1;
            if (stepVx < 0 && bullet.prevX > bullet.r && newX < bullet.r) explosiveBoundaryT = (bullet.r - bullet.prevX) / stepVx;
            else if (stepVx > 0 && bullet.prevX < W - bullet.r && newX > W - bullet.r) explosiveBoundaryT = (W - bullet.r - bullet.prevX) / stepVx;
            else if (stepVy < 0 && bullet.prevY > bullet.r && newY < bullet.r) explosiveBoundaryT = (bullet.r - bullet.prevY) / stepVy;
            else if (stepVy > 0 && bullet.prevY < H - bullet.r && newY > H - bullet.r) explosiveBoundaryT = (H - bullet.r - bullet.prevY) / stepVy;
            bullet.x = bullet.prevX + bullet.vx * explosiveBoundaryT;
            bullet.y = bullet.prevY + bullet.vy * explosiveBoundaryT;
        }

        if (hitWallExplosive || hitBoundaryExplosive) {
            const radius = bullet.explosionRadius || 80;
            for (const t of tanks) {
                if (t.hp <= 0 || t.invisible) continue;
                if (dist(t, bullet) <= radius) {
                    if (!t.shield) t.hp--;
                }
            }
            addExplosion({ x: bullet.x, y: bullet.y, radius: radius, startTime: performance.now(), duration: 400, color: bullet.color });
            flashMsg('Đạn nổ!');
            bullet.alive = false;
            return;
        }
    }

    let hitWall = null;
    let hitPoint = null;
    let minT = 1;

    if (!devNoWalls) { // Luôn kiểm tra va chạm tường
        for (const o of obstacles) {
            const t = findCollisionPoint(bullet.prevX, bullet.prevY, newX, newY, o, bullet.r);
            if (t !== null && t < minT) {
                minT = t;
                hitWall = o;

                hitPoint = { x: bullet.prevX + (newX - bullet.prevX) * t, y: bullet.prevY + (newY - bullet.prevY) * t };
            }
        }
    }

    let hitBoundary = false;
    let boundaryT = 1;
    if (stepVx < 0 && bullet.prevX > bullet.r && newX < bullet.r) { const t = (bullet.r - bullet.prevX) / stepVx; if (t < boundaryT) { boundaryT = t; hitBoundary = true; } }
    if (stepVx > 0 && bullet.prevX < W - bullet.r && newX >= W - bullet.r) { const t = (W - bullet.r - bullet.prevX) / stepVx; if (t < boundaryT) { boundaryT = t; hitBoundary = true; } }
    if (stepVy < 0 && bullet.prevY > bullet.r && newY < bullet.r) { const t = (bullet.r - bullet.prevY) / stepVy; if (t < boundaryT) { boundaryT = t; hitBoundary = true; } }
    if (stepVy > 0 && bullet.prevY < H - bullet.r && newY >= H - bullet.r) { const t = (H - bullet.r - bullet.prevY) / stepVy; if (t < boundaryT) { boundaryT = t; hitBoundary = true; } }

    if (hitWall && minT < boundaryT) { // Đã va vào tường
        // Xử lý xuyên tường cho buff của boss
        if (bullet.isPiercing && typeof bullet.bossPierceRemaining === 'number' && bullet.bossPierceRemaining > 1) {
            if (bullet.hasShotSplit && !bullet._shotSplitConsumed) {
                spawnShotSplitChildren(bullet);
                bullet.alive = false;
                return;
            }
            bullet.bossPierceRemaining = 1; // Tiêu thụ lượt xuyên
            bullet.isPiercing = false; // Ngừng xuyên sau khi trúng tường
            bullet.bossPierceExhausted = true;
            bullet.x = newX; // Tiếp tục bay
            bullet.y = newY;
            return; // Bỏ qua logic nảy/phá hủy
        }

        bullet.x = hitPoint.x;
        bullet.y = hitPoint.y;
        bounceBullet(bullet, hitWall);
        if (bullet.hasShotSplit && !bullet._shotSplitConsumed) {
            spawnShotSplitChildren(bullet);
            bullet.alive = false;
            return;
        }
        let remainingT = Math.max(0, (1 - minT) - 0.02);
        if (remainingT > 0.005) {
            bullet.x += bullet.vx * remainingT;
            bullet.y += bullet.vy * remainingT;
        }
    } else if (hitBoundary) {
        bullet.x = bullet.prevX + (newX - bullet.prevX) * boundaryT;
        bullet.y = bullet.prevY + (newY - bullet.prevY) * boundaryT;
        bounceBullet(bullet);
        if (bullet.hasShotSplit && !bullet._shotSplitConsumed) {
            spawnShotSplitChildren(bullet);
            bullet.alive = false;
            return;
        }
        let remainingT = Math.max(0, (1 - boundaryT) - 0.02);
        if (remainingT > 0.005) {
            bullet.x += bullet.vx * remainingT;
            bullet.y += bullet.vy * remainingT;
            bullet.x = clamp(bullet.x, bullet.r, W - bullet.r);
            bullet.y = clamp(bullet.y, bullet.r, H - bullet.r);
        }
    } else {
        bullet.x = newX;
        bullet.y = newY;
        if (bullet.x < bullet.r || bullet.x > W - bullet.r || bullet.y < bullet.r || bullet.y > H - bullet.r) {
            bounceBullet(bullet);
            if (bullet.hasShotSplit && !bullet._shotSplitConsumed) {
                spawnShotSplitChildren(bullet);
                bullet.alive = false;
                return;
            }
            bullet.x = clamp(bullet.x, bullet.r, W - bullet.r);
            bullet.y = clamp(bullet.y, bullet.r, H - bullet.r);
        }
    }
}