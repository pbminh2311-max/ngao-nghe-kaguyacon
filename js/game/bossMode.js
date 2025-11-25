import {
    flashMsg, returnToMainMenu
} from '../main.js';
import {
    p1, p2, tanks, setTanks, boss, setBoss, gameMode, setGameMode, setP1FocusMode, setP2FocusMode,
    setBullets, setBuffs, setRoundEnding, setEnemySlowFactor, enemySlowFactor
} from '../state.js';

import { W, H } from '../canvas.js';
import { showStatus } from '../systems/effects.js';
import { getBossBuffName } from '../utils.js';import { resetAfterKill, spawnMiniTankCompanion } from './gameState.js';
import { bossModeBuffs, BUFF_COLORS, bossModeBuffWeights, bossBuffRarities } from '../constants.js';

import Boss from '../classes/Boss.js';
import { syncSettingsUI } from '../ui/settings.js';

// --- State ---
export let bossMode = {
    active: false,
    playerCount: 2,
    currentFloor: 1,
    maxFloor: 1,
    showingBuffSelection: false,
    showingGameOver: false,
    availableBuffs: [],
    permanentBuffs: [],
    bossDefeated: false,
    enemySlowFactor: 1
};

// --- UI Elements ---
const bossModeBtn2P = document.getElementById('bossModeBtn2P');
const exitBossModeBtn = document.getElementById('exitBossModeBtn');
const buffSelectionOverlay = document.getElementById('buffSelectionOverlay');
const bossGameOverOverlay = document.getElementById('bossGameOverOverlay');
const gameModeInfo = document.getElementById('gameModeInfo');
const floorInfo = document.getElementById('floorInfo');
const permanentBuffsInfo = document.getElementById('permanentBuffsInfo');

const STACKABLE_BOSS_BUFFS = new Set(['bounceShot', 'bossPierce', 'damageBoost', 'maxHpUp', 'debuffResistance', 'luckUp']);

export function isStackableBossBuff(buffType) {
    return STACKABLE_BOSS_BUFFS.has(buffType);
}

const rarityLabels = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythical: 'Mythical'
};

// --- Functions ---

function ensureBossBuffStats(target) {
    if (!target) return null;
    if (!target.bossBuffStats) {
        target.bossBuffStats = {
            baseDamage: target.damage ?? 1,
            baseMaxHp: target.maxHp ?? 3,
            baseMoveSpeed: target.baseMoveSpeed || target.moveSpeed || 0.5,
            baseBulletSpeed: target.bulletSpeedMultiplier ?? 1,
            baseReload: target.baseReload || target.reload || 320,
            baseReloadRate: target.baseReloadRate || target.reloadRate || (1 / 60),
            lifeSteal: 0,
            bounceExtra: 0,
            pierceExtra: 0,
            fireRateStacks: 0,
            moveSpeedStacks: 0,
            twinShot: false,
            magnetRadius: 0,
            bounceDamageFactor: null,
            pierceDamagePenalty: null,
            shotSplit: false,
            shotSplit4: false,
            ricochetTracking: false,
            poisonShot: false,
            microShieldEnabled: false,
            microShieldStrength: 0,
            criticalHit: false,
            shieldActive: false,
            shieldReady: false,
            slowMotionActive: false,
            fireIceShot: false,
            damageBoostStacks: 0,
            maxHpUpStacks: 0,
            hasBulletDeflect: false,
            debuffResistance: 0,
            luckUpStacks: 0,
            hasMiniTank: false,
            hasDoubleShot: false
        };
    } else {
        const stats = target.bossBuffStats;

        if (typeof stats.baseDamage === 'undefined') stats.baseDamage = target.damage ?? 1;
        if (typeof stats.baseMaxHp === 'undefined') stats.baseMaxHp = target.maxHp ?? 3;
        if (typeof stats.baseMoveSpeed === 'undefined') stats.baseMoveSpeed = target.baseMoveSpeed || target.moveSpeed || 0.5;
        if (typeof stats.baseBulletSpeed === 'undefined') stats.baseBulletSpeed = target.bulletSpeedMultiplier ?? 1;
        if (typeof stats.baseReload === 'undefined') stats.baseReload = target.baseReload || target.reload || 320;
        if (typeof stats.baseReloadRate === 'undefined') stats.baseReloadRate = target.baseReloadRate || target.reloadRate || (1 / 60);
        if (typeof stats.lifeSteal === 'undefined') stats.lifeSteal = 0;
        if (typeof stats.bounceExtra === 'undefined') stats.bounceExtra = 0;
        if (typeof stats.pierceExtra === 'undefined') stats.pierceExtra = 0;
        if (typeof stats.fireRateStacks === 'undefined') stats.fireRateStacks = 0;
        if (typeof stats.moveSpeedStacks === 'undefined') stats.moveSpeedStacks = 0;
        if (typeof stats.twinShot === 'undefined') stats.twinShot = false;
        if (typeof stats.magnetRadius === 'undefined') stats.magnetRadius = 0;
        if (typeof stats.bounceDamageFactor === 'undefined') stats.bounceDamageFactor = null;
        if (typeof stats.pierceDamagePenalty === 'undefined') stats.pierceDamagePenalty = null;
        if (typeof stats.shotSplit === 'undefined') stats.shotSplit = false;
        if (typeof stats.shotSplit4 === 'undefined') stats.shotSplit4 = false;
        if (typeof stats.ricochetTracking === 'undefined') stats.ricochetTracking = false;
        if (typeof stats.poisonShot === 'undefined') stats.poisonShot = false;
        if (typeof stats.microShieldEnabled === 'undefined') stats.microShieldEnabled = false;
        if (typeof stats.microShieldStrength === 'undefined') stats.microShieldStrength = 0;
        if (typeof stats.criticalHit === 'undefined') stats.criticalHit = false;
        if (typeof stats.shieldActive === 'undefined') stats.shieldActive = false;
        if (typeof stats.shieldReady === 'undefined') stats.shieldReady = false;
        if (typeof stats.slowMotionActive === 'undefined') stats.slowMotionActive = false;
        if (typeof stats.fireIceShot === 'undefined') stats.fireIceShot = false;
        if (typeof stats.damageBoostStacks === 'undefined') stats.damageBoostStacks = 0;
        if (typeof stats.maxHpUpStacks === 'undefined') stats.maxHpUpStacks = 0;
        if (typeof stats.hasBulletDeflect === 'undefined') stats.hasBulletDeflect = false;
        if (typeof stats.debuffResistance === 'undefined') stats.debuffResistance = 0;
        if (typeof stats.luckUpStacks === 'undefined') stats.luckUpStacks = 0;
        if (typeof stats.hasMiniTank === 'undefined') stats.hasMiniTank = false;
        if (typeof stats.hasDoubleShot === 'undefined') stats.hasDoubleShot = false;
    }

    return target.bossBuffStats;
}

