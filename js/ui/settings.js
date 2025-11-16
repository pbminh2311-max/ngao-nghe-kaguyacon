import { flashMsg, toggleDevMode } from '../main.js';
import { updateGameModeUI } from '../game/bossMode.js';
import { spawnBot } from '../game/gameController.js';
import { devMode, setDevMode, p1, p2, boss, gameMode } from '../state.js';

const settingsPanel = document.getElementById('settingsPanel');
const instructionsPanel = document.getElementById('instructionsPanel');
const settingsCloseX = document.getElementById('settingsCloseX');
const instructionsCloseX = document.getElementById('instructionsCloseX');
const settingsDevModeInput = document.getElementById('settingsDevMode');
const settingsInstructionsInput = document.getElementById('settingsInstructions');
const settingsFullscreenBtn = document.getElementById('settingsFullscreenBtn');
const settingsSpawnBotBtn = document.getElementById('settingsSpawnBot');

const settingsMaxHpInput = document.getElementById('settingsMaxHp');
const settingsSpeedInput = document.getElementById('settingsSpeed');
const settingsAmmoInput = document.getElementById('settingsAmmo');
const settingsReloadInput = document.getElementById('settingsReload');
const settingsTurnSpeedInput = document.getElementById('settingsTurnSpeed');
const settingsFrictionInput = document.getElementById('settingsFriction');
const settingsReloadRateInput = document.getElementById('settingsReloadRate');

export function toggleSettingsPanel(force) {
    let shouldShow;
    if (typeof force === 'boolean') shouldShow = force;
    else shouldShow = settingsPanel.classList.contains('hidden');
    settingsPanel.classList.toggle('hidden', !shouldShow);
    if (shouldShow && instructionsPanel) instructionsPanel.classList.add('hidden');
    if (shouldShow) syncSettingsUI();
}

export function toggleInstructionsPanel(force) {
    let shouldShow;
    if (typeof force === 'boolean') shouldShow = force;
    else shouldShow = instructionsPanel.classList.contains('hidden');
    instructionsPanel.classList.toggle('hidden', !shouldShow);
    if (shouldShow && settingsPanel) settingsPanel.classList.add('hidden');
}

function updateFullscreenButton() {
    if (!settingsFullscreenBtn) return;
    const isFull = !!document.fullscreenElement;
    settingsFullscreenBtn.textContent = isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình';
}

export function syncSettingsUI() {
    if (settingsDevModeInput) settingsDevModeInput.checked = devMode;
    const instructionsVisible = instructionsPanel ? !instructionsPanel.classList.contains('hidden') : false;
    if (settingsInstructionsInput) settingsInstructionsInput.checked = instructionsVisible;

    if (settingsMaxHpInput && p1) settingsMaxHpInput.value = Math.round(p1.maxHp);
    if (settingsSpeedInput && p1) {
        const speedValue = p1.baseMoveSpeed || p1.moveSpeed || 0.5;
        settingsSpeedInput.value = speedValue.toFixed(2);
    }
    if (settingsAmmoInput && p1) settingsAmmoInput.value = Math.round(p1.maxAmmo);
    if (settingsReloadInput && p1) {
        const reloadValue = p1.baseReload !== undefined ? p1.baseReload : p1.reload;
        settingsReloadInput.value = Number.isFinite(reloadValue) ? (+reloadValue).toFixed(0) : '';
    }
    if (settingsTurnSpeedInput && p1) {
        const turnValue = p1.baseTurnSpeed !== undefined ? p1.baseTurnSpeed : p1.turnSpeed;
        settingsTurnSpeedInput.value = Number.isFinite(turnValue) ? turnValue.toFixed(3) : '';
    }
    if (settingsFrictionInput && p1) {
        const frictionValue = p1.baseFriction !== undefined ? p1.baseFriction : p1.friction;
        settingsFrictionInput.value = Number.isFinite(frictionValue) ? frictionValue.toFixed(3) : '';
    }
    if (settingsReloadRateInput && p1) {
        const rateValue = p1.baseReloadRate !== undefined ? p1.baseReloadRate : p1.reloadRate;
        settingsReloadRateInput.value = Number.isFinite(rateValue) ? rateValue.toFixed(4) : '';
    }
}

