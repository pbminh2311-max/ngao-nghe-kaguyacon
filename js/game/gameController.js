import {
    p1, p2, tanks, boss, setBoss, bullets, buffs,
    gameMode, buffTimer, setBuffTimer, devGodMode
} from '../state.js';
import { W, H } from '../canvas.js';
import Buff from '../classes/Buff.js';
import Bullet from '../classes/Bullet.js';
import { flashMsg } from '../main.js';
import { dist, clamp } from '../utils.js';
import { circleRectColl, circleColl } from './collision.js';
import { obstacles, randomObstacles, clearObstacles } from './obstacles.js';
import { showStatus, applyPoisonEffect, applyEffect, tagEffect } from '../systems/effects.js';
import { BuffFactory } from '../systems/buffs.js';
import { buffTypes, BUFF_COLORS } from '../constants.js';
import { handlePlayerShooting } from './shooting.js';
import { handleBulletCollisions } from './damage.js';
import { checkWinConditions } from './gameState.js';
import { pointToLineDistanceSq } from './collision.js';
import { trails, addPickupFX, triggerNukeAnimation, addExplosion } from '../rendering/animations.js';
import { ObjectPools } from '../state.js';
import { addSlimePuddle, updateSlimePuddles, getCorrosivePuddleAt } from './slimeHazards.js';

import { spawnMiniTankCompanion } from './gameState.js';

function handleBuffSpawning(dt) {
    if (gameMode === 'pvp' || gameMode === 'vsboss') {
        setBuffTimer(buffTimer + dt);
        if (buffTimer > 10000) {
            if (Math.random() < 0.4) spawnBuff();
            setBuffTimer(0);
        }
    }
}

function cleanupBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet || bullet.alive) continue;

        if (bullet.puddleConfig && !bullet._puddleSpawned) {
            addSlimePuddle({
                x: bullet.x,
                y: bullet.y,
                ...bullet.puddleConfig
            });
            bullet._puddleSpawned = true;
        }

        ObjectPools.returnBullet(bullets.splice(i, 1)[0]);
    }
}