function recalcEnemySlowFactor() {
    let factor = 1;
    if (gameMode === 'vsboss') {
        const hasSlowMotion = [p1, p2].some(player => {
            if (!player) return false;
            const stats = player.bossBuffStats;
            return stats && stats.slowMotionActive;
        });
        if (hasSlowMotion) {
            factor *= 0.8; // 20% slow
        }
    }

    bossMode.enemySlowFactor = factor;
    setEnemySlowFactor(factor);
}

function updateBossBuffDerivedStats(target) {
    const stats = ensureBossBuffStats(target);
    if (!stats) return;

    const damageBoostStacks = stats.damageBoostStacks || 0;
    const damageMultiplier = 1 + damageBoostStacks * 0.2;
    target.damage = stats.baseDamage * damageMultiplier;
    target.damageBoostMultiplier = damageMultiplier;

    const maxHpStacks = stats.maxHpUpStacks || 0;
    const maxHpMultiplier = Math.pow(1.2, maxHpStacks);

    const prevMaxHp = target.maxHp || stats.baseMaxHp;
    const hpRatio = prevMaxHp > 0 ? Math.min(1, target.hp / prevMaxHp) : 1;
    target.maxHp = stats.baseMaxHp * maxHpMultiplier;
    target.hp = Math.min(target.maxHp, target.maxHp * hpRatio);

    const moveStacks = stats.moveSpeedStacks || 0;
    const moveMultiplier = Math.pow(1.3, moveStacks); // Tăng 30% tốc độ di chuyển
    target.moveSpeed = stats.baseMoveSpeed * moveMultiplier;
    target.baseMoveSpeed = target.moveSpeed;

    target.bulletSpeedMultiplier = stats.baseBulletSpeed;

    const fireStacks = stats.fireRateStacks || 0;
    const reloadMultiplier = Math.pow(0.7, fireStacks); // Giảm 30% thời gian chờ
    const reloadRateMultiplier = Math.pow(1.3, fireStacks); // Tăng 30% tốc độ hồi
    target.reload = stats.baseReload * reloadMultiplier;
    target.baseReload = target.reload;
    target.reloadRate = stats.baseReloadRate * reloadRateMultiplier;
    target.baseReloadRate = target.reloadRate;

    target.lifeStealAmount = stats.lifeSteal || 0;
    target.bossBounceCount = stats.bounceExtra || 0;
    target.bossBounceDamageFactor = target.bossBounceCount > 0
        ? (stats.bounceDamageFactor ?? BOUNCE_SHOT_FACTOR)
        : null;

    const pierceStacks = stats.pierceExtra || 0;
    target.bossPierceStacks = pierceStacks;
    target.bossPierceDamageFactor = pierceStacks > 0
        ? (stats.pierceDamagePenalty != null ? (1 - stats.pierceDamagePenalty) : 1)
        : null;
    target.hasBossPierce = pierceStacks > 0;

    const hasTwinShot = !!stats.twinShot;
    target.hasTwinShot = hasTwinShot;

    if (hasTwinShot) {
        if (typeof target.twinShotShotCount !== 'number') target.twinShotShotCount = 0;
        if (typeof target.twinShotBonusCharges !== 'number') target.twinShotBonusCharges = 0;
    } else {
        target.twinShotShotCount = 0;
        target.twinShotBonusCharges = 0;
    }

    target.bossMagnetRadius = stats.magnetRadius || 0;
    target.hasShotSplit = !!stats.shotSplit;
    target.hasShotSplit4 = !!stats.shotSplit4;
    target.hasRicochetTracking = !!stats.ricochetTracking;
    target.hasPoisonShot = !!stats.poisonShot;
    target.hasCriticalHit = !!stats.criticalHit;
    target.hasBossShield = !!stats.shieldActive;
    target.bossShieldReady = !!stats.shieldReady;
    target.hasFireIceShot = !!stats.fireIceShot;
    target.hasBulletDeflect = !!stats.hasBulletDeflect;
    target.hasDoubleShot = !!stats.hasDoubleShot;
    target.debuffResistance = Math.min(0.7, stats.debuffResistance || 0);
    target.debuffDurationMultiplier = Math.max(0.3, 1 - target.debuffResistance);
    target.luckUpStacks = stats.luckUpStacks || 0;
    target.hasMiniTankBuff = !!stats.hasMiniTank;
    if (!target.hasMiniTankBuff && target.miniTankCompanion) {
        target.miniTankCompanion.pendingRemoval = true;
    }

    if (stats.microShieldEnabled && stats.microShieldStrength > 0) {
        target.microShieldEnabled = true;
        target.microShieldMax = stats.microShieldStrength;
        target.microShieldValue = target.microShieldMax;
        target.microShieldNextRegen = Number.POSITIVE_INFINITY;
    } else {
        target.microShieldEnabled = false;
        target.microShieldMax = 0;
        target.microShieldValue = 0;
        target.microShieldNextRegen = 0;
    }

    if (stats.slowMotionActive) {
        // slow effect handled globally
    }

    if (target.hasMiniTankBuff) {
        spawnMiniTankCompanion(target);
    }

    recalcEnemySlowFactor();
}

