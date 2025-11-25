import { W, H } from '../canvas.js';
import { p1, p2, tanks, bullets, devGodMode, gameMode } from '../state.js';
import { dist, flashMsg } from '../main.js';
import { clamp } from '../utils.js';
import { addExplosion, addTelegraph } from '../rendering/animations.js';
import { reapplyPermanentBuffs } from './bossMode.js';
import { showStatus } from '../systems/effects.js';
import Bullet from '../classes/Bullet.js';
import Tank from '../classes/Tank.js';
import { addSlimePuddle, isPointInsidePuddle, getSlimePuddles } from './slimeHazards.js';
import { circleColl } from './collision.js';

const ADAPTIVE_SPLIT_DURATION = 60000;
const CORRUPTED_PHASE_HP = 30;
const SHARD_CHARGE_DURATION = 1500;
const SHARD_RELEASE_INTERVAL = 160;

const STICKY_PLAYER_SLOW = 0.25;
const STICKY_BULLET_SLOW = 0.45;
const JUMP_IMPACT_RADIUS = 80;
const JUMP_DAMAGE = 0.5;

const CORRUPTED_PUDDLE_CONFIG = {
    radius: 65,
    duration: 5000,
    damagePerSecond: 0.25,
    playerDamageDebuff: 0.3,
    bossSpeedBuff: 1.55,
    color: '#84cc16',
    type: 'corrosive',
    createdBy: 'slime_corrupted'
};

const CORRUPTED_SKILL_INFO = {
    absorb: { cooldown: 10000 },
    groundSurge: { cooldown: 8000 },
    homing: { cooldown: 15000 },
    spikeField: { cooldown: 12000 },
    brood: { cooldown: 20000 }
};

function getLivingPlayers() {
    return [p1, p2].filter(player => player && player.hp > 0 && !player.invisible);
}

function initializeCorruptedCooldowns(now) {
    return Object.fromEntries(
        Object.entries(CORRUPTED_SKILL_INFO).map(([skill, info]) => [skill, now - (info.cooldown || 0)])
    );
}

function ensureCorruptedState(boss, now) {
    boss.corruptedSkillState = boss.corruptedSkillState || {
        cooldowns: initializeCorruptedCooldowns(now),
        active: {}
    };
}

function canUseCorruptedSkill(boss, skill, now) {
    ensureCorruptedState(boss, now);
    const info = CORRUPTED_SKILL_INFO[skill];
    if (!info) return false;
    const lastUsed = boss.corruptedSkillState.cooldowns?.[skill] ?? 0;
    return now - lastUsed >= info.cooldown;
}

function markCorruptedSkillUsed(boss, skill, now) {
    ensureCorruptedState(boss, now);
    boss.corruptedSkillState.cooldowns[skill] = now;
}

function getCorruptedTargets() {
    return getLivingPlayers();
}

function pickCorruptedTarget(boss, preferClosest = false) {
    const targets = getCorruptedTargets();
    if (!targets.length) return null;
    if (!preferClosest) {
        return targets[Math.floor(Math.random() * targets.length)];
    }
    let best = targets[0];
    let bestDist = dist(boss, best);
    for (let i = 1; i < targets.length; i++) {
        const d = dist(boss, targets[i]);
        if (d < bestDist) {
            best = targets[i];
            bestDist = d;
        }
    }
    return best;
}

export function tryStartCorruptedPhase(boss, now = performance.now()) {
    if (!boss || boss.bossType !== 'slime') return false;
    if (boss.isCorruptedPhase || boss.hp > 0) return false;

    boss.isCorruptedPhase = true;
    boss.invulnerable = false;
    boss.hp = CORRUPTED_PHASE_HP;
    boss.maxHp = CORRUPTED_PHASE_HP;
    boss.color = '#84cc16';
    boss.renderAlpha = 1;
    boss.environmentSpeedMultiplier = 1;
    boss.corruptedSkillState = {
        cooldowns: initializeCorruptedCooldowns(now),
        active: {}
    };

    addExplosion({ x: boss.x, y: boss.y, radius: 150, duration: 650, color: '#84cc16', isWave: true });
    addExplosion({ x: boss.x, y: boss.y, radius: 90, duration: 450, color: '#4ade80' });
    showStatus(boss, 'Corrupted Slime!', '#84cc16', 1500);
    flashMsg('☣️ Slime biến dị! Giai đoạn 2 bắt đầu!');
    return true;
}

