import { flashMsg } from '../main.js';
import { toggleInstructionsPanel, toggleSettingsPanel } from './settings.js';
import { resetAfterKill } from '../game/gameController.js';
import { gameMode, setGameMode } from '../state.js';
import { startBossMode, exitBossMode } from '../game/bossMode.js';

const mainMenuOverlay = document.getElementById('mainMenuOverlay');
const menuBtnPvP = document.getElementById('menuBtnPvP');
const menuBtnBoss = document.getElementById('menuBtnBoss');
const menuBtnSettings = document.getElementById('menuBtnSettings');
const canvas = document.getElementById('c');

export let mainMenuVisible = true;

export function showMainMenu() {
    mainMenuVisible = true;
    if (mainMenuOverlay) mainMenuOverlay.style.display = 'flex';
    if (canvas) canvas.style.filter = 'blur(5px)';
}

export function hideMainMenu() {
    mainMenuVisible = false;
    if (mainMenuOverlay) mainMenuOverlay.style.display = 'none';
    if (canvas) canvas.style.filter = 'none';
}

export function returnToMainMenu() {
    if (gameMode === 'vsboss') {
        exitBossMode();
    }
    
    // Reset game state
    // roundEnding = false; // These will be managed by a game state controller later
    // overlayText = null;
    
    toggleSettingsPanel(false);
    toggleInstructionsPanel(false);
    
    showMainMenu();
    flashMsg('Quay về menu chính');
}

export function initMenu() {
    if (menuBtnPvP) {
        menuBtnPvP.addEventListener('click', () => {
            hideMainMenu();
            setGameMode('pvp');
            resetAfterKill();
            flashMsg('Chế độ PvP - Bắt đầu!');
        });
    }

    if (menuBtnBoss) {
        menuBtnBoss.addEventListener('click', () => {
            hideMainMenu();
            startBossMode();
        });
    }

    if (menuBtnSettings) {
        menuBtnSettings.addEventListener('click', () => {
            toggleSettingsPanel(true);
        });
    }

    // Start with main menu visible
    showMainMenu();
}