function handleBuffPickup(now) {
    for (const buff of buffs) {
        if (!buff || !buff.active) continue;
        for (const t of tanks) {
            if (t && t.bossMagnetRadius && t.bossMagnetRadius > 0) {
                const magnetDist = dist(t, buff);
                if (magnetDist > 0 && magnetDist < t.bossMagnetRadius) {
                    const pullStrength = clamp(1 - magnetDist / t.bossMagnetRadius, 0.25, 0.9);
                    const angle = Math.atan2(t.y - buff.y, t.x - buff.x);
                    buff.x += Math.cos(angle) * pullStrength * 6;
                    buff.y += Math.sin(angle) * pullStrength * 6;
                    addPickupFX({ x: buff.x, y: buff.y, color: BUFF_COLORS.magnetSmall, start: now, duration: 200 });
                }
            }

            if (t && dist(t, buff) < t.r + buff.r) {
                // Xác định target cho debuff
                let debuffTarget = null;
                
                if (gameMode === 'vsboss' && boss) {
                    // Trong boss mode, debuff áp vào boss
                    const debuffBuffs = ['giantEnemy', 'reverse', 'root', 'silence', 'possession'];
                    if (debuffBuffs.includes(buff.type)) {
                        debuffTarget = boss;
                    }
                } else {
                    // PvP mode bình thường
                    debuffTarget = (t === p1) ? p2 : p1;
                }
                
                switch(buff.type){
                    case 'heal':
                        BuffFactory.createEffect(t, 'heal', 20000);
                        break;
                    case 'speed':
                        BuffFactory.createEffect(t, 'speed', 10000);
                        break;
                    case 'homing':
                        BuffFactory.createEffect(t, 'homing', 10000);
                        break;
                    case 'invis':
                        BuffFactory.createEffect(t, 'invis', 10000);
                        break;
                    case 'shrink': {
                        flashMsg(`${t===p1?'P1':'P2'} thu nhỏ!`);
                        const effShrink = applyEffect(t,'shrink',10000,
                            state=>{
                                state.originalRadius = t.r;
                                if (t.r) t.r *= 0.7;
                            },
                            state=>{
                                if(state && state.originalRadius!==undefined) t.r = state.originalRadius;
                                else t.r = t.baseRadius;
                            }
                        );
                        tagEffect(effShrink,'Thu nhỏ',buff.color);
                        showStatus(t,'Thu nhỏ',buff.color);
                        break;
                    }
                    case 'shield':
                        BuffFactory.createEffect(t, 'shield', 10000);
                        break;
                    case 'rapidfire': {
                        flashMsg(`${t===p1?'P1':'P2'} hồi đạn nhanh!`);
                        const effRapid = applyEffect(t,'rapidfire',10000,
                            state=>{
                                state.originalReloadRate = t.reloadRate;
                                t.reloadRate = t.baseReloadRate * 5;
                            },
                            state=>{
                                if(state && state.originalReloadRate!==undefined) t.reloadRate = state.originalReloadRate;
                                else t.reloadRate = t.baseReloadRate;
                            }
                        );
                        tagEffect(effRapid,'Nạp nhanh',buff.color);
                        showStatus(t,'Nạp nhanh',buff.color);
                        break;
                    }
                    case 'bigbullet':
                        BuffFactory.createEffect(t, 'bigbullet', 10000);
                        break;
                    case 'clone':
                        flashMsg(`${t===p1?'P1':'P2'} tạo phân thân!`);
                        spawnMiniTankCompanion(t);
                        applyEffect(t, 'clone', 800); // Kích hoạt hiệu ứng hình ảnh
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
                        showStatus(t,'Phân thân',buff.color);
                        break;
                    case 'shotgun':
                        BuffFactory.createEffect(t, 'shotgun', 10000);
                        break;
                    case 'ricochet':
                        BuffFactory.createEffect(t, 'ricochet', 10000);
                        break;
                    case 'explosive':
                        BuffFactory.createEffect(t, 'explosive', 10000);
                        break;
                    case 'pierce':
                        BuffFactory.createEffect(t, 'pierce', 10000);
                        break;
                    case 'poison':
                        BuffFactory.createEffect(t, 'poisonShots', 10000);
                        break;
                    case 'nuke': {
                        flashMsg('Bom nguyên tử kích hoạt!');
                        triggerNukeAnimation(); // Kích hoạt hiệu ứng nổ
                        const nukeColor = buff.color || BUFF_COLORS.nuke;
                        tanks.forEach(tk=>{
                            if(tk && tk.hp > 0){
                                tk.hp = Math.min(tk.maxHp, 0.1);
                            }
                        });
                        break;
                    }
                    case 'trail':
                        BuffFactory.createEffect(t, 'trail', 10000);
                        break;
                    case 'fury': {
                        flashMsg(`${t===p1?'P1':'P2'} cuồng nộ!`);
                        const effFury = applyEffect(t,'fury',10000,
                            state=>{
                                state.drainTimer = 0;
                                t.fury = true;
                            },
                            state=>{
                                t.fury = false;
                            },
                            (dt, tank, state) => {
                                if(tank.hp <= 0.1) {
                                    state.cancelled = true;
                                    tank.fury = false;
                                    return;
                                }
                                state.drainTimer += dt;
                                if(state.drainTimer >= 1000) {
                                    tank.hp = Math.max(0.1, tank.hp - 0.1);
                                    state.drainTimer = 0;
                                    showStatus(tank,'-0.1 HP','#dc143c',600);
                                }
                            }
                        );
                        tagEffect(effFury,'Cuồng nộ',buff.color);
                        showStatus(t,'Cuồng nộ',buff.color);
                        break;
                    }
                    
                    case 'giantEnemy': {
                        const enemy = debuffTarget || ((t===p1)?p2:p1);
                        flashMsg(`${t===p1?'P1':'P2'} tăng kích thước ${enemy === boss ? 'boss' : 'đối thủ'}!`);
                        const effGiant = applyEffect(enemy,'giantEnemy',10000,
                            state=>{
                                state.originalRadius = enemy.r;
                                enemy.r *= 1.5;
                                enemy.displayRadius = enemy.r;
                            },
                            state=>{
                                if(state && state.originalRadius!==undefined) enemy.r = state.originalRadius;
                                else enemy.r = enemy.baseRadius;
                                enemy.displayRadius = enemy.r;
                            }
                        );
                        tagEffect(effGiant,'Khổng lồ',buff.color);
                        showStatus(t,'Khổng lồ',buff.color);
                        showStatus(enemy,'Bị phóng to!',buff.color,2000);
                        break;
                    }
                    
                    case 'reverse': {
                        const ctrlEnemy = debuffTarget || ((t===p1)?p2:p1);
                        
                        // Boss không bị đảo phím (vì boss không dùng controls)
                        if (ctrlEnemy === boss) {
                            flashMsg('Boss miễn nhiễm đảo phím!');
                            break;
                        }
                        
                        flashMsg(`${t===p1?'P1':'P2'} đảo ngược phím đối thủ!`);
                        const effReverse = applyEffect(ctrlEnemy,'reverse',10000,
                            state=>{
                                state.originalControls = {...ctrlEnemy.controls};
                                ctrlEnemy.controls = {
                                    forward: state.originalControls.back,
                                    back: state.originalControls.forward,
                                    left: state.originalControls.right,
                                    right: state.originalControls.left,
                                    shoot: state.originalControls.shoot
                                };
                            },
                            state=>{
                                if(state && state.originalControls){
                                    ctrlEnemy.controls = {...state.originalControls};
                                } else if(ctrlEnemy.baseControls){
                                    ctrlEnemy.controls = {...ctrlEnemy.baseControls};
                                }
                            }
                        );
                        tagEffect(effReverse,'Đảo phím',buff.color);
                        showStatus(t,'Đảo phím',buff.color);
                        showStatus(ctrlEnemy,'Phím bị đảo',buff.color,2000);
                        break;
                    }
                    
                    case 'root': {
                        const target = debuffTarget || ((t===p1)?p2:p1);
                        flashMsg(`${t===p1?'P1':'P2'} khoá chân ${target === boss ? 'boss' : 'đối thủ'}!`);
                        const effRoot = applyEffect(target,'root',5000,
                            ()=>{target.rooted = true;},
                            ()=>{target.rooted = false;}
                        );
                        tagEffect(effRoot,'Bị trói chân',buff.color);
                        showStatus(t,'Trói chân',buff.color);
                        showStatus(target,'Bị trói chân',buff.color,2000);
                        break;
                    }
                    
                    case 'silence': {
                        const enemy = debuffTarget || ((t===p1)?p2:p1);
                        flashMsg(`${t===p1?'P1':'P2'} cấm ${enemy === boss ? 'boss' : 'đối thủ'} bắn!`);
                        enemy.shootHoldTime = 0;
                        enemy.chargeState = 'idle';
                        enemy.wasShootDown = false;
                        const effSilence = applyEffect(enemy,'silence',8000,
                            ()=>{enemy.silenced = true;},
                            ()=>{enemy.silenced = false;}
                        );
                        tagEffect(effSilence,'Câm lặng',buff.color);
                        showStatus(t,'Câm lặng',buff.color);
                        showStatus(enemy,'Không thể bắn!',buff.color,2000);
                        break;
                    }
                    
                    case 'possession': {
                        const enemy = debuffTarget || ((t===p1)?p2:p1);
                        if (enemy === boss) {
                            flashMsg('Boss miễn nhiễm thôi miên!');
                            break;
                        }
                        flashMsg(`${t===p1?'P1':'P2'} thôi miên đối thủ!`);
                        const effPossession = applyEffect(enemy,'possession',5000,
                            ()=>{enemy.possession = true; enemy.possessionFired = false;},
                            ()=>{enemy.possession = false; enemy.possessionFired = false;}
                        );
                        tagEffect(effPossession,'Thôi miên',buff.color);
                        showStatus(t,'Thôi miên',buff.color);
                        showStatus(enemy,'Bị thôi miên!',buff.color,2000);
                        break;
                    }
                }
                
                buff.active = false;
            }
        }
    }
    buffs.splice(0, buffs.length, ...buffs.filter(b => b.active));
}