// ---------- Slime Phase 1 ----------
export function jumpAttack(boss, target) {
    if (!boss || !target) return;
    const landingPoint = { x: target.x, y: target.y };
    boss.isJumping = true;
    boss.jumpStartTime = performance.now();
    boss.jumpStartPos = { x: boss.x, y: boss.y };
    boss.jumpTargetPos = { ...landingPoint };
    boss.jumpDuration = 1200;
    boss.pendingJumpImpact = {
        targetSnapshot: { ...landingPoint },
        damage: 2,
        radius: 80
    };
    addTelegraph({ x: landingPoint.x, y: landingPoint.y, radius: 70, duration: boss.jumpDuration, color: '#4ade80' });
    showStatus(boss, 'Jump!', '#4ade80', 700);
}

export function resolveJumpLanding(boss) {
    if (!boss || !boss.pendingJumpImpact) return;
    const { radius, damage } = boss.pendingJumpImpact;
    addExplosion({ x: boss.x, y: boss.y, radius, duration: 400, color: '#4ade80', isWave: true });
    [p1, p2].forEach(player => {
        if (!player || player.hp <= 0) return;
        if (dist(player, boss) <= radius + player.r) {
            const skipDamage = devGodMode && (player === p1 || player === p2);
            if (!skipDamage) {
                player.hp = Math.max(0, player.hp - damage);
                showStatus(player, `-${damage} HP`, '#f97316', 900);
            }
        }
    });
    boss.pendingJumpImpact = null;
    addSlimePuddle({
        x: boss.x,
        y: boss.y,
        radius: 70,
        duration: 2600,
        slowPlayerFactor: 0.7,
        slowBulletFactor: 0.85,
        color: '#22c55e',
        type: 'sticky',
        createdBy: 'slime_jump'
    });
}

export function startShardBurst(boss, target) {
    if (!boss || !target) return;
    boss.shardBurstState = {
        phase: 'charging',
        targetSnapshot: { x: target.x, y: target.y },
        started: performance.now(),
        fired: 0,
        total: 8
    };
    addTelegraph({ x: boss.x, y: boss.y, radius: 90, duration: SHARD_CHARGE_DURATION, color: '#60a5fa' });
    showStatus(boss, 'Shard Burst!', '#38bdf8', 900);
}

export function updateShardBurst(boss, target, now = performance.now()) {
    if (!boss?.shardBurstState) return;
    const state = boss.shardBurstState;
    if (state.phase === 'charging') {
        if (now - state.started >= SHARD_CHARGE_DURATION) {
            state.phase = 'firing';
            state.started = now;
        }
        return;
    }
    if (state.phase === 'firing') {
        if (state.fired >= state.total) {
            boss.shardBurstState = null;
            return;
        }
        if (!state.lastFire || now - state.lastFire >= SHARD_RELEASE_INTERVAL) {
            fireShardBurst(boss, state, target);
            state.fired++;
            state.lastFire = now;
        }
    }
}

function fireShardBurst(boss, state, target) {
    const angle = Math.atan2(state.targetSnapshot.y - boss.y, state.targetSnapshot.x - boss.x) + (Math.random() - 0.5) * 0.4;
    const bullet = new Bullet(boss.x, boss.y, angle, boss);
    bullet.damage = 0.8;
    bullet.speed = 10;
    bullet.color = '#38bdf8';
    bullet.r = 6;
    bullet.glow = true;
    bullet.glowColor = '#bae6fd';
    bullets.push(bullet);
}