const BOUNCE_SHOT_FACTOR = 0.9;
const PIERCE_BASE_PENALTY = 0.1;

function applyBounceBuff(stats) {
    stats.bounceExtra = (stats.bounceExtra || 0) + 1;
    stats.bounceDamageFactor = BOUNCE_SHOT_FACTOR; // luôn giảm tối đa 10%
    return stats.bounceExtra;
}

function applyPierceBuff(stats) {
    stats.pierceExtra = (stats.pierceExtra || 0) + 1;
    stats.pierceDamagePenalty = PIERCE_BASE_PENALTY; // luôn giảm tối đa 10%
    return stats.pierceExtra;
}

function applyBossBuffToTarget(target, buffType, { silent = false } = {}) {
    const stats = ensureBossBuffStats(target);
    if (!stats) return;

    // Ghi lại thông số TRƯỚC khi áp dụng buff

    const beforeReload = target.reload.toFixed(0);
    const beforeReloadRate = target.reloadRate.toFixed(4);
    const beforeMoveSpeed = target.moveSpeed.toFixed(3);
    console.log(`[Buff Check] TRƯỚC khi nhận buff: Tốc độ di chuyển=${beforeMoveSpeed}`);
    console.log(`[Buff Check] TRƯỚC khi nhận buff: Thời gian chờ bắn=${beforeReload}ms, Tốc độ hồi đạn=${beforeReloadRate}`);

    let message = '';
    let color = '#ffffff';

    switch (buffType) {
        case 'lifeSteal': {
            stats.lifeSteal = (stats.lifeSteal || 0) + 0.1;
            const totalHp = stats.lifeSteal.toFixed(1);
            message = `🧛 Hút máu +0.1 HP (tổng ${totalHp} HP)`;
            color = BUFF_COLORS.lifeSteal;
            break;
        }
        case 'bounceShot': {
            const totalBounces = applyBounceBuff(stats);
            message = `↺ Nảy thêm +1 (tổng +${totalBounces}, –10% sát thương tối đa)`;
            color = BUFF_COLORS.bounceShot;
            break;
        }
        case 'bossPierce': {
            const totalPierce = applyPierceBuff(stats);
            message = `⤫ Xuyên thêm +1 (tổng +${totalPierce}, –10% sát thương tối đa)`;
            color = BUFF_COLORS.bossPierce;
            break;
        }
        case 'bossFireRate': {
            stats.fireRateStacks = (stats.fireRateStacks || 0) + 1;
            message = '⚡ Tốc độ bắn +30%';
            color = BUFF_COLORS.bossFireRate;
            break;
        }
        case 'bossMoveSpeed': {
            stats.moveSpeedStacks = (stats.moveSpeedStacks || 0) + 1;
            message = '🏃 Tốc độ di chuyển +30%';
            color = BUFF_COLORS.bossMoveSpeed;
            break;
        }
        case 'twinShot': {
            stats.twinShot = true;
            message = '✦ Twin Shot sẵn sàng';
            color = BUFF_COLORS.twinShot;
            break;
        }
        case 'magnetSmall': {
            const current = stats.magnetRadius || 0;
            stats.magnetRadius = current > 0 ? current + 20 : 120;
            message = '🧲 Hút buff phạm vi nhỏ';
            color = BUFF_COLORS.magnetSmall;
            break;
        }
        case 'shotSplit': {
            stats.shotSplit = true;
            message = '⚛️ Đạn tách đôi khi chạm tường/Boss';
            color = BUFF_COLORS.shotSplit;
            break;
        }
        case 'shotSplit4': {
            stats.shotSplit4 = true;
            message = '⚛️×4 Đạn trúng địch nổ thành 4 viên (40% dmg)';
            color = BUFF_COLORS.shotSplit4;
            break;
        }
        case 'ricochetTracking': {
            stats.ricochetTracking = true;
            message = '🎯 Đạn nảy lần đầu sẽ khóa mục tiêu';
            color = BUFF_COLORS.ricochetTracking;
            break;
        }
        case 'poisonShot': {
            stats.poisonShot = true;
            message = '☠️ Đạn gây độc 3s, stack tối đa 3 lần';
            color = BUFF_COLORS.poisonShot;
            break;
        }
        case 'microShield': {
            stats.microShieldEnabled = true;
            const shieldValue = (target.maxHp || stats.baseMaxHp || 3) * 0.2;
            stats.microShieldStrength = Math.max(stats.microShieldStrength || 0, shieldValue);
            message = `🧿 MicroShield +${shieldValue.toFixed(1)} HP (hồi sau 5s)`;
            color = BUFF_COLORS.microShield;
            break;
        }
        case 'criticalHit': {
            stats.criticalHit = true;
            message = '💥 10% chí mạng x2 damage';
            color = BUFF_COLORS.criticalHit;
            break;
        }
        case 'bossShield': {
            stats.shieldActive = true;
            stats.shieldReady = true;
            message = '🛡️ Khiên chắn 1 đòn mỗi round';
            color = BUFF_COLORS.bossShield;
            break;
        }
        case 'slowMotion10': {
            stats.slowMotionActive = true;
            message = '🐢 Làm chậm Boss + đạn địch 20%';
            color = BUFF_COLORS.slowMotion10;
            break;
        }
        case 'fireIceShot': {
            stats.fireIceShot = true;
            message = '🔥❄️ Đạn nhận hiệu ứng Hỏa/Băng';
            color = BUFF_COLORS.fireIceShot;
            break;
        }
        case 'damageBoost': {
            stats.damageBoostStacks = (stats.damageBoostStacks || 0) + 1;
            const pct = Math.round(stats.damageBoostStacks * 20);
            message = `💪 Sát thương +20% (tổng +${pct}%)`;
            color = BUFF_COLORS.damageBoost;
            break;
        }
        case 'maxHpUp': {
            stats.maxHpUpStacks = (stats.maxHpUpStacks || 0) + 1;
            const totalPct = Math.round((Math.pow(1.2, stats.maxHpUpStacks) - 1) * 100);
            message = `❤️ Max HP +20% (tổng +${totalPct}%)`;
            color = BUFF_COLORS.maxHpUp;
            break;
        }
        case 'bulletDeflect': {
            stats.hasBulletDeflect = true;
            message = '🛡️ Phản xạ đạn Boss';
            color = BUFF_COLORS.bulletDeflect;
            break;
        }
        case 'debuffResistance': {
            const current = stats.debuffResistance || 0;
            const next = Math.min(0.7, current + 0.1);
            stats.debuffResistance = next;
            message = `🧬 Giảm ${Math.round(next * 100)}% thời gian debuff`;
            color = BUFF_COLORS.debuffResistance;
            break;
        }
        case 'luckUp': {
            stats.luckUpStacks = (stats.luckUpStacks || 0) + 1;
            const bonus = stats.luckUpStacks * 3;
            message = `🍀 Tăng ${bonus}% tỉ lệ buff hiếm`;
            color = BUFF_COLORS.luckUp;
            break;
        }
        case 'miniTank': {
            stats.hasMiniTank = true;
            message = '🤖 Triệu hồi xe tăng mini trợ chiến';
            color = BUFF_COLORS.miniTank;
            break;
        }
        case 'doubleShot': {
            stats.hasDoubleShot = true;
            message = '➿ Mỗi phát bắn ra 2 viên song song';
            color = BUFF_COLORS.doubleShot;
            break;
        }
        default:
            break;
    }

    updateBossBuffDerivedStats(target);
    if (!silent && message) {
        showStatus(target, message, color, 2000);
    }

    // Ghi lại thông số SAU khi áp dụng buff
    const afterReload = target.reload.toFixed(0);
    const afterReloadRate = target.reloadRate.toFixed(4);
    const afterMoveSpeed = target.moveSpeed.toFixed(3);
    console.log(`[Buff Check] SAU khi nhận buff: Tốc độ di chuyển=${afterMoveSpeed}`);
    console.log(`[Buff Check] SAU khi nhận buff: Thời gian chờ bắn=${afterReload}ms, Tốc độ hồi đạn=${afterReloadRate}`);
}

