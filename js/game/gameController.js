import {
    flashMsg, BUFF_COLORS
} from '../main.js';
import {
    p1, p2, tanks, boss, setBoss, bullets, buffs,
    gameMode, devGodMode, setDevGodMode, devNoWalls, setDevNoWalls, devOneHitKill, setDevOneHitKill,
    scoreP1, scoreP2, setScore, setOverlay, roundEnding, setRoundEnding,
    buffTimer, setBuffTimer, ObjectPools, setTanks, setBullets, setBuffs
} from '../state.js';
import { W, H } from '../canvas.js';
import { CHARGE_HOLD_TIME, CHARGE_AMMO_COST } from '../config.js';
import { input } from './input.js';
import { addExplosion, addHitExplosion, addPickupFX, trails, clearAnimations } from '../rendering/animations.js';
import Bullet from '../classes/Bullet.js';
import Boss from '../classes/Boss.js';
import Tank from '../classes/Tank.js';
import Buff from '../classes/Buff.js';
import { dist, clamp } from '../utils.js';
import { lineCircleColl, circleColl, pointToLineDistanceSq, circleRectColl } from './collision.js';
import { obstacles, randomObstacles, clearObstacles } from './obstacles.js';
import { showStatus, applyPoisonEffect, applyEffect, tagEffect } from '../systems/effects.js';
import { BuffFactory } from '../systems/buffs.js';
import { bossMode, exitBossMode, showBuffSelection, reapplyPermanentBuffs, applyBossModeBuff } from './bossMode.js';
import { buffTypes } from '../constants.js';
import { applyStatSettings, syncSettingsUI } from '../ui/settings.js';

function fireNormalShot(tank, now) {
    if (!tank || !tank.canShoot(now)) return false;

    if (tank.shotgun) {
        // Bắn chùm tốn 3 viên đạn
        if (tank.ammo < 3) {
            showStatus(tank, 'Không đủ đạn!', '#ffd166', 800);
            return false;
        }
        tank.ammo -= 3;
        tank.lastShot = now;

        for (let i = -1; i <= 1; i++) {
            // Tạo đạn thủ công thay vì gọi tank.shoot() nhiều lần
            const angleOffset = i * 0.15;
            const finalAngle = tank.angle + angleOffset;
            const bullet = new Bullet(tank.x, tank.y, finalAngle, tank);
            bullet.x += Math.cos(finalAngle) * (tank.r + bullet.r + 1);
            bullet.y += Math.sin(finalAngle) * (tank.r + bullet.r + 1);
            bullets.push(bullet);
        }
        return true;
    }

    if (tank.ammo <= 0) return false;

    const bullet = tank.shoot(now);
    if (bullet) {
        bullets.push(bullet);
        return true;
    }
    return false;
}

function fireChargedShot(tank, now) {
    if (!tank || tank.ammo < CHARGE_AMMO_COST || !tank.canShoot(now)) {
        showStatus(tank, 'Không đủ đạn!', '#ffd166', 800);
        return false;
    }

    // Trừ đạn và reset cooldown
    tank.ammo = Math.max(0, tank.ammo - CHARGE_AMMO_COST);
    tank.lastShot = now;
    tank.shootHoldTime = 0;

    // Tạo viên đạn tụ lực mới
    const bulletRadius = 10;
    const safeDist = tank.r + bulletRadius + 1; // Đẩy đạn ra ngoài 1 pixel để tránh va chạm
    const bx = tank.x + Math.cos(tank.angle) * safeDist;
    const by = tank.y + Math.sin(tank.angle) * safeDist;
    const bullet = new Bullet(bx, by, tank.angle, tank);

    // Thiết lập thuộc tính cho đạn tụ lực
    bullet.damage = Math.max(3, (bullet.damage || 1) * 3);
    bullet.isCharged = true;
    bullet.color = '#ffd166';
    bullet.glow = true;
    bullet.r = bulletRadius;
    bullets.push(bullet);

    showStatus(tank, 'Đạn tụ lực', '#ffd166', 900);
    addHitExplosion({
        x: tank.x + Math.cos(tank.angle) * (tank.r + 6),
        y: tank.y + Math.sin(tank.angle) * (tank.r + 6),
        color: '#ffd166',
        startTime: performance.now(),
        duration: 260
    });
    return true;
}