export function splitSlime(boss) {
    if (!boss || boss.isSplitForm) return;
    const now = performance.now();
    const miniCount = 3;
    const minis = [];
    for (let i = 0; i < miniCount; i++) {
        minis.push(createAdaptiveMini(boss, (Math.PI * 2 * i) / miniCount));
    }
    boss.miniSlimeLinks = {
        minis,
        spawnedAt: now,
        expiresAt: now + ADAPTIVE_SPLIT_DURATION
    };
    boss.isSplitForm = true;
    boss.invulnerable = true;
    boss.renderAlpha = 0.4;
    boss.splitMergeTimer = now + ADAPTIVE_SPLIT_DURATION;
    flashMsg('🧬 Slime phân tách!');
}

function createAdaptiveMini(boss, angle) {
    const distance = 90;
    const spawnX = clamp(boss.x + Math.cos(angle) * distance, 20, W - 20);
    const spawnY = clamp(boss.y + Math.sin(angle) * distance, 20, H - 20);
    const mini = new Tank(spawnX, spawnY, '#22c55e', {});
    mini.isMiniSlime = true;
    mini.adaptiveMini = true;
    mini.parentBoss = boss;
    mini.hp = 5;
    mini.maxHp = 5;
    mini.r = 18;
    mini.moveSpeed = boss.moveSpeed * 1.4;
    mini.friction = 0.9;
    mini.baseMoveSpeed = mini.moveSpeed;
    mini.dashCooldown = 1600;
    mini.dashDistance = 180;
    mini.dashDamage = 1;
    mini.projectileCooldown = 2600;
    mini.chaosMoveAngle = Math.random() * Math.PI * 2;
    mini.chaosMoveTimer = 0;
    mini.adaptiveLinkId = `${performance.now()}_${Math.random()}`;
    tanks.push(mini);
    return mini;
}

export function mergeAdaptiveSplit(boss, { heal = false, aliveMinis = [] } = {}) {
    if (!boss || !boss.isSplitForm) return;

    const minis = boss.miniSlimeLinks?.minis || [];
    minis.forEach(mini => {
        if (!mini) return;
        mini.parentBoss = null;
        const idx = tanks.indexOf(mini);
        if (idx !== -1) tanks.splice(idx, 1);
        mini.hp = 0;
    });

    if (aliveMinis.length) {
        const center = aliveMinis.reduce((acc, mini) => ({ x: acc.x + mini.x, y: acc.y + mini.y }), { x: 0, y: 0 });
        boss.x = clamp(center.x / aliveMinis.length, boss.r, W - boss.r);
        boss.y = clamp(center.y / aliveMinis.length, boss.r, H - boss.r);
    }

    if (heal) {
        boss.hp = Math.min(boss.maxHp, boss.hp + 3);
        showStatus(boss, '+3 HP', '#4ade80', 1000);
    }

    boss.isSplitForm = false;
    boss.invulnerable = false;
    boss.renderAlpha = 1;
    boss.miniSlimeLinks = null;
    boss.splitMergeTimer = 0;
    flashMsg(heal ? '🧬 Slime hợp thể hồi phục!' : '💥 Slime hợp thể!');
}

export function handleAdaptiveMiniDeath(mini) {
    if (!mini?.adaptiveMini || !mini.parentBoss) return;
    const boss = mini.parentBoss;
    const minis = boss.miniSlimeLinks?.minis || [];
    const aliveMinis = minis.filter(m => m && m.hp > 0);
    if (aliveMinis.length === 0) {
        mergeAdaptiveSplit(boss, { heal: false, aliveMinis: [] });
        boss.hp = Math.max(1, boss.hp - 2);
        showStatus(boss, '-2 HP', '#f87171', 1000);
    }
}