export function startBossMode() {
    console.log('Starting Boss Mode...');
    setGameMode('vsboss');
    setEnemySlowFactor(1);
    bossMode.active = true;

    bossMode.playerCount = 2;
    bossMode.currentFloor = 1;
    bossMode.permanentBuffs = [];
    setEnemySlowFactor(1);

    bossMode.showingBuffSelection = false;
    bossMode.showingGameOver = false;

    // Mặc định bật Focus Mode cho cả 2 người chơi
    setP1FocusMode(true);
    setP2FocusMode(true);
    syncSettingsUI();

    setTanks([p1, p2]);
    p1.hp = p1.maxHp;
    p2.hp = p2.maxHp;

    [p1, p2].forEach(player => {
        player.damage = 1;
        player.bulletSpeedMultiplier = 1;
        player.bossBuffStats = {
            baseDamage: 1,
            baseMaxHp: player.maxHp,
            baseMoveSpeed: player.baseMoveSpeed || 0.5,
            baseBulletSpeed: 1,
            baseReload: player.baseReload || player.reload || 320,
            baseReloadRate: player.baseReloadRate || player.reloadRate || (1 / 60),
            lifeSteal: 0,
            bounceExtra: 0,
            pierceExtra: 0,
            fireRateStacks: 0,
            moveSpeedStacks: 0,
            twinShot: false,
            magnetRadius: 0,
            bounceDamageFactor: null,
            pierceDamagePenalty: null,
            shotSplit: false,
            shotSplit4: false,
            ricochetTracking: false,
            poisonShot: false,
            microShieldEnabled: false,
            microShieldStrength: 0,
            criticalHit: false,
            shieldActive: false,
            shieldReady: false,
            slowMotionActive: false,
            fireIceShot: false,
            damageBoostStacks: 0,
            maxHpUpStacks: 0,
            hasBulletDeflect: false,
            debuffResistance: 0,
            luckUpStacks: 0,
            hasMiniTank: false,
            hasDoubleShot: false
        };
        player.lifeStealAmount = 0;
        player.bossBounceCount = 0;
        player.bossBounceDamageFactor = null;
        player.bossPierceStacks = 0;
        player.bossPierceDamageFactor = null;
        player.hasTwinShot = false;
        player.twinShotShotCount = 0;
        player.twinShotBonusCharges = 0;
        player.bossMagnetRadius = 0;
    });

    resetAfterKill();

    spawnBossForFloor(bossMode.currentFloor);
    flashMsg(`VS Boss Mode - Tầng ${bossMode.currentFloor}`);
}