function handlePlayerShooting(dt, now) {
    for (const t of [p1, p2]) {
        if (t.possession && !t.possessionFired && t.canShoot(now) && !t.silenced) {
            const b = t.shoot(now);
            if (b) bullets.push(b);
            t.possessionFired = true;
        }

        const shootKey = t.controls.shoot;
        const isDown = !!input[shootKey] && !t.possession;

        // Nếu phím đang được giữ
        if (isDown) {
            if (!t.wasShootDown) { // Frame đầu tiên nhấn phím
                t.wasShootDown = true;
                t.shootHoldTime = 0;
                t.chargeState = 'charging';
            }
            t.shootHoldTime += dt;

            // Hiển thị trạng thái khi đã tụ lực đủ
            if (t.shootHoldTime >= CHARGE_HOLD_TIME && t.chargeState === 'charging') {
                t.chargeState = 'armed';
                showStatus(t, 'Đã tụ lực!', '#ffd166', 900);
            }
        } 
        // Nếu phím được nhả ra
        else {
            if (t.wasShootDown) { // Vừa mới nhả phím
                if (!t.silenced && !t.stunned) {
                    // Quyết định bắn loại đạn nào dựa trên thời gian giữ phím
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

function handleBulletCollisions(now) {
    for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i];
        if (!b || !b.alive) continue;

        for (let j = 0; j < tanks.length; j++) {
            const t = tanks[j];
            if (!t || t.hp <= 0 || t.invisible) continue;

            const dx = t.x - b.x, dy = t.y - b.y;
            const maxDist = t.r + (b.r || 4) + Math.hypot(b.vx || 0, b.vy || 0);
            if (dx * dx + dy * dy > maxDist * maxDist) continue;

            const hitLine = lineCircleColl(b.prevX, b.prevY, b.x, b.y, t.x, t.y, t.r);
            const hitPoint = circleColl(t, b);

            if (hitLine || hitPoint) {
                console.log(`[Collision] Bullet from ${b.owner === p1 ? 'P1' : 'P2'} hit tank ${t === p1 ? 'P1' : 'P2'}. Creating explosion.`);
                if (gameMode === 'vsboss') {
                    if ((b.owner === p1 || b.owner === p2) && (t === p1 || t === p2)) continue;
                }
                if (b.owner instanceof Boss || (b.owner && b.owner.isMiniSlime)) {
                    if (t instanceof Boss || t.isMiniSlime) continue;
                }
                if (b.isPiercing) {
                    if (!b.piercedTargets) b.piercedTargets = new Set();
                    if (b.piercedTargets.has(t)) continue;
                    b.piercedTargets.add(t);
                }

                const isPlayer = (t === p1 || t === p2);
                const skipDamage = devGodMode && isPlayer;
                addHitExplosion({ x: b.x, y: b.y, color: '#f00', startTime: now });

                if (!t.shield && !skipDamage) {
                    let damage = Math.max(1, b.damage || 1);
                    if (t instanceof Boss && t.damageReduction && t.damageReduction < 1) {
                        damage *= t.damageReduction;
                        damage = Math.max(0.1, damage);
                    }
                    t.hp = Math.max(0, t.hp - damage);
                    if (b.isPoison) applyPoisonEffect(t);
                }

                if (!b.isPiercing) {
                    b.alive = false;
                    break;
                }
            }
        }
    }
}

function checkWinConditions() {
    if (roundEnding || bossMode.showingBuffSelection) return;

    for (let i = tanks.length - 1; i >= 0; i--) {
        const t = tanks[i];
        if (t.hp <= 0) {
            if (t.isClone || t.isMiniSlime) {
                tanks.splice(i, 1);
            } else if (t === boss) {
                continue;
            } else {
                if (boss && gameMode === 'vsboss') {
                    const alivePlayers = [p1, p2].filter(p => p && p.hp > 0);
                    if (alivePlayers.length === 0) {
                        setOverlay('GAME OVER - Boss Wins!', 2000);
                        setOverlay('GAME OVER - Boss Wins!', performance.now() + 2000);
                        setRoundEnding(true);
                        setTimeout(() => { exitBossMode(); setOverlay(null, 0); setRoundEnding(false); }, 2000);
                    }
                } else {
                    if (t === p1) setScore(scoreP1, scoreP2 + 1);
                    else setScore(scoreP1 + 1, scoreP2);
                    setOverlay((t === p1 ? 'P2' : 'P1') + ' WIN', 1000);
                    setOverlay((t === p1 ? 'P2' : 'P1') + ' WIN', performance.now() + 1000);
                    setRoundEnding(true);
                    setTimeout(() => { resetAfterKill(); setOverlay(null, 0); setRoundEnding(false); }, 1000);
                    break;
                }
            }
        }
    }

    if (!roundEnding && boss && boss.hp <= 0) {
        const index = tanks.indexOf(boss);
        if (index !== -1) tanks.splice(index, 1);
        setBoss(null);
        tanks.splice(0, tanks.length, ...tanks.filter(t => !t.isMiniSlime));
        setOverlay('BOSS DEFEATED!', 2000);
        setOverlay('BOSS DEFEATED!', performance.now() + 2000);
        setRoundEnding(true);
        setTimeout(() => {
            setOverlay(null, 0);
            setRoundEnding(false);
            showBuffSelection();
        }, 2000);
    }
}

function handleBuffSpawning(dt) {
    if (gameMode === 'pvp' || gameMode === 'vsboss') {
        setBuffTimer(buffTimer + dt);
        if (buffTimer > 10000) {
            if (Math.random() < 0.4) spawnBuff();
            setBuffTimer(0);
        }
    }
}

function handleBuffPickup(now) {
    for (const buff of buffs) {
        if (!buff.active) continue;
        for (const t of tanks) {
            if (dist(t, buff) < t.r + buff.r) {                
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
                                t.r *= 0.7;
                            },
                            state=>{
                                if(state && state.originalRadius!==undefined) t.r = state.originalRadius;
                                else t.r = t.baseRadius;
                            }
                        );
                        tagEffect(effShrink,'Thu nhỏ',buff.color);
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
                        showStatus(t,'Nạp nhanh',buff.color);
                        break;
                    }
                    case 'bigbullet':
                        BuffFactory.createEffect(t, 'bigbullet', 10000);
                        break;
                    case 'clone':
                        flashMsg(`${t===p1?'P1':'P2'} tạo phân thân!`);
                        spawnClone(t);
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
                        const nukeColor = buff.color || BUFF_COLORS.nuke;
                        tanks.forEach(tk=>{
                            const isPlayer = (tk === p1 || tk === p2);
                            if(tk.hp > 0 && !(devGodMode && isPlayer)){
                                tk.hp = Math.min(tk.maxHp, 0.1);
                                addPickupFX({x:tk.x,y:tk.y,color:nukeColor,start:now, duration:600});
                            }
                        });
                        addExplosion({
                            x: W/2,
                            y: H/2,
                            radius: Math.max(W,H),
                            startTime: performance.now(),
                            duration: 600
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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
                        addPickupFX({x:t.x,y:t.y,color:buff.color,start:now});
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

function cleanupBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (!bullets[i].alive) {
            ObjectPools.returnBullet(bullets.splice(i, 1)[0]);
        }
    }
}

function handleTrailDamage(dt, now) {
    const TRAIL_DPS = 0.2; // 0.2 HP mỗi giây
    const damage = TRAIL_DPS * dt / 1000;

    for (const tank of tanks) {
        if (tank.hp <= 0 || tank.invisible) continue;

        for (const trail of trails) {
            // Tính tổng bán kính va chạm (bán kính tank + nửa độ rộng của vệt dung nham)
            const collisionRadius = tank.r + (trail.width || 6) / 2;
            const distSq = pointToLineDistanceSq(tank.x, tank.y, trail.x, trail.y, trail.endX, trail.endY);
            if (distSq < collisionRadius * collisionRadius) {
                const isPlayer = (tank === p1 || tank === p2);
                if (devGodMode && isPlayer) continue;

                tank.hp = Math.max(0, tank.hp - damage);

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

export function resetAfterKill() {
    if (gameMode === 'vsboss') {
        p1.x = 110; p1.y = 110; p1.vx = 0; p1.vy = 0; p1.angle = 0;
        p2.x = 790; p2.y = 450; p2.vx = 0; p2.vy = 0; p2.angle = Math.PI;
        if (boss) {
            boss.hp = boss.maxHp;
            boss.x = W / 2;
            boss.y = H / 2;
            boss.vx = 0;
            boss.vy = 0;
        }
        setBullets([]); setBuffs([]);
        setTanks(tanks.filter(t => !t.isClone && !t.isMiniSlime));
        if (!tanks.includes(p1)) tanks.push(p1);
        if (!tanks.includes(p2)) tanks.push(p2);
        if (typeof reapplyPermanentBuffs === 'function') reapplyPermanentBuffs();
        p1.hp = p1.maxHp;
        p2.hp = p2.maxHp;
    } else {
        p1.hp = p1.maxHp; p1.x = 110; p1.y = 110; p1.vx = 0; p1.vy = 0; p1.angle = 0; p1.resetStatus();
        p2.hp = p2.maxHp; p2.x = 790; p2.y = 450; p2.vx = 0; p2.vy = 0; p2.angle = Math.PI; p2.resetStatus();
        p1.possession = false; p1.possessionFired = false;
        p2.possession = false; p2.possessionFired = false;
        p1.silenced = false; p2.silenced = false;
        p1.rooted = false; p2.rooted = false;
        p1.invisible = false; p2.invisible = false;
        setBullets([]); setBuffs([]);
        setTanks(tanks.filter(t => !t.isClone));
        if (tanks.length < 2) {
            setTanks([p1, p2]);
        }
    }
    clearObstacles();
    clearAnimations();
    randomObstacles();
    if (typeof applyStatSettings === 'function') applyStatSettings();
}

export function spawnClone(tank) {
    const clone = new Tank(tank.x + 30, tank.y + 30, tank.color, {});
    clone.isClone = true;
    clone.hp = tank.hp;
    clone.moveSpeed = 0;
    clone.friction = 1;
    clone.baseMoveSpeed = clone.moveSpeed;
    clone.baseFriction = clone.friction;
    clone.baseReloadRate = clone.reloadRate;
    clone.baseRadius = clone.r;
    clone.baseControls = { ...clone.controls };
    clone.reloadRate = 0;
    clone.reloadCooldown = 0;
    clone.explosive = tank.explosive || false;
    clone.bigBullet = tank.bigBullet || false;
    clone.ricochet = tank.ricochet || false;
    clone.pierce = tank.pierce || false;
    clone.poisonBullet = tank.poisonBullet || false;
    clone.canShoot = function (now) { return now - this.lastShot >= 3000 && this.ammo > 0; };
    clone.maxAmmo = 3;
    clone.ammo = clone.maxAmmo;
    clone.update = function (dt, input) {
        Tank.prototype.update.call(this, dt, {});
        this.speed = 0;
        let target = null;
        if (gameMode === 'vsboss' && boss) {
            target = boss;
        } else {
            const opponent = (tank === p1) ? p2 : p1;
            if (opponent && opponent.hp > 0) {
                target = opponent;
            } else {
                target = tanks.find(t => t.isClone && t.hp > 0 && t.color !== this.color) || null;
            }
        }
        if (target && target.hp > 0) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            const now = performance.now();
            if (this.canShoot(now)) {
                const b = this.shoot(now);
                if (b) bullets.push(b);
            }
        } else {
            // No target
        }
        if (this.ammo <= 0 && !this.pendingRemoval) {
            this.pendingRemoval = true;
            this.fadeOutTimer = 600;
        }
    };
    tanks.push(clone);
}

export function spawnBot() {
    spawnClone(p1);
    flashMsg('Bot hỗ trợ xuất hiện!');
}

function updateMiniSlimeAI(miniSlime, dt) {
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
    miniSlime.angle = Math.atan2(target.y - miniSlime.y, target.x - miniSlime.x);
    const now = performance.now();
    if (now - miniSlime.lastShot >= miniSlime.reload) {
        const bullet = miniSlime.shoot(now);
        if (bullet) {
            bullets.push(bullet);
        }
    }

    // Chaotic movement
    miniSlime.chaosMoveTimer += dt;
    if (miniSlime.chaosMoveTimer > 1000) { // Change direction every second
        miniSlime.chaosMoveAngle = Math.random() * Math.PI * 2;
        miniSlime.chaosMoveTimer = 0;
    }
    
    miniSlime.speed += miniSlime.moveSpeed * dt / 16;
    miniSlime.speed *= miniSlime.friction;

    const moveX = Math.cos(miniSlime.chaosMoveAngle) * miniSlime.speed;
    const moveY = Math.sin(miniSlime.chaosMoveAngle) * miniSlime.speed;
    miniSlime.x = clamp(miniSlime.x + moveX, miniSlime.r, W - miniSlime.r);
    miniSlime.y = clamp(miniSlime.y + moveY, miniSlime.r, H - miniSlime.r);
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

export function updateGame(dt, now) {
    handlePlayerShooting(dt, now);
    handleBulletCollisions(now);
    handleTrailDamage(dt, now);
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

export function handleDevKeys(e) {
    switch(e.key.toLowerCase()){
        // SPAWN BUFF CỤ THỂ
        case 'z': spawnBuff('heal'); flashMsg('Tạo buff: hồi máu'); break;
        case '2': spawnBuff('speed'); flashMsg('Tạo buff: tăng tốc'); break;
        case 'c': spawnBuff('homing'); flashMsg('Tạo buff: đạn tự dẫn'); break;
        case 'v': spawnBuff('invis'); flashMsg('Tạo buff: tàng hình'); break;
        case '5': spawnBuff('shrink'); flashMsg('Tạo buff: thu nhỏ'); break;
        case '6': spawnBuff('shield'); flashMsg('Tạo buff: khiên'); break;
        case '7': spawnBuff('rapidfire'); flashMsg('Tạo buff: nạp nhanh'); break;
        case '8': spawnBuff('bigbullet'); flashMsg('Tạo buff: đạn to'); break;
        case '9': spawnBuff('clone'); flashMsg('Tạo buff: phân thân'); break;
        case '0': spawnBuff('shotgun'); flashMsg('Tạo buff: bắn chùm'); break;
        case 'q': spawnBuff('ricochet'); flashMsg('Tạo buff: nảy vô hạn'); break;
        case 'y': spawnBuff('giantEnemy'); flashMsg('Tạo buff: kẻ địch khổng lồ'); break;
        case 'e': spawnBuff('reverse'); flashMsg('Tạo buff: đảo phím'); break;
        case 'r': spawnBuff('explosive'); flashMsg('Tạo buff: đạn nổ'); break;
        case 't': spawnBuff('root'); flashMsg('Tạo buff: trói chân'); break;
        case 'u': spawnBuff('pierce'); flashMsg('Tạo buff: đạn xuyên'); break;
        case 'i': spawnBuff('poison'); flashMsg('Tạo buff: đạn độc'); break;
        case 'p': spawnBuff('nuke'); flashMsg('Tạo buff: bom nguyên tử'); break;
        case 'j': spawnBuff('trail'); flashMsg('Tạo buff: dung nham'); break;
        case 'l': spawnBuff('possession'); flashMsg('Tạo buff: thôi miên'); break;
        case 'x': spawnBuff('fury'); flashMsg('Tạo buff: cuồng nộ'); break;

        // PHÍM KHÁC (giữ nguyên các chức năng Dev Mode hiện tại)
        case 'h': p1.hp=p1.maxHp; p2.hp=p2.maxHp; flashMsg('HP full'); break;
        case 'm':
            setDevOneHitKill(!devOneHitKill);
            flashMsg(devOneHitKill ? '1 Hit Kill ON' : '1 Hit Kill OFF');
            if(devOneHitKill){
                showStatus(p1,'Sát thương 999999','#ff0000',900);
                showStatus(p2,'Sát thương 999999','#ff0000',900);
            }
            syncSettingsUI();
            break;
        case 't': 
            // TEST: Force slime boss jump
            if (boss && boss.bossType === 'slime') {
                boss.jumpAttack(p1);
                flashMsg('🧪 TEST: Force slime jump!');
            }
            break;
        case '1':
            // TEST: Add ALL buffs
            if (gameMode === 'vsboss') {
                console.log('🧪 ADDING ALL BUFFS');
                const allBuffs = ['muscle', 'thickSkin', 'agility', 'bulletSpeed'];
                allBuffs.forEach(buff => {
                    if (!bossMode.permanentBuffs.includes(buff)) {
                        bossMode.permanentBuffs.push(buff);
                        applyBossModeBuff(buff);
                    }
                });
                console.log('All buffs added:', bossMode.permanentBuffs);
                console.log('P1 final stats:', {
                    damage: p1.damage, 
                    maxHp: p1.maxHp, 
                    hp: p1.hp, 
                    moveSpeed: p1.moveSpeed?.toFixed(3),
                    bulletSpeed: p1.bulletSpeedMultiplier?.toFixed(2)
                });
                flashMsg('🧪 Added ALL buffs for testing!');
            } else {
                flashMsg('❌ Not in boss mode!');
            }
            break;
        case '3':
            // TEST: Clear all buffs
            if (gameMode === 'vsboss') {
                console.log('🧪 CLEARING ALL BUFFS');
                console.log('Before clear:', bossMode.permanentBuffs);
                bossMode.permanentBuffs = [];
                reapplyPermanentBuffs();
                console.log('After clear:', bossMode.permanentBuffs);
                console.log('P1 stats after clear:', {damage: p1.damage, maxHp: p1.maxHp, hp: p1.hp});
                flashMsg('🧪 Cleared all buffs!');
            } else {
                flashMsg('❌ Not in boss mode!');
            }
            break;
        case '5':
            // TEST: Manual bullet damage
            const dmgTestBullet = new Bullet(p1.x + 50, p1.y, 0, p1);
            console.log('🧪 TEST BULLET DAMAGE');
            console.log('P1 damage:', p1.damage);
            console.log('Bullet damage:', dmgTestBullet.damage);
            console.log('P1 bossBuffStats:', p1.bossBuffStats);
            bullets.push(dmgTestBullet);
            flashMsg(`🧪 Test bullet: P1 dmg=${p1.damage}, bullet dmg=${dmgTestBullet.damage}`);
            break;
        case 'b': {
            const devBullet = new Bullet(450,280,Math.random()*Math.PI*2,p1);
            // styleBulletForOwner is now internal to Bullet constructor via Tank.shoot
            bullets.push(devBullet);
            flashMsg('Spawn bullet');
            break;
        }
        case 'o': resetAfterKill(); flashMsg('Reset game'); break;
        case 'f': p1.reloadRate*=5; p2.reloadRate*=5; flashMsg('Fast reload'); break;
        case 'k': spawnBuff('silence'); flashMsg('Tạo buff: câm lặng'); break;
        case 'n':
            setDevNoWalls(!devNoWalls);
            flashMsg(devNoWalls?'No Walls ON':'No Walls OFF');
            syncSettingsUI();
            break;
        case 'g':
            setDevGodMode(!devGodMode);
            flashMsg(devGodMode?'Bất tử ON':'Bất tử OFF');
            if(devGodMode){
                showStatus(p1,'Miễn sát thương','#ffe27a',900);
                showStatus(p2,'Miễn sát thương','#ffe27a',900);
            }
            syncSettingsUI();
            break;
    }
}