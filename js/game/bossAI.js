import { W, H } from '../canvas.js';
import { p1, p2, bullets } from '../state.js';
import { dist, clamp } from '../utils.js';
import { circleRectColl, circleColl } from './collision.js';
import { obstacles } from './obstacles.js';
import { addExplosion } from '../rendering/animations.js';
import * as Skills from './bossSkills.js';

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

    const now = performance.now();

    if(target){
        boss.angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        if(now - boss.lastShot >= boss.reload){
            const b = boss.shoot(now);
            if(b) bullets.push(b);
        }
    updateBossSkills(boss, target, now, dt); // Pass dt here
    }

    updateBossAnimations(boss, dt);
    updateBossMovement(boss, target, dt);
}

function updateBossAnimations(boss, dt) {
    const now = performance.now();

    // --- Jump Animation ---
    if (boss.isJumping) {
        const elapsed = now - boss.jumpStartTime;
        const progress = Math.min(1, elapsed / boss.jumpDuration);

        // Custom easing: charge up, then leap
        const chargeTime = 0.3; // 30% of time is for charging
        let easedProgress;
        if (progress < chargeTime) {
            // Squish down
            easedProgress = 0;
            boss.r = boss.baseRadius * (1 - (progress / chargeTime) * 0.4); // Squish to 60%
        } else {
            // Leap
            const leapProgress = (progress - chargeTime) / (1 - chargeTime);
            easedProgress = leapProgress < 0.5 ? 2 * leapProgress * leapProgress : 1 - Math.pow(-2 * leapProgress + 2, 2) / 2;
            const hopProgress = Math.sin(leapProgress * Math.PI);
            boss.r = boss.baseRadius + hopProgress * 15; // "hop" effect
        }

        boss.x = boss.jumpStartPos.x + (boss.jumpTargetPos.x - boss.jumpStartPos.x) * easedProgress;
        boss.y = boss.jumpStartPos.y + (boss.jumpTargetPos.y - boss.jumpTargetPos.y) * easedProgress;


        if (progress >= 1) {
            boss.isJumping = false;
            boss.r = boss.baseRadius;
            // Create a small shockwave on landing
            addExplosion({ x: boss.x, y: boss.y, radius: 40, duration: 300, color: boss.color, isWave: true });
        }
    }
}

function updateBossMovement(boss, target, dt) {
    if (!target || boss.moveSpeed <= 0 || boss.isJumping) return;

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
        // If collision, bounce back slightly
        boss.speed *= -0.5;
    }
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
    const timeSinceLastJump = now - (boss.skillCooldowns.jump || 0); // Cooldown is already 3s, which is fine
    if (timeSinceLastJump >= 3000) {
        if (dist(boss, target) < 400) {
            Skills.jumpAttack(boss, target);
            console.log(`[BOSS AI] Slime used jumpAttack.`);
            boss.skillCooldowns.jump = now;
        }
    }
    if (!boss.hasSplit && boss.hp <= boss.maxHp * 0.5) {
        Skills.splitSlime(boss);
        boss.hasSplit = true;
    }
}

function updateWolfSkills(boss, target, now) {
    if (now - (boss.skillCooldowns.dash || 0) >= 4500 && dist(boss, target) < 300 && dist(boss, target) > 50) { // 5s -> 4.5s
        console.log(`[BOSS AI] Wolf used dashAttack.`);
        Skills.dashAttack(boss, target);
        boss.skillCooldowns.dash = now;
    }
    if (now - (boss.skillCooldowns.howl || 0) >= 7000) { // 8s -> 7s
        console.log(`[BOSS AI] Wolf used howlAttack.`);
        Skills.howlAttack(boss);
        boss.skillCooldowns.howl = now;
    }
}

function updateGolemSkills(boss, target, now) {
    const timeSinceLastSlam = now - (boss.skillCooldowns.groundSlam || 0);
    if (timeSinceLastSlam >= 6000 && dist(boss, target) < 200) { // 6.5s -> 6s
        console.log(`[BOSS AI] Golem used groundSlamAttack.`);
        Skills.groundSlamAttack(boss, target, now);
        boss.skillCooldowns.groundSlam = now;
    }
    
    const timeSinceLastDefense = now - (boss.skillCooldowns.defense || 0);
    if (timeSinceLastDefense >= 11000) { // 12s -> 11s
        console.log(`[BOSS AI] Golem used stoneDefenseAttack.`);
        Skills.stoneDefenseAttack(boss, now);
        boss.skillCooldowns.defense = now;
    }
}

function updateWitchSkills(boss, target, now) {
    const timeSinceLastOrbs = now - (boss.skillCooldowns.darkOrbs || 0);
    if (timeSinceLastOrbs >= 4500) { // 5s -> 4.5s
        console.log(`[BOSS AI] Witch used darkOrbsAttack.`);
        Skills.darkOrbsAttack(boss, now);
        boss.skillCooldowns.darkOrbs = now;
    }
    
    const timeSinceLastTeleport = now - (boss.skillCooldowns.teleport || 0);
    if (timeSinceLastTeleport >= 6500) { // 7s -> 6.5s
        console.log(`[BOSS AI] Witch used teleportAttack.`);
        Skills.teleportAttack(boss, now);
        boss.skillCooldowns.teleport = now;
    }
}

function updateTreantSkills(boss, target, now) {
    if (now - (boss.skillCooldowns.thorns || 0) >= 5500) { // 6s -> 5.5s
        console.log(`[BOSS AI] Treant used thornsAttack.`);
        Skills.thornsAttack(boss, target, now);
        boss.skillCooldowns.thorns = now;
    }
    if (now - (boss.skillCooldowns.heal || 0) >= 9000 && boss.hp < boss.maxHp) { // 10s -> 9s
        console.log(`[BOSS AI] Treant used healAttack.`);
        Skills.healAttack(boss, now);
        boss.skillCooldowns.heal = now;
    }
    if (now - (boss.skillCooldowns.roots || 0) >= 13000 && dist(boss, target) < 250) { // 15s -> 13s
        console.log(`[BOSS AI] Treant used rootsAttack.`);
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
        console.log(`[BOSS AI] Normal boss teleported.`);
        flashMsg('Boss dịch chuyển!');
    }
}