export function exitBossMode() {
    setGameMode('pvp');
    bossMode.active = false;

    bossMode.showingBuffSelection = false;
    bossMode.showingGameOver = false;
    bossMode.permanentBuffs = [];

    // Tắt Focus Mode khi thoát
    setP1FocusMode(false);
    setP2FocusMode(false);
    syncSettingsUI();

    // Dọn dẹp boss trước khi reset mọi thứ khác
    if (boss) {
        const index = tanks.indexOf(boss);
        if (index !== -1) tanks.splice(index, 1);
        setBoss(null);
    }

    // Bây giờ mới reset tanks và người chơi
    setTanks([p1, p2]);
    p1.reset();
    p2.reset();
    p1.hp = p1.maxHp;
    p2.hp = p2.maxHp;
    p1.bossBuffStats = null;
    p2.bossBuffStats = null;

    flashMsg('Returned to PvP Mode');
    returnToMainMenu(); // Quay về menu chính SAU KHI đã dọn dẹp xong
    // Sử dụng setTimeout để đảm bảo tất cả các thay đổi trạng thái được áp dụng
    // trước khi tạm dừng vòng lặp game để hiển thị menu.
    // Điều này sẽ khắc phục lỗi phải nhấn 2 lần.
    setTimeout(returnToMainMenu, 0);
}

