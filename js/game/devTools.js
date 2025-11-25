import {
    p1, p2, tanks, boss, bullets,
    gameMode, devGodMode, setDevGodMode, devNoWalls, setDevNoWalls, devOneHitKill, setDevOneHitKill
} from '../state.js';
import { flashMsg } from '../main.js';
import { showStatus } from '../systems/effects.js';
import { syncSettingsUI } from '../ui/settings.js';
import { bossMode, applyBossModeBuff, reapplyPermanentBuffs } from './bossMode.js';
import { resetAfterKill, spawnMiniTankCompanion } from './gameState.js';
import { spawnBuff } from './gameController.js';
import Tank from '../classes/Tank.js';
import Bullet from '../classes/Bullet.js';

export function spawnBot() {
    spawnMiniTankCompanion(p1); // Now uses the imported function
    flashMsg('Bot hỗ trợ xuất hiện!');
}

export function triggerDevAction(rawKey, context = {}) {
    if (!rawKey) return false;
    const key = rawKey.toLowerCase();

    const buffMap = {
        'z': 'heal', '2': 'speed', 'c': 'homing', 'v': 'invis', '5': 'shrink', '6': 'shield',
        '7': 'rapidfire', '8': 'bigbullet', '9': 'clone', '0': 'shotgun', 'q': 'ricochet',
        'y': 'giantEnemy', 'e': 'reverse', 'r': 'explosive', 't': 'root', 'u': 'pierce',
        'i': 'poison', 'p': 'nuke', 'j': 'trail', 'l': 'possession', 'x': 'fury', 'k': 'silence'
    };

    if (buffMap[key]) {
        spawnBuff(buffMap[key]);
        flashMsg(`Tạo buff: ${buffMap[key]}`);
        return true;
    }

    switch (key) {
        case 'h': p1.hp = p1.maxHp; p2.hp = p2.maxHp; flashMsg('HP full'); return true;
        case 'm':
            setDevOneHitKill(!devOneHitKill);
            flashMsg(devOneHitKill ? '1 Hit Kill ON' : '1 Hit Kill OFF');
            if (devOneHitKill) { showStatus(p1, 'Sát thương 999999', '#ff0000', 900); showStatus(p2, 'Sát thương 999999', '#ff0000', 900); }
            syncSettingsUI(); return true;
        case '1':
            if (gameMode === 'vsboss') {
                bossMode.permanentBuffs.forEach(buff => applyBossModeBuff(buff));
                flashMsg('🧪 Added ALL buffs for testing!');
            } else { flashMsg('❌ Not in boss mode!'); }
            return true;
        case '3':
            if (gameMode === 'vsboss') {
                bossMode.permanentBuffs = [];
                reapplyPermanentBuffs();
                flashMsg('🧪 Cleared all buffs!');
            } else { flashMsg('❌ Not in boss mode!'); }
            return true;
        case 'b': bullets.push(new Bullet(450, 280, Math.random() * Math.PI * 2, p1)); flashMsg('Spawn bullet'); return true;
        case 'o': resetAfterKill(); flashMsg('Reset game'); return true;
        case 'f': p1.reloadRate *= 5; p2.reloadRate *= 5; flashMsg('Fast reload'); return true;
        case 'n': setDevNoWalls(!devNoWalls); flashMsg(devNoWalls ? 'No Walls ON' : 'No Walls OFF'); syncSettingsUI(); return true;
        case 'g':
            setDevGodMode(!devGodMode);
            flashMsg(devGodMode ? 'Bất tử ON' : 'Bất tử OFF');
            if (devGodMode) { showStatus(p1, 'Miễn sát thương', '#ffe27a', 900); showStatus(p2, 'Miễn sát thương', '#ffe27a', 900); }
            syncSettingsUI(); return true;
    }
    return false;
}

export function handleDevKeys(e) {
    if (!e || typeof e.key !== 'string') return false;
    const handled = triggerDevAction(e.key, { event: e });
    if (handled && typeof e.preventDefault === 'function') e.preventDefault();
    return handled;
}