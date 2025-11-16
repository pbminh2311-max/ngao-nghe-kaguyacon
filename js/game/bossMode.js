import {
    flashMsg
} from '../main.js';
import {
    p1, p2, tanks, setTanks, boss, setBoss, gameMode, setGameMode, setP1FocusMode, setP2FocusMode,
    setBullets, setBuffs
} from '../state.js';
import { W, H } from '../canvas.js';
import { showStatus } from '../systems/effects.js';
import { resetAfterKill } from './gameController.js';
import { bossModeBuffs } from '../constants.js';
import Boss from '../classes/Boss.js';
import { syncSettingsUI } from '../ui/settings.js';

// --- State ---
export let bossMode = {
    active: false,
    playerCount: 2,
    currentFloor: 1,
    maxFloor: 1,
    showingBuffSelection: false,
    availableBuffs: [],
    permanentBuffs: [],
    bossDefeated: false
};

// --- UI Elements ---
const bossModeBtn2P = document.getElementById('bossModeBtn2P');
const exitBossModeBtn = document.getElementById('exitBossModeBtn');
const buffSelectionOverlay = document.getElementById('buffSelectionOverlay');
const gameModeInfo = document.getElementById('gameModeInfo');
const floorInfo = document.getElementById('floorInfo');
const permanentBuffsInfo = document.getElementById('permanentBuffsInfo');

// --- Functions ---

export function startBossMode() {
    console.log('Starting Boss Mode...');
    setGameMode('vsboss');
    bossMode.active = true;
    bossMode.playerCount = 2;
    bossMode.currentFloor = 1;
    bossMode.permanentBuffs = [];
    bossMode.showingBuffSelection = false;

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
            baseBulletSpeed: 1
        };
    });

    resetAfterKill();
    spawnBossForFloor(bossMode.currentFloor);
    flashMsg(`VS Boss Mode - Tầng ${bossMode.currentFloor}`);
}

export function exitBossMode() {
    setGameMode('pvp');
    bossMode.active = false;
    bossMode.showingBuffSelection = false;
    bossMode.permanentBuffs = [];

    // Tắt Focus Mode khi thoát
    setP1FocusMode(false);
    setP2FocusMode(false);
    syncSettingsUI();

    setTanks([p1, p2]);
    p1.resetStatus();
    p2.resetStatus();
    p1.hp = p1.maxHp;
    p2.hp = p2.maxHp;

    p1.bossBuffStats = null;
    p2.bossBuffStats = null;

    if (boss) {
        const index = tanks.indexOf(boss);
        if (index !== -1) tanks.splice(index, 1);
        setBoss(null);
    }

    resetAfterKill();
    flashMsg('Returned to PvP Mode');
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
    bossMode.showingBuffSelection = true;
    bossMode.availableBuffs = getRandomBossBuffs(3);
    showBuffSelectionUI();
}

function getRandomBossBuffs(count) {
    const availableBuffs = [...bossModeBuffs];
    const selected = [];
    for (let i = 0; i < count && availableBuffs.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableBuffs.length);
        selected.push(availableBuffs.splice(randomIndex, 1)[0]);
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

function getBossBuffName(buffType) {
    const names = {
        'muscle': '💪 Cơ Bắp', 'thickSkin': '🩸 Da Dày',
        'agility': '🏃 Nhanh Nhẹn', 'bulletSpeed': '💨 Tăng Tốc Đạn'
    };
    return names[buffType] || buffType;
}

export function applyBossModeBuff(buffType) {
    if (gameMode !== 'vsboss') return;
    const targets = [p1, p2];
    targets.forEach(target => {
        if (!target) return;
        if (!target.bossBuffStats) {
            target.bossBuffStats = { baseDamage: 1, baseMaxHp: 3, baseMoveSpeed: target.baseMoveSpeed || 0.5, baseBulletSpeed: 1 };
        }
        const stats = target.bossBuffStats;
        switch(buffType) {
            case 'muscle':
                stats.baseDamage += 1;
                target.damage = stats.baseDamage;
                showStatus(target, `💪 Damage: ${target.damage}`, '#ff6b35', 2000);
                break;
            case 'thickSkin':
                stats.baseMaxHp += 1;
                target.maxHp = stats.baseMaxHp;
                showStatus(target, `🩸 Max HP: ${target.maxHp}`, '#e74c3c', 2000);
                break;
            case 'agility':
                stats.baseMoveSpeed *= 1.05;
                target.moveSpeed = stats.baseMoveSpeed;
                target.baseMoveSpeed = stats.baseMoveSpeed;
                showStatus(target, `🏃 Speed +5%`, '#2ecc71', 2000);
                break;
            case 'bulletSpeed':
                stats.baseBulletSpeed *= 1.1;
                target.bulletSpeedMultiplier = stats.baseBulletSpeed;
                showStatus(target, `💨 Bullet +10%`, '#3498db', 2000);
                break;
        }
    });
}

export function reapplyPermanentBuffs() {
    if (gameMode !== 'vsboss') return;
    [p1, p2].forEach(player => {
        if (player) {
            if (!player.bossBuffStats) {
                player.bossBuffStats = { baseDamage: 1, baseMaxHp: 3, baseMoveSpeed: player.baseMoveSpeed || 0.5, baseBulletSpeed: 1 };
            }
            player.damage = 1;
            player.maxHp = 3;
            player.moveSpeed = player.baseMoveSpeed || 0.5;
            player.bulletSpeedMultiplier = 1;
            player.bossBuffStats.baseDamage = 1;
            player.bossBuffStats.baseMaxHp = 3;
            player.bossBuffStats.baseMoveSpeed = player.baseMoveSpeed || 0.5;
            player.bossBuffStats.baseBulletSpeed = 1;
        }
    });
    bossMode.permanentBuffs.forEach(buff => applyBossModeBuff(buff));
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
        buffDiv.className = 'card';
        buffDiv.style.cssText = `padding: 20px; cursor: pointer; min-width: 150px; transition: transform 0.2s ease, box-shadow 0.2s ease; border: 2px solid rgba(255,215,0,0.3);`;
        buffDiv.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">${index + 1}</div>
            <div style="font-weight: bold; color: #ffd700; margin-bottom: 8px;">${getBossBuffName(buff)}</div>
            <div style="font-size: 12px; color: #ccc;">${getBossBuffDescription(buff)}</div>
        `;
        buffDiv.addEventListener('click', () => selectBossBuff(index));
        buffDiv.addEventListener('mouseenter', () => { buffDiv.style.transform = 'translateY(-5px)'; buffDiv.style.boxShadow = '0 10px 30px rgba(255,215,0,0.3)'; });
        buffDiv.addEventListener('mouseleave', () => { buffDiv.style.transform = 'translateY(0)'; buffDiv.style.boxShadow = ''; });
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
        'muscle': '+1 sát thương thường (cộng dồn)',
        'thickSkin': '+1 HP tối đa (cộng dồn)',
        'agility': '+5% tốc độ di chuyển (cộng dồn)',
        'bulletSpeed': '+10% tốc độ bay của đạn (cộng dồn)'
    };
    return descriptions[buffType] || 'Unknown buff';
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
    document.addEventListener('keydown', (e) => {
        if (bossMode.showingBuffSelection) {
            if (e.key === '1') selectBossBuff(0);
            else if (e.key === '2') selectBossBuff(1);
            else if (e.key === '3') selectBossBuff(2);
        }
    });
}