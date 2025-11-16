import { W, H } from '../../canvas.js';
import { p1, p2, bullets } from '../../state.js';
import { dist, clamp } from '../../utils.js';
import { circleRectColl } from '../game/collision.js';
import { obstacles } from '../game/obstacles.js';
import * as Skills from '../game/bossSkills.js';

export function updateBossAI(boss, dt) {
    let target = null;
    let minDist = Infinity;
    for(const t of [p1, p2]){
        if(t && t.hp > 0){
            const d = dist(boss, t);
            if(d < minDist){
                minDist = d;
                target = t;
            }
        }
    }

    if(target){
        boss.angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        updateBossMovement(boss, target, dt);
    }

    const now = performance.now();
    if(now - boss.lastShot >= boss.reload){
        const b = boss.shoot(now);
        if(b) bullets.push(b);
    }

    updateBossSkills(boss, target, now, dt);
}

function updateBossMovement(boss, target, dt) {
    if (boss.moveSpeed <= 0 || boss.isJumping) return;

    const distToTarget = dist(boss, target);
    let optimalDistance = 150;

    switch(boss.bossType) {
        case 'slime': optimalDistance = 120; break;
        case 'wolf': optimalDistance = 100; break;
        case 'golem': optimalDistance = 180; break;
        case 'witch': optimalDistance = 200; break;
        case 'treant': optimalDistance = 140; break;
    }

    if(distToTarget > optimalDistance + 50) {
        boss.speed += boss.moveSpeed * dt/16;
    } else if(distToTarget < optimalDistance - 30) {
        boss.speed -= boss.moveSpeed * dt/16;
    } else {
        boss.speed += (Math.random() - 0.5) * boss.moveSpeed * dt/32;
    }

    boss.speed *= boss.friction;
    const moveX = Math.cos(boss.angle) * boss.speed;
    const moveY = Math.sin(boss.angle) * boss.speed;
    const targetX = clamp(boss.x + moveX, boss.r + 4, W - boss.r - 4);
    const targetY = clamp(boss.y + moveY, boss.r + 4, H - boss.r - 4);

    const collidesAt = (px, py) => {
        for(const o of obstacles){
            if(circleRectColl({ x: px, y: py, r: boss.r }, o)){
                return true;
            }
        }
        return false;
    };

    if(!collidesAt(targetX, targetY)){
        boss.x = targetX;
        boss.y = targetY;
    } else {
        boss.speed *= -0.5;
    }

    boss.x = clamp(boss.x, boss.r + 4, W - boss.r - 4);
    boss.y = clamp(boss.y, boss.r + 4, H - boss.r - 4);
}

function updateBossSkills(boss, target, now, dt) {
    if (!target) return;
    
    switch(boss.bossType) {
        case 'slime':
            updateSlimeSkills(boss, target, now);
            break;
        case 'wolf':
            updateWolfSkills(boss, target, now);
            break;
        case 'golem':
            updateGolemSkills(boss, target, now);
            break;
        case 'witch':
            updateWitchSkills(boss, target, now);
            break;
        case 'treant':
            updateTreantSkills(boss, target, now);
            break;
        default:
            updateNormalBossSkills(boss, dt, now);
            break;
    }
}

function updateSlimeSkills(boss, target, now) {
    if (boss.isJumping) return;
    const timeSinceLastJump = now - (boss.skillCooldowns.jump || 0);
    if (timeSinceLastJump >= 3000) {
        if (dist(boss, target) < 400) {
            Skills.jumpAttack(boss, target);
            boss.skillCooldowns.jump = now;
        }
    }
    if (!boss.hasSplit && boss.hp <= boss.maxHp * 0.5) {
        Skills.splitSlime(boss);
        boss.hasSplit = true;
    }
}

function updateWolfSkills(boss, target, now) {
    if (now - (boss.skillCooldowns.dash || 0) >= 4000 && dist(boss, target) < 300 && dist(boss, target) > 50) {
        Skills.dashAttack(boss, target);
        boss.skillCooldowns.dash = now;
    }
    if (now - (boss.skillCooldowns.howl || 0) >= 6000) {
        Skills.howlAttack(boss);
        boss.skillCooldowns.howl = now;
    }
}

function updateGolemSkills(boss, target, now) {
    const timeSinceLastSlam = now - (boss.skillCooldowns.groundSlam || 0);
    if (timeSinceLastSlam >= 5000 && dist(boss, target) < 200) {
        Skills.groundSlamAttack(boss, target, now);
        boss.skillCooldowns.groundSlam = now;
    }
    
    const timeSinceLastDefense = now - (boss.skillCooldowns.defense || 0);
    if (timeSinceLastDefense >= 10000) {
        Skills.stoneDefenseAttack(boss, now);
        boss.skillCooldowns.defense = now;
    }
}

function updateWitchSkills(boss, target, now) {
    const timeSinceLastOrbs = now - (boss.skillCooldowns.darkOrbs || 0);
    if (timeSinceLastOrbs >= 4000) {
        Skills.darkOrbsAttack(boss, now);
        boss.skillCooldowns.darkOrbs = now;
    }
    
    const timeSinceLastTeleport = now - (boss.skillCooldowns.teleport || 0);
    if (timeSinceLastTeleport >= 6000) {
        Skills.teleportAttack(boss, now);
        boss.skillCooldowns.teleport = now;
    }
}

function updateTreantSkills(boss, target, now) {
    if (now - (boss.skillCooldowns.thorns || 0) >= 5000) {
        Skills.thornsAttack(boss, target, now);
        boss.skillCooldowns.thorns = now;
    }
    if (now - (boss.skillCooldowns.heal || 0) >= 8000 && boss.hp < boss.maxHp) {
        Skills.healAttack(boss, now);
        boss.skillCooldowns.heal = now;
    }
    if (now - (boss.skillCooldowns.roots || 0) >= 12000 && dist(boss, target) < 250) {
        Skills.rootsAttack(boss, target, now);
        boss.skillCooldowns.roots = now;
    }
}

function updateNormalBossSkills(boss, dt, now) {
    boss.skillTimer += dt;
    if(boss.skillTimer >= boss.bossSkillCooldown){
        boss.x = 60 + Math.random()*(W-120);
        boss.y = 60 + Math.random()*(H-120);
        boss.skillTimer = 0;
        flashMsg('Boss dịch chuyển!');
    }
}