export function spawnBossForFloor(floor) {
    console.log('Spawning boss for floor:', floor);
    if (boss) {
        const index = tanks.indexOf(boss);
        if (index !== -1) tanks.splice(index, 1);
    }

    let bossType = 'normal';
    let bossName = 'Boss';

    switch(floor) {
        case 1: bossType = 'slime'; bossName = 'Slime Chúa'; break;
        case 2: bossType = 'wolf'; bossName = 'Sói Đêm'; break;
        case 3: bossType = 'golem'; bossName = 'Golem Đá'; break;
        case 4: bossType = 'witch'; bossName = 'Phù Thủy Bóng Đêm'; break;
        case 5: bossType = 'treant'; bossName = 'Người Cây Cổ Đại'; break;
        default: {
            const specialBosses = ['slime', 'wolf', 'golem', 'witch', 'treant'];
            const bossNames = {'slime': 'Slime Chúa', 'wolf': 'Sói Đêm', 'golem': 'Golem Đá', 'witch': 'Phù Thủy Bóng Đêm', 'treant': 'Người Cây Cổ Đại'};
            bossType = specialBosses[Math.floor(Math.random() * specialBosses.length)];
            bossName = `${bossNames[bossType]} Biến Dị`;
            break;
        }
    }

    const newBoss = new Boss(W/2, H/2, bossType);
    console.log('Boss created:', newBoss, 'Type:', bossType, 'HP:', newBoss.hp);

    if (floor > 2) {
        const multiplier = 1 + (floor - 2) * 0.5;
        newBoss.maxHp *= multiplier;
        newBoss.hp = newBoss.maxHp;
        newBoss.damage *= multiplier;
    }

    setBoss(newBoss);
    tanks.push(newBoss);
    console.log('Boss added to tanks. Tanks length:', tanks.length);
    flashMsg(`${bossName} xuất hiện! HP: ${newBoss.hp.toFixed(1)}`);
}

export function showBuffSelection() {
    setRoundEnding(false); // Đảm bảo game không bị kẹt ở trạng thái "kết thúc vòng"
    bossMode.availableBuffs = getRandomBossBuffs(3);

    if (bossMode.availableBuffs.length === 0) {
        // Nếu đã nhận hết buff, tự động chuyển tầng
        console.log('[Buffs] Đã nhận tất cả buff. Tự động chuyển tầng.');
        flashMsg('✨ Đã nhận tất cả buff! Chuẩn bị cho tầng tiếp theo...');
        
        bossMode.currentFloor++;
        updateGameModeUI();
        setTimeout(() => {
            resetAfterKill();
            spawnBossForFloor(bossMode.currentFloor);
        }, 1500); // Chờ 1.5s rồi chuyển
    } else {
        bossMode.showingBuffSelection = true;
        showBuffSelectionUI();
    }
}

function getRandomBossBuffs(count) {
    const selected = [];
    // Lọc ra những buff người chơi đã có để không xuất hiện lại
    const availablePool = bossModeBuffs.filter(buff => {
        if (STACKABLE_BOSS_BUFFS.has(buff)) return true;
        return !bossMode.permanentBuffs.includes(buff);
    });

    const pool = [...availablePool];
    const weights = { ...bossModeBuffWeights };
    const luckBonusMultiplier = 1 + getLuckUpBonus();
    const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythical: 5 };

    const getWeightedChance = buff => {
        const base = weights[buff] || 1;
        const rarity = bossBuffRarities[buff] || 'common';
        if (rarityRank[rarity] >= rarityRank['rare']) {
            return base * luckBonusMultiplier;
        }
        return base;
    };

    for (let i = 0; i < count && pool.length > 0; i++) {
        const totalWeight = pool.reduce((sum, buff) => sum + getWeightedChance(buff), 0);
        let roll = Math.random() * totalWeight;
        let choice = pool[0];
        for (const buff of pool) {
            roll -= getWeightedChance(buff);
            if (roll <= 0) {
                choice = buff;
                break;
            }
        }

        selected.push(choice);
        pool.splice(pool.indexOf(choice), 1);
    }
    return selected;
}

function selectBossBuff(buffIndex) {
    if (!bossMode.showingBuffSelection || buffIndex >= bossMode.availableBuffs.length) return;
    const selectedBuff = bossMode.availableBuffs[buffIndex];
    bossMode.permanentBuffs.push(selectedBuff);
    applyBossModeBuff(selectedBuff);

    bossMode.showingBuffSelection = false;
    hideBuffSelectionUI();
    flashMsg(`✨ Buff đã chọn: ${getBossBuffName(selectedBuff)}`);
    bossMode.currentFloor++;
    updateGameModeUI();
    setTimeout(() => {
        spawnBossForFloor(bossMode.currentFloor);
    }, 1000);
}

export function applyBossModeBuff(buffType) {
    if (gameMode !== 'vsboss') return;
    const targets = [p1, p2];
    targets.forEach(target => applyBossBuffToTarget(target, buffType));
}

