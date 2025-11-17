import {
    flashMsg, returnToMainMenu
} from '../main.js';
import {
    p1, p2, tanks, setTanks, boss, setBoss, gameMode, setGameMode, setP1FocusMode, setP2FocusMode,
    setBullets, setBuffs, setRoundEnding, setEnemySlowFactor, enemySlowFactor
} from '../state.js';

import { W, H } from '../canvas.js';
import { showStatus } from '../systems/effects.js';
import { getBossBuffName } from '../utils.js';
import { resetAfterKill } from './gameController.js';
import { bossModeBuffs, BUFF_COLORS, bossModeBuffWeights } from '../constants.js';
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
            shieldActive: false,
            shieldReady: false,
            slowMotionActive: false,
            fireIceShot: false
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
        if (typeof stats.shieldActive === 'undefined') stats.shieldActive = false;
        if (typeof stats.shieldReady === 'undefined') stats.shieldReady = false;
        if (typeof stats.slowMotionActive === 'undefined') stats.slowMotionActive = false;
        if (typeof stats.fireIceShot === 'undefined') stats.fireIceShot = false;
    }

    return target.bossBuffStats;
}

function updateBossBuffDerivedStats(target) {
    const stats = ensureBossBuffStats(target);
    if (!stats) return;

    target.damage = stats.baseDamage;

    target.maxHp = stats.baseMaxHp;
    target.hp = Math.min(target.hp, target.maxHp);

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
        ? (stats.bounceDamageFactor || 0.9)
        : null;
    const pierceStacks = stats.pierceExtra || 0;
    target.bossPierceStacks = pierceStacks;
    target.bossPierceDamageFactor = pierceStacks > 0 && stats.pierceDamagePenalty != null
        ? (1 - stats.pierceDamagePenalty)
        : null;
    target.damage *= pierceStacks > 0 ? 0.9 : 1; // Giảm sát thương cố định
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
    target.hasBossShield = !!stats.shieldActive;
    target.bossShieldReady = !!stats.shieldReady;
    target.hasFireIceShot = !!stats.fireIceShot;
    target.bossIceSlowFactor = 1;

    if (stats.slowMotionActive) {
        // slow effect handled globally
    }

    recalcEnemySlowFactor();
}

function recalcEnemySlowFactor() {
    const slowActive = [p1, p2].some(player => {
        if (!player) return false;
        const stats = player.bossBuffStats;
        return stats && stats.slowMotionActive;
    });
    setEnemySlowFactor(slowActive ? 0.9 : 1);
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
            stats.bounceExtra = (stats.bounceExtra || 0) + 1;
            stats.bounceDamageFactor = Math.min(stats.bounceDamageFactor ?? 1, 0.9);
            message = '↺ Nảy thêm +1 (–10% sát thương cố định)';
            color = BUFF_COLORS.bounceShot;
            break;
        }
        case 'bounceShot2': {
            stats.bounceExtra = (stats.bounceExtra || 0) + 1;
            stats.bounceDamageFactor = Math.min(stats.bounceDamageFactor ?? 1, 0.85);
            message = '↺↺ Nảy thêm +1 (–15% sát thương cố định)';
            color = BUFF_COLORS.bounceShot2;
            break;
        }
        case 'bossPierce': {
            stats.pierceExtra = (stats.pierceExtra || 0) + 1;
            stats.pierceDamagePenalty = Math.max(stats.pierceDamagePenalty || 0, 0.1);
            message = '⤫ Xuyên thêm +1 (–10% sát thương cố định)';
            color = BUFF_COLORS.bossPierce;
            break;
        }
        case 'bossPierce2': {
            stats.pierceExtra = (stats.pierceExtra || 0) + 1;
            stats.pierceDamagePenalty = Math.max(stats.pierceDamagePenalty || 0, 0.1);
            message = '⤫⤫ Xuyên thêm +1 (–10% sát thương cố định)';
            color = BUFF_COLORS.bossPierce2;
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
        case 'bossShield': {
            stats.shieldActive = true;
            stats.shieldReady = true;
            message = '🛡️ Khiên chắn 1 đòn mỗi round';
            color = BUFF_COLORS.bossShield;
            break;
        }
        case 'slowMotion10': {
            stats.slowMotionActive = true;
            message = '🐢 Làm chậm Boss + đạn địch 10%';
            color = BUFF_COLORS.slowMotion10;
            break;
        }
        case 'fireIceShot': {
            stats.fireIceShot = true;
            message = '🔥❄️ Đạn nhận hiệu ứng Hỏa/Băng';
            color = BUFF_COLORS.fireIceShot;
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
            shieldActive: false,
            shieldReady: false,
            slowMotionActive: false,
            fireIceShot: false
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
    const availablePool = bossModeBuffs.filter(buff => !bossMode.permanentBuffs.includes(buff));

    const pool = [...availablePool];
    const weights = { ...bossModeBuffWeights };

    for (let i = 0; i < count && pool.length > 0; i++) {
        const totalWeight = pool.reduce((sum, buff) => sum + (weights[buff] || 1), 0);
        let roll = Math.random() * totalWeight;
        let choice = pool[0];
        for (const buff of pool) {
            roll -= (weights[buff] || 1);
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
        resetAfterKill();
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

        stats.lifeSteal = 0;
        stats.bounceExtra = 0;
        stats.pierceExtra = 0;
        stats.fireRateStacks = 0;
        stats.moveSpeedStacks = 0;
        stats.twinShot = false;
        stats.magnetRadius = 0;
        stats.bounceDamageFactor = null;
        stats.pierceDamagePenalty = null;
        stats.shotSplit = false;
        stats.shieldActive = false;
        stats.shieldReady = false;
        stats.slowMotionActive = false;
        stats.fireIceShot = false;
    });
    bossMode.permanentBuffs.forEach(buff => {
        [p1, p2].forEach(player => applyBossBuffToTarget(player, buff, { silent: true }));
    });
    recalcEnemySlowFactor();
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
        const buffDiv = document.createElement('div');
        buffDiv.className = 'buff-card';
        buffDiv.innerHTML = `
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
        bounceShot: 'Đạn nảy thêm 1 lần, -10% sát thương sau mỗi nảy',
        bounceShot2: 'Đạn nảy thêm 1 lần, -15% sát thương sau mỗi nảy',
        bossPierce: 'Đạn xuyên thêm 1 kẻ địch, -10% sát thương cố định',
        bossPierce2: 'Đạn xuyên thêm 2 kẻ địch, -10% sát thương cố định',
        bossFireRate: '+30% tốc độ bắn và nạp đạn',
        bossMoveSpeed: '+30% tốc độ di chuyển',
        twinShot: 'Sau 5 phát sẽ thưởng 1 lần bắn x2 đạn',
        magnetSmall: 'Hút buff trong phạm vi nhỏ xung quanh',
        shotSplit: 'Đạn chạm tường hoặc Boss tách thành 2 đạn con (40% sát thương)',
        bossShield: 'Khiên chắn 1 đòn mỗi round (không chặn sát thương DoT)',
        slowMotion10: 'Làm chậm Boss và đạn địch 10% trong round',
        fireIceShot: 'Mỗi viên đạn ngẫu nhiên gây cháy hoặc làm chậm mục tiêu'
    };
    return descriptions[buffType] || 'Unknown buff';
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