function handleTrailDamage(dt, now) {
    const TRAIL_DPS = 0.2; // 0.2 HP mỗi giây
    let baseDamage = TRAIL_DPS * dt / 1000;
    if (baseDamage <= 0) return;
    for (const tank of tanks) {
        if (tank.hp <= 0 || tank.invisible) continue;

        for (const trail of trails) {
            // Tính tổng bán kính va chạm (bán kính tank + nửa độ rộng của vệt dung nham)
            const collisionRadius = tank.r + (trail.width || 6) / 2;
            const distSq = pointToLineDistanceSq(tank.x, tank.y, trail.x, trail.y, trail.endX, trail.endY);
            if (distSq < collisionRadius * collisionRadius) {
                let damage = baseDamage;
                if (damage <= 0) continue;
                tank.hp = Math.max(0, tank.hp - damage); // Simplified damage application

                // Apply a short burning visual effect
                const burnEffect = applyEffect(tank, 'burning', 250,
                    () => { tank.isBurning = true; },
                    () => { tank.isBurning = false; }
                );
                tagEffect(burnEffect, 'Cháy', BUFF_COLORS.trail);
                // Hiển thị status mỗi giây một lần để tránh spam
                if (now - (tank.lastTrailDamageTime || 0) > 1000) {
                    showStatus(tank, '🔥 Cháy!', '#ff4500', 800);
                    tank.lastTrailDamageTime = now;
                }
                break; // Chỉ nhận sát thương từ 1 vệt dung nham mỗi lần
            }
        }
    }
}