export function reapplyPermanentBuffs() {
    if (gameMode !== 'vsboss') return;
    [p1, p2].forEach(player => {
        if (!player) return;
        const stats = ensureBossBuffStats(player);

        // Reset bossBuffStats về trạng thái ban đầu
        Object.assign(stats, {
            baseDamage: player.damage ?? 1,
            baseMaxHp: player.maxHp ?? 3,
            baseMoveSpeed: player.baseMoveSpeed || player.moveSpeed || 0.5,
            baseBulletSpeed: player.bulletSpeedMultiplier ?? 1,
            baseReload: player.baseReload || player.reload || 320,
            baseReloadRate: player.baseReloadRate || player.reloadRate || (1 / 60),
            lifeSteal: 0,
            bounceExtra: 0,
            pierceExtra: 0,
            fireRateStacks: 0,
            moveSpeedStacks: 0,
            twinShot: false,
            magnetRadius: 0,
            bounceDamageFactor: null,
            pierceDamagePenalty: null,
            shotSplit: false,
            shotSplit4: false,
            ricochetTracking: false,
            poisonShot: false,
            microShieldEnabled: false,
            microShieldStrength: 0,
            criticalHit: false,
            shieldActive: false,
            shieldReady: false,
            slowMotionActive: false,
            fireIceShot: false,
            damageBoostStacks: 0,
            maxHpUpStacks: 0,
            hasBulletDeflect: false,
            debuffResistance: 0,
            luckUpStacks: 0,
            hasMiniTank: false,
            hasDoubleShot: false
        });

        player.damage = stats.baseDamage;

        player.maxHp = stats.baseMaxHp;
        player.hp = Math.min(player.hp, player.maxHp);
        player.moveSpeed = stats.baseMoveSpeed;
        player.baseMoveSpeed = stats.baseMoveSpeed;
        player.bulletSpeedMultiplier = stats.baseBulletSpeed;
        player.reload = stats.baseReload;
        player.baseReload = stats.baseReload;
        player.reloadRate = stats.baseReloadRate;
        player.baseReloadRate = stats.baseReloadRate;
        player.lifeStealAmount = 0;
        player.bossBounceCount = 0;
        player.bossBounceDamageFactor = null;
        player.bossPierceStacks = 0;
        player.bossPierceDamageFactor = null;
        player.hasBossPierce = false;
        player.hasTwinShot = false;
        player.twinShotShotCount = 0;
        player.twinShotBonusCharges = 0;
        player.bossMagnetRadius = 0;

        updateBossBuffDerivedStats(player);
    });
    bossMode.permanentBuffs.forEach(buff => {
        [p1, p2].forEach(player => applyBossBuffToTarget(player, buff, { silent: true }));
    });
    recalcEnemySlowFactor();
    updateGameModeUI();
}

export function updateGameModeUI() {
    if (gameMode === 'vsboss') {
        if (gameModeInfo) gameModeInfo.textContent = `Mode: VS Boss (${bossMode.playerCount}P)`;
        if (floorInfo) { floorInfo.style.display = 'block'; floorInfo.textContent = `Floor: ${bossMode.currentFloor}`; }
        if (permanentBuffsInfo) {
            permanentBuffsInfo.style.display = 'block';
            const buffNames = bossMode.permanentBuffs.map(getBossBuffName).join(', ');
            permanentBuffsInfo.textContent = `Buffs: ${buffNames || 'None'}`;
        }
        if (exitBossModeBtn) exitBossModeBtn.style.display = 'block';
        if (bossModeBtn2P) bossModeBtn2P.style.display = 'none';
    } else {
        if (gameModeInfo) gameModeInfo.textContent = 'Mode: Player vs Player';
        if (floorInfo) floorInfo.style.display = 'none';
        if (permanentBuffsInfo) permanentBuffsInfo.style.display = 'none';
        if (exitBossModeBtn) exitBossModeBtn.style.display = 'none';
        if (bossModeBtn2P) bossModeBtn2P.style.display = 'inline-block';
    }
}

function showBuffSelectionUI() {
    if (!buffSelectionOverlay) return;
    const buffOptions = document.getElementById('buffOptions');
    if (!buffOptions) return;
    buffOptions.innerHTML = '';
    bossMode.availableBuffs.forEach((buff, index) => {
        const rarity = bossBuffRarities[buff] || 'common';
        const rarityLabel = rarityLabels[rarity] || rarity;
        const buffDiv = document.createElement('div');
        buffDiv.className = `buff-card buff-card--${rarity}`;
        buffDiv.innerHTML = `
            <div class="buff-card__rarity">${rarityLabel}</div>
            <div class="buff-card__key">${index + 1}</div>
            <div class="buff-card__title">${getBossBuffName(buff)}</div>
            <div class="buff-card__desc">${getBossBuffDescription(buff)}</div>
        `;
        buffDiv.addEventListener('click', () => selectBossBuff(index));

        buffOptions.appendChild(buffDiv);
    });
    buffSelectionOverlay.style.display = 'flex';
}

function hideBuffSelectionUI() {
    if (buffSelectionOverlay) {
        buffSelectionOverlay.style.display = 'none';
    }
}