export function applyStatSettings() {
    if (!settingsMaxHpInput || !settingsSpeedInput || !settingsAmmoInput) return;
    const baseTank = p1 || p2;

    let maxHp = parseFloat(settingsMaxHpInput.value);
    if (!Number.isFinite(maxHp)) maxHp = baseTank ? baseTank.maxHp : 3;
    if (maxHp <= 0) maxHp = 1;
    settingsMaxHpInput.value = maxHp;

    let speed = parseFloat(settingsSpeedInput.value);
    if (!Number.isFinite(speed)) speed = baseTank ? (baseTank.baseMoveSpeed || baseTank.moveSpeed || 0.5) : 0.5;
    if (speed <= 0) speed = 0.05;
    settingsSpeedInput.value = speed;

    let ammo = parseFloat(settingsAmmoInput.value);
    if (!Number.isFinite(ammo)) ammo = baseTank ? baseTank.maxAmmo : 3;
    if (ammo < 1) ammo = 1;
    settingsAmmoInput.value = ammo;

    let reload = settingsReloadInput ? parseFloat(settingsReloadInput.value) : NaN;
    if (!Number.isFinite(reload)) reload = baseTank ? (baseTank.baseReload ?? baseTank.reload) : 320;
    if (reload < 0) reload = 0;
    if(settingsReloadInput) settingsReloadInput.value = reload;

    let turnSpeed = settingsTurnSpeedInput ? parseFloat(settingsTurnSpeedInput.value) : NaN;
    if (!Number.isFinite(turnSpeed)) turnSpeed = baseTank ? (baseTank.baseTurnSpeed ?? baseTank.turnSpeed) : 0.06;
    if (turnSpeed <= 0) turnSpeed = 0.001;
    if(settingsTurnSpeedInput) settingsTurnSpeedInput.value = turnSpeed;

    let friction = settingsFrictionInput ? parseFloat(settingsFrictionInput.value) : NaN;
    if (!Number.isFinite(friction)) friction = baseTank ? (baseTank.baseFriction ?? baseTank.friction) : 0.93;
    if (friction <= 0) friction = 0.01;
    if(settingsFrictionInput) settingsFrictionInput.value = friction;

    let reloadRate = settingsReloadRateInput ? parseFloat(settingsReloadRateInput.value) : NaN;
    if (!Number.isFinite(reloadRate)) reloadRate = baseTank ? (baseTank.baseReloadRate ?? baseTank.reloadRate) : (1 / 60);
    if (reloadRate <= 0) reloadRate = 0.001;
    if(settingsReloadRateInput) settingsReloadRateInput.value = reloadRate;

    [p1, p2].forEach(t => {
        if (!t || t.isClone || t === boss) return;
        if (gameMode === 'vsboss' && t.bossBuffStats) return;

        t.maxHp = maxHp;
        t.hp = Math.min(t.hp, maxHp);

        const hasSpeedBuff = t.activeEffects && t.activeEffects.speed;
        t.baseMoveSpeed = speed;
        if (!hasSpeedBuff) t.moveSpeed = speed;

        t.maxAmmo = ammo;
        t.ammo = Math.min(t.ammo, ammo);
        t.reloadCooldown = Math.min(t.reloadCooldown, ammo);

        t.baseReload = reload;
        t.reload = reload;
        t.baseTurnSpeed = turnSpeed;
        t.turnSpeed = turnSpeed;
        t.baseFriction = friction;
        if (!hasSpeedBuff) t.friction = friction;

        t.baseReloadRate = reloadRate;
        t.reloadRate = reloadRate;
    });
    updateGameModeUI();
    syncSettingsUI();
}

export function initSettings() {
    if (settingsFullscreenBtn) {
        settingsFullscreenBtn.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        });
        document.addEventListener('fullscreenchange', updateFullscreenButton);
        updateFullscreenButton();
    }

    if (settingsCloseX) settingsCloseX.addEventListener('click', () => toggleSettingsPanel(false));
    if (instructionsCloseX) instructionsCloseX.addEventListener('click', () => toggleInstructionsPanel(false));
    if (settingsDevModeInput) settingsDevModeInput.addEventListener('change', e => {
        // Use the imported function to toggle dev mode
        toggleDevMode(!!e.target.checked);
    });
    if (settingsInstructionsInput) settingsInstructionsInput.addEventListener('change', e => toggleInstructionsPanel(!!e.target.checked));
    if (settingsSpawnBotBtn) settingsSpawnBotBtn.addEventListener('click', () => { spawnBot(); toggleSettingsPanel(false); });

    const settingsInputs = [
        settingsMaxHpInput, settingsSpeedInput, settingsAmmoInput,
        settingsReloadInput, settingsTurnSpeedInput, settingsFrictionInput,
        settingsReloadRateInput
    ];

    settingsInputs.forEach(input => {
        if (input) {
            ['change', 'input'].forEach(evt =>
                input.addEventListener(evt, applyStatSettings)
            );
        }
    });

    applyStatSettings();
}