function getAvailableBuffsForMode() {
    const bossModeBannedBuffs = ['nuke', 'invis', 'reverse', 'possession'];
    if (gameMode === 'vsboss') {
        return buffTypes.filter(buff => !bossModeBannedBuffs.includes(buff));
    }
    return buffTypes;
}

export function spawnBuff(type) {
    let x, y, tries = 0;
    do {
        x = 60 + Math.random() * (W - 120);
        y = 60 + Math.random() * (H - 120);
        tries++;
    } while ((obstacles.some(o => circleRectColl({ x, y, r: 10 }, o)) || tanks.some(t => dist(t, { x, y }) < t.r + 10)) && tries < 50);
    if (tries >= 50) return;

    if (!type) {
        const availableBuffs = getAvailableBuffsForMode();
        type = availableBuffs[Math.floor(Math.random() * availableBuffs.length)];
    }
    buffs.push(new Buff(x, y, type));
}

function updateMiniSlimeAI(miniSlime, dt) {
    if (!miniSlime || miniSlime.hp <= 0) return;
    let target = null;
    let minDist = Infinity;
    [p1, p2].forEach(player => {
        if (player && player.hp > 0) {
            const d = dist(miniSlime, player);
            if (d < minDist) {
                minDist = d;
                target = player;
            }
        }
    });
    if (!target) return;

    const now = performance.now();
    const dashCd = miniSlime.dashCooldown || 1200;
    const projCd = miniSlime.projectileCooldown || 4000;
    const distToTarget = dist(miniSlime, target);
    miniSlime.angle = Math.atan2(target.y - miniSlime.y, target.x - miniSlime.x);

    if (now - (miniSlime.lastAdaptiveDash || 0) >= dashCd && distToTarget <= (miniSlime.dashRange || 240)) {
        performMiniSlimeDash(miniSlime, target);
        miniSlime.lastAdaptiveDash = now;
        return; // skip extra movement this frame after dash burst
    }

    if (now - (miniSlime.lastAdaptiveShot || 0) >= projCd) {
        fireMiniSlimeProjectile(miniSlime, target);
        miniSlime.lastAdaptiveShot = now;
    }

    miniSlime.chaosMoveTimer += dt;
    if (miniSlime.chaosMoveTimer > 900) {
        miniSlime.chaosMoveAngle = Math.random() * Math.PI * 2;
        miniSlime.chaosMoveTimer = 0;
    }

    const chaseWeight = clamp(1 - distToTarget / 320, 0.35, 0.9);
    const blendX = Math.cos(miniSlime.chaosMoveAngle) * (1 - chaseWeight) + Math.cos(miniSlime.angle) * chaseWeight;
    const blendY = Math.sin(miniSlime.chaosMoveAngle) * (1 - chaseWeight) + Math.sin(miniSlime.angle) * chaseWeight;
    const moveAngle = Math.atan2(blendY, blendX);

    miniSlime.speed += miniSlime.moveSpeed * dt / 16;
    miniSlime.speed *= miniSlime.friction;

    const moveX = Math.cos(moveAngle) * miniSlime.speed;
    const moveY = Math.sin(moveAngle) * miniSlime.speed;
    miniSlime.x = clamp(miniSlime.x + moveX, miniSlime.r, W - miniSlime.r);
    miniSlime.y = clamp(miniSlime.y + moveY, miniSlime.r, H - miniSlime.r);
}

function performMiniSlimeDash(miniSlime, target) {
    const dashAngle = Math.atan2(target.y - miniSlime.y, target.x - miniSlime.x);
    const dashDist = miniSlime.dashDistance || 190;
    const destX = clamp(miniSlime.x + Math.cos(dashAngle) * dashDist, miniSlime.r, W - miniSlime.r);
    const destY = clamp(miniSlime.y + Math.sin(dashAngle) * dashDist, miniSlime.r, H - miniSlime.r);
    addExplosion({ x: miniSlime.x, y: miniSlime.y, radius: 25, duration: 200, color: '#4ade80' });
    miniSlime.x = destX;
    miniSlime.y = destY;
    addExplosion({ x: miniSlime.x, y: miniSlime.y, radius: 30, duration: 220, color: '#16a34a' });

    if (target && target.hp > 0 && dist(miniSlime, target) <= miniSlime.r + target.r + 6) {
        const damage = miniSlime.dashDamage || 1.5;
        const skipDamage = devGodMode && (target === p1 || target === p2);
        if (!skipDamage) {
            target.hp = Math.max(0, target.hp - damage);
            showStatus(target, `-${damage} HP`, '#f97316', 900);
        }
    }
}