function getBossBuffDescription(buffType) {
    const descriptions = {
        lifeSteal: '+0.2 máu mỗi lần gây sát thương',
        bounceShot: 'Đạn nảy thêm +1, có thể cộng dồn vô hạn (giảm sát thương tối đa 10%)',
        bossPierce: 'Đạn xuyên thêm +1 mục tiêu, cộng dồn vô hạn (giảm sát thương tối đa 10%)',
        bossFireRate: '+30% tốc độ bắn và nạp đạn',
        bossMoveSpeed: '+30% tốc độ di chuyển',
        twinShot: 'Sau 5 phát sẽ thưởng 1 lần bắn x2 đạn',
        magnetSmall: 'Hút buff trong phạm vi nhỏ xung quanh',
        shotSplit: 'Đạn chạm tường hoặc Boss tách thành 2 đạn con (40% sát thương)',
        shotSplit4: 'Đạn trúng địch nổ thành 4 viên (40% sát thương mỗi viên)',
        ricochetTracking: 'Sau lần nảy đầu, đạn sẽ tự điều chỉnh về kẻ địch',
        poisonShot: 'Gây độc 3s (20% dmg/s), tối đa 3 stack (+1s & +10%/s mỗi stack)',
        microShield: 'Nhận lá chắn =20% HP, tự hồi sau 5s không nhận sát thương',
        bossShield: '🛡️ Khiên chắn 1 đòn mỗi round (không chặn sát thương DoT)',
        slowMotion10: 'Làm chậm Boss và đạn địch 20% trong round',
        fireIceShot: 'Mỗi viên đạn ngẫu nhiên gây cháy hoặc làm chậm mục tiêu',
        criticalHit: '10% cơ hội gây chí mạng x2 sát thương',
        damageBoost: 'Tăng 20% sát thương, cộng dồn không giới hạn',
        maxHpUp: 'Tăng 20% máu tối đa, cộng dồn không giới hạn',
        bulletDeflect: 'Phản xạ đạn Boss, trả sát thương lại Boss',
        debuffResistance: 'Giảm 10% thời gian debuff nhận vào (tối đa 70%)',
        luckUp: 'Tăng 3% tỉ lệ buff hiếm mỗi stack',
        miniTank: 'Triệu hồi xe tăng mini 1/3 chỉ số hỗ trợ suốt round',
        doubleShot: 'Mỗi lần bắn tạo 2 viên đạn song song'
    };
    return descriptions[buffType] || 'Unknown buff';
}

function getLuckUpBonus() {
    return [p1, p2].reduce((acc, player) => {
        if (!player || !player.bossBuffStats) return acc;
        return acc + ((player.bossBuffStats.luckUpStacks || 0) * 0.03);
    }, 0);
}

export function showBossGameOver() {
    console.log('[GAME OVER] 2. showBossGameOver() được gọi. Đang hiển thị overlay.');
    bossMode.showingGameOver = true;
    if (bossGameOverOverlay) {
        console.log('[GAME OVER] 2. Tìm thấy phần tử bossGameOverOverlay. Đang đổi display thành "flex".');
        bossGameOverOverlay.style.display = 'flex';
    } else {
        console.error('[GAME OVER] LỖI: Không tìm thấy phần tử bossGameOverOverlay trong HTML!');
    }
}

function hideBossGameOver() {
    console.log('[GAME OVER] hideBossGameOver() được gọi. Đang ẩn màn hình Game Over.');
    bossMode.showingGameOver = false;
    if (bossGameOverOverlay) bossGameOverOverlay.style.display = 'none';
}

function handleRetryBoss() {
    console.log('[GAME OVER] Retry button clicked.');
    hideBossGameOver();
    setTimeout(() => {
        resetAfterKill();
        flashMsg(`Thử lại - Tầng ${bossMode.currentFloor}`);
        reapplyPermanentBuffs(); // Áp dụng lại buff sau khi reset
    }, 200);
}

export function initBossMode() {
    if (bossModeBtn2P) {
        bossModeBtn2P.addEventListener('click', () => {
            startBossMode();
            updateGameModeUI();
        });
    }
    if (exitBossModeBtn) {
        exitBossModeBtn.addEventListener('click', () => {
            exitBossMode();
            updateGameModeUI();
        });
    }

    const retryBtn = document.getElementById('retryBossBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', handleRetryBoss);
    }

    const returnBtn = document.getElementById('returnToMenuBtn');
    if (returnBtn) {
        returnBtn.addEventListener('click', () => {
            hideBossGameOver();
            bossMode.active = false;
            bossMode.showingBuffSelection = false;
            bossMode.currentFloor = 1;
            bossMode.permanentBuffs = [];
            setGameMode('pvp');
            returnToMainMenu();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (bossMode.showingBuffSelection) {
            if (e.key === '1') selectBossBuff(0);
            else if (e.key === '2') selectBossBuff(1);
            else if (e.key === '3') selectBossBuff(2);
        }
    });
}