// ---------- Slime Phase 2 (Corrupted) ----------
export function castCorruptedAbsorbBurst(boss, now = performance.now()) {
    if (!boss || !boss.isCorruptedPhase) return false;
    if (!canUseCorruptedSkill(boss, 'absorb', now)) return false;
    const targets = getCorruptedTargets();
    if (!targets.length) return false;

    boss.absorbState = {
        start: now,
        duration: 2600,
        targetsSnapshot: targets.slice(),
        pulsed: false
    };
    boss.absorbAnchor = { x: boss.x, y: boss.y };
    boss.damageReduction = 0.4;
    addTelegraph({ x: boss.x, y: boss.y, radius: 340, duration: 2600, color: '#84cc16' });
    showStatus(boss, 'Mutated Absorb!', '#84cc16', 1200);
    markCorruptedSkillUsed(boss, 'absorb', now);
    return true;
}

export function updateCorruptedAbsorb(boss, now = performance.now()) {
    if (!boss?.absorbState) return false;
    if (!boss.isCorruptedPhase) {
        boss.absorbState = null;
        boss.damageReduction = 1;
        return false;
    }
    const state = boss.absorbState;
    const duration = state.duration || 2600;
    const elapsed = now - state.start;
    const progress = clamp(elapsed / duration, 0, 1);
    const anchor = boss.absorbAnchor || { x: boss.x, y: boss.y };
    const targets = state.targetsSnapshot?.length ? state.targetsSnapshot : getCorruptedTargets();

    targets.forEach(target => {
        if (!target || target.hp <= 0) return;
        const dx = anchor.x - target.x;
        const dy = anchor.y - target.y;
        const distance = Math.hypot(dx, dy);
        if (!distance || distance > 360) return;
        const pullStrength = (0.06 + progress * 0.09) * (1 - distance / 360);
        const moveX = (dx / distance) * pullStrength * 60;
        const moveY = (dy / distance) * pullStrength * 60;
        target.x = clamp(target.x + moveX, target.r, W - target.r);
        target.y = clamp(target.y + moveY, target.r, H - target.r);
        target.speed = Math.max(0, target.speed * 0.8);
    });

    if (!state.pulsed && progress > 0.55) {
        state.pulsed = true;
        flashMsg('☣️ Gel độc hút mọi thứ!');
    }

    if (elapsed >= duration) {
        boss.absorbState = null;
        boss.damageReduction = 1;
        showStatus(boss, 'Corrosive Burst', '#84cc16', 900);
        addSlimePuddle({
            ...CORRUPTED_PUDDLE_CONFIG,
            x: boss.x,
            y: boss.y,
            radius: 120,
            duration: 6500,
            damagePerSecond: 0.4
        });
        return false;
    }
    return true;
}

export function castCorruptGroundSurge(boss, now = performance.now()) {
    if (!boss?.isCorruptedPhase) return false;
    if (!canUseCorruptedSkill(boss, 'groundSurge', now)) return false;
    const target = pickCorruptedTarget(boss, true);
    if (!target) return false;

    const segments = 3;
    for (let i = 1; i <= segments; i++) {
        const t = i / (segments + 1);
        const x = boss.x + (target.x - boss.x) * t;
        const y = boss.y + (target.y - boss.y) * t;
        addSlimePuddle({
            ...CORRUPTED_PUDDLE_CONFIG,
            x,
            y,
            radius: 70,
            duration: 4200
        });
        addTelegraph({ x, y, radius: 80, duration: 500, color: '#84cc16' });
    }

    showStatus(boss, 'Corrupt Ground Surge', '#84cc16', 1000);
    markCorruptedSkillUsed(boss, 'groundSurge', now);
    return true;
}

export function castGelSpikeField(boss, now = performance.now()) {
    if (!boss?.isCorruptedPhase) return false;
    if (!canUseCorruptedSkill(boss, 'spikeField', now)) return false;
    const radius = 150;
    const duration = 4200;
    addTelegraph({ x: boss.x, y: boss.y, radius, duration: 600, color: '#84cc16' });
    boss.corruptedSkillState.active.spikeField = {
        start: now,
        duration,
        radius
    };
    markCorruptedSkillUsed(boss, 'spikeField', now);
    return true;
}