function fireMiniSlimeProjectile(miniSlime, target) {
    const angle = Math.atan2(target.y - miniSlime.y, target.x - miniSlime.x) + (Math.random() - 0.5) * 0.18;
    const speed = 7.3;
    const bullet = new Bullet(miniSlime.x, miniSlime.y, angle, miniSlime);
    bullet.owner = miniSlime;
    bullet.damage = 1;
    bullet.r = 7;
    bullet.color = '#065f46';
    bullet.glow = true;
    bullet.glowColor = '#bbf7d0';
    bullet.vx = Math.cos(angle) * speed;
    bullet.vy = Math.sin(angle) * speed;
    bullet.bossVisual = 'slime';
    bullet.puddleConfig = {
        type: 'sticky',
        radius: 55,
        duration: 2800,
        slowPlayerFactor: 0.78,
        slowBulletFactor: 0.85,
        color: '#22c55e'
    };
    bullets.push(bullet);
}

function handlePlayerBossCollision(now) {
    if (!boss || boss.hp <= 0) return;

    for (const player of [p1, p2]) {
        if (!player || player.hp <= 0 || player.invisible) continue;

        // Check if player is currently immune to touch damage
        if (player.lastBossTouchDamage && now - player.lastBossTouchDamage < 1000) {
            continue; // 1 second immunity
        }

        if (circleColl(player, boss)) {
            console.log(`[Collision] Player ${player === p1 ? 'P1' : 'P2'} touched the boss.`);
            const isPlayer = (player === p1 || player === p2);
            const skipDamage = devGodMode && isPlayer;

            if (!player.shield && !skipDamage) {
                player.hp = Math.max(0, player.hp - 0.5);
                showStatus(player, '-0.5 HP', '#ff8c00', 1000);
                player.lastBossTouchDamage = now;
            }

            // Knockback effect
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            player.x += Math.cos(angle) * 15;
            player.y += Math.sin(angle) * 15;
        }
    }
}

function applyCorrosiveCorePassive(now) {
    const activePlayers = [p1, p2];
    if (!boss || boss.bossType !== 'slime' || !boss.isCorruptedPhase || boss.hp <= 0) {
        activePlayers.forEach(player => {
            if (!player) return;
            player.isInCorrosiveGel = false;
            player.corrosiveDamageFactor = 1;
        });
        if (boss) boss.environmentSpeedMultiplier = 1;
        return;
    }

    const corrosiveTickInterval = 500;
    const corrosiveTickDamage = 0.5;

    activePlayers.forEach(player => {
        if (!player || player.hp <= 0 || player.invisible) return;
        const puddle = getCorrosivePuddleAt(player.x, player.y);
        if (puddle) {
            player.isInCorrosiveGel = true;
            player.corrosiveDamageFactor = puddle.playerDamageDebuff ?? 0.8;
            if (!player.lastCorrosiveTick || now - player.lastCorrosiveTick >= corrosiveTickInterval) {
                const isPlayer = (player === p1 || player === p2);
                const skipDamage = devGodMode && isPlayer;
                if (!skipDamage) {
                    player.hp = Math.max(0, player.hp - corrosiveTickDamage);
                    showStatus(player, `-${corrosiveTickDamage} HP ☣️`, '#84cc16', 600);
                }
                player.lastCorrosiveTick = now;
            }
        } else {
            player.isInCorrosiveGel = false;
            player.corrosiveDamageFactor = 1;
            player.lastCorrosiveTick = 0;
        }
    });

    const bossPuddle = getCorrosivePuddleAt(boss.x, boss.y);
    if (bossPuddle && bossPuddle.createdBy === 'slime_corrupted') {
        boss.environmentSpeedMultiplier = bossPuddle.bossSpeedBuff ?? 1.15;
    } else {
        boss.environmentSpeedMultiplier = 1;
    }
}

export function updateGame(dt, now) {
    handlePlayerShooting(dt, now);
    handleBulletCollisions(now, bullets);
    handleTrailDamage(dt, now);
    updateSlimePuddles(now);
    applyCorrosiveCorePassive(now);
    if (gameMode === 'vsboss') handlePlayerBossCollision(now);
    checkWinConditions();
    handleBuffSpawning(dt);
    handleBuffPickup(now);
    cleanupBullets();
    tanks.forEach(tank => {
        if (tank.isMiniSlime && tank.hp > 0) {
            updateMiniSlimeAI(tank, dt);
        }
    });
}