export function castSharpHomingShards(boss, now = performance.now()) {
    if (!boss?.isCorruptedPhase) return false;
    if (!canUseCorruptedSkill(boss, 'homing', now)) return false;
    const targets = getCorruptedTargets();
    if (!targets.length) return false;

    const shardCount = Math.min(6, targets.length * 2);
    for (let i = 0; i < shardCount; i++) {
        const target = targets[i % targets.length];
        const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
        const bullet = new Bullet(boss.x, boss.y, angle, boss);
        bullet.damage = 1;
        bullet.speed = 11;
        bullet.color = '#bef264';
        bullet.glow = true;
        bullet.glowColor = '#d9f99d';
        bullet.isHoming = true;
        bullet.homingTarget = target;
        bullet.homingTurnRate = 0.09;
        bullet.homingDuration = 2000;
        bullets.push(bullet);
    }
    addExplosion({ x: boss.x, y: boss.y, radius: 70, duration: 260, color: '#bef264' });
    showStatus(boss, 'Sharp Homing Shards!', '#bef264', 900);
    markCorruptedSkillUsed(boss, 'homing', now);
    return true;
}

export function castCorruptedMiniBrood(boss, now = performance.now()) {
    if (!boss?.isCorruptedPhase) return false;
    if (!canUseCorruptedSkill(boss, 'brood', now)) return false;
    ensureCorruptedState(boss, now);
    const brood = (boss.corruptedSkillState.active.brood || []).filter(mini => mini?.hp > 0);
    if (brood.length >= 3) return false;

    const needed = 3 - brood.length;
    for (let i = 0; i < needed; i++) {
        const mini = createCorruptedMini(boss, i);
        brood.push(mini);
        tanks.push(mini);
    }
    boss.corruptedSkillState.active.brood = brood;
    showStatus(boss, 'Corrupted Mini Brood!', '#84cc16', 1000);
    flashMsg('🧬 Corrupted mini-slime xuất hiện!');
    markCorruptedSkillUsed(boss, 'brood', now);
    return true;
}

function createCorruptedMini(boss, index) {
    const offsetAngle = (Math.PI * 2 * index) / 3;
    const distance = 80;
    const mini = new Tank(
        clamp(boss.x + Math.cos(offsetAngle) * distance, 20, W - 20),
        clamp(boss.y + Math.sin(offsetAngle) * distance, 20, H - 20),
        '#84cc16',
        {}
    );
    mini.hp = 6;
    mini.maxHp = 6;
    mini.r = 16;
    mini.parentBoss = boss;
    mini.isMiniSlime = true;
    mini.corruptedBrood = true;
    mini.moveSpeed = boss.moveSpeed * 1.8;
    mini.baseMoveSpeed = mini.moveSpeed;
    mini.friction = 0.92;
    mini.dashCooldown = 1800;
    mini.dashDamage = 0.8;
    mini.projectileCooldown = 2600;
    mini.trailSlowFactor = 0.6;
    return mini;
}

// ---------- Wolf ----------
export function dashAttack(boss, target) {
    if (!boss || !target) return;
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const dashDist = 220;
    boss.x = clamp(boss.x + Math.cos(angle) * dashDist, boss.r, W - boss.r);
    boss.y = clamp(boss.y + Math.sin(angle) * dashDist, boss.r, H - boss.r);
    addExplosion({ x: boss.x, y: boss.y, radius: 60, duration: 250, color: '#facc15' });
    const distance = dist(boss, target);
    if (distance <= boss.r + target.r + 10) {
        const skipDamage = devGodMode && (target === p1 || target === p2);
        if (!skipDamage) {
            target.hp = Math.max(0, target.hp - 2);
            showStatus(target, '-2 HP', '#f97316', 1000);
        }
    }
}

export function howlAttack(boss) {
    if (!boss) return;
    boss.moveSpeed *= 1.35;
    boss.reload = Math.max(1800, boss.reload * 0.75);
    boss.debuffTimer = performance.now() + 5000;
    showStatus(boss, 'Howl Frenzy!', '#fde047', 1200);
    flashMsg('🐺 Sói tru lên!');
}

// ---------- Golem ----------
export function groundSlamAttack(boss, target, now = performance.now()) {
    if (!boss || !target) return;
    const slamPoint = { x: target.x, y: target.y };
    addTelegraph({ x: slamPoint.x, y: slamPoint.y, radius: 110, duration: 600, color: '#f97316' });
    setTimeout(() => {
        addExplosion({ x: slamPoint.x, y: slamPoint.y, radius: 110, duration: 400, color: '#f97316', isWave: true });
        [p1, p2].forEach(player => {
            if (player && player.hp > 0 && dist(player, slamPoint) <= 110 + player.r) {
                const skipDamage = devGodMode && (player === p1 || player === p2);
                if (!skipDamage) {
                    player.hp = Math.max(0, player.hp - 3);
                    showStatus(player, '-3 HP', '#f87171', 1200);
                }
            }
        });
    }, 600);
}

export function stoneDefenseAttack(boss, now = performance.now()) {
    if (!boss) return;
    boss.isDefending = true;
    boss.damageReduction = 0.4;
    boss.defenseEnd = now + 4000;
    showStatus(boss, 'Stone Armor', '#d4d4d8', 1500);
}

// ---------- Witch ----------
export function darkOrbsAttack(boss, now = performance.now()) {
    if (!boss) return;
    const orbCount = 5;
    for (let i = 0; i < orbCount; i++) {
        const angle = (Math.PI * 2 * i) / orbCount;
        const bullet = new Bullet(boss.x, boss.y, angle, boss);
        bullet.speed = 6;
        bullet.damage = 1;
        bullet.color = '#c084fc';
        bullet.r = 8;
        bullet.isOrbital = true;
        bullet.orbitalRadius = 90;
        bullet.spawnTime = now;
        bullets.push(bullet);
    }
    showStatus(boss, 'Dark Orbs', '#c084fc', 900);
}

export function teleportAttack(boss, now = performance.now()) {
    if (!boss) return;
    const target = pickCorruptedTarget(boss, true) || p1 || p2;
    if (!target) return;
    addExplosion({ x: boss.x, y: boss.y, radius: 45, duration: 200, color: '#a855f7' });
    boss.x = clamp(target.x + (Math.random() - 0.5) * 160, boss.r, W - boss.r);
    boss.y = clamp(target.y + (Math.random() - 0.5) * 160, boss.r, H - boss.r);
    addExplosion({ x: boss.x, y: boss.y, radius: 55, duration: 220, color: '#a855f7' });
}

// ---------- Treant ----------
export function thornsAttack(boss, target, now = performance.now()) {
    if (!boss) return;
    const segments = 8;
    for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 * i) / segments;
        const bullet = new Bullet(boss.x, boss.y, angle, boss);
        bullet.speed = 8;
        bullet.damage = 0.8;
        bullet.color = '#22c55e';
        bullet.spike = true;
        bullets.push(bullet);
    }
    showStatus(boss, 'Thorn Barrage', '#22c55e', 900);
}

export function healAttack(boss, now = performance.now()) {
    if (!boss) return;
    boss.isHealing = true;
    boss.healEnd = now + 3500;
    setTimeout(() => {
        if (!boss.isHealing) return;
        boss.hp = Math.min(boss.maxHp, boss.hp + 4);
        showStatus(boss, '+4 HP', '#86efac', 1200);
        boss.isHealing = false;
    }, 3000);
}

export function rootsAttack(boss, target, now = performance.now()) {
    if (!boss) return;
    [p1, p2].forEach(player => {
        if (player && player.hp > 0 && dist(player, boss) <= 250) {
            player.rooted = true;
            showStatus(player, 'Bị trói!', '#16a34a', 2000);
            setTimeout(() => { player.rooted = false; }, 2000);
        }
    });
    flashMsg('🌱 Rễ cây trói buộc!');
}