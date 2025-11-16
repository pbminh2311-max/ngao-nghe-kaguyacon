import { BUFF_COLORS } from './constants.js';
import { clamp, dist, normalizeAngle, roundRect, drawEffectRing, drawChainAround } from './utils.js';
import { canvas, ctx, W, H, initCanvas } from './canvas.js';
import Buff from './classes/Buff.js';
import { styleBulletForOwner, applyEffect, applyPoisonEffect, showStatus, tagEffect, updateAllEffects } from './systems/effects.js';
import { BuffFactory } from './systems/buffs.js';
import { obstacles, randomObstacles, updateMovingObstacles, drawMaze, clearObstacles } from './game/obstacles.js';
import { input } from './game/input.js';import Tank from './classes/Tank.js';
import { resolveTankTank, resolveTankObstacles, isSameTeam, pickHomingTarget, lineCircleColl, pointToLineDistance, pointToLineDistanceSq, lineRectColl, lineLineColl, findCollisionPoint, lineLineIntersectionT, circleColl, circleRectColl } from './game/collision.js';
import { initMenu, mainMenuVisible, returnToMainMenu } from './ui/menu.js';
import { initSettings, toggleSettingsPanel, toggleInstructionsPanel, applyStatSettings, syncSettingsUI } from './ui/settings.js';
import { updateHUD, drawGameUI } from './ui/hud.js';
import { updateGame, spawnBuff, resetAfterKill, handleDevKeys } from './game/gameController.js';
import { render } from './rendering/draw.js';
import { updateAnimations, clearAnimations } from './rendering/animations.js';
import { bossMode, reapplyPermanentBuffs, showBuffSelection, exitBossMode, updateGameModeUI, initBossMode } from './game/bossMode.js';
import { buffTypes } from './constants.js';
import { 
    p1, p2, tanks, boss, bullets, buffs, gameMode, 
    devMode, setDevMode, devGodMode, setDevGodMode, devNoWalls, setDevNoWalls, devOneHitKill, setDevOneHitKill,
    setTanks, setBullets, setBuffs
} from './state.js';

export { reapplyPermanentBuffs, showBuffSelection, exitBossMode, bossMode, updateGameModeUI, setDevMode };
export { pickHomingTarget, clamp, dist, normalizeAngle, roundRect, drawChainAround, BUFF_COLORS, drawEffectRing };


const msgEl=document.getElementById('msg'); let msgTimer=0;
export function flashMsg(t){msgEl.textContent=t; msgTimer=120;}

export function toggleDevMode(val) {
    if (devMode === val) return;
    setDevMode(val);
    flashMsg(`Developer Mode ${devMode ? 'ON' : 'OFF'}`);
    const devHintEl = document.getElementById('devHint');
    if (devHintEl) devHintEl.style.display = devMode ? 'block' : 'none';
    const devIns = document.getElementById('devInstructionsCard');
    if (devIns) devIns.classList.toggle('hidden', !devMode);
}

randomObstacles();
initSettings();
initMenu();
initCanvas();
initBossMode();
updateGameModeUI();

let last = performance.now();

// Game UI variables
export let gameUI = {
    homeBtn: {x: W - 150, y: 10, w: 40, h: 40, hovered: false},
    helpBtn: {x: W - 100, y: 10, w: 40, h: 40, hovered: false},
    settingsBtn: {x: W - 50, y: 10, w: 40, h: 40, hovered: false},
    devModeBtn: {x: W - 200, y: 10, w: 40, h: 40, hovered: false}
};

function update(dt, now) {
    updateMovingObstacles(dt);
    tanks.forEach(t => t.update(dt,input));
    if(boss) boss.update(dt);
    // Cập nhật vị trí của từng viên đạn
    bullets.forEach(b => b.update());

    updateAllEffects(dt);
    updateAnimations(now);

    resolveTankTank(p1,p2); resolveTankObstacles(p1); resolveTankObstacles(p2);

    updateGame(dt, now);
}

function loop(now){
    if (mainMenuVisible) {
        requestAnimationFrame(loop);
        return;
    }
    
    const dt = now - last;
    last = now;
    update(dt, now);
    render(ctx, now);
    if(msgTimer>0){ msgTimer--; if(msgTimer===0) msgEl.textContent=''; }
    updateHUD();
    requestAnimationFrame(loop);
}
document.addEventListener('keydown', e=>{
    if (devMode) {
        handleDevKeys(e);
    }
});

// Mouse event handling for in-game UI
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameUI.homeBtn.hovered = (x >= gameUI.homeBtn.x && x <= gameUI.homeBtn.x + gameUI.homeBtn.w &&
                              y >= gameUI.homeBtn.y && y <= gameUI.homeBtn.y + gameUI.homeBtn.h);
    gameUI.helpBtn.hovered = (x >= gameUI.helpBtn.x && x <= gameUI.helpBtn.x + gameUI.helpBtn.w &&
                              y >= gameUI.helpBtn.y && y <= gameUI.helpBtn.y + gameUI.helpBtn.h);
    gameUI.settingsBtn.hovered = (x >= gameUI.settingsBtn.x && x <= gameUI.settingsBtn.x + gameUI.settingsBtn.w &&
                                  y >= gameUI.settingsBtn.y && y <= gameUI.settingsBtn.y + gameUI.settingsBtn.h);
    gameUI.devModeBtn.hovered = (x >= gameUI.devModeBtn.x && x <= gameUI.devModeBtn.x + gameUI.devModeBtn.w &&
                                 y >= gameUI.devModeBtn.y && y <= gameUI.devModeBtn.y + gameUI.devModeBtn.h);
});

canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Home button
    if(x >= gameUI.homeBtn.x && x <= gameUI.homeBtn.x + gameUI.homeBtn.w &&
       y >= gameUI.homeBtn.y && y <= gameUI.homeBtn.y + gameUI.homeBtn.h) {
        returnToMainMenu();
        return;
    }
    
    // Help button
    if(x >= gameUI.helpBtn.x && x <= gameUI.helpBtn.x + gameUI.helpBtn.w &&
       y >= gameUI.helpBtn.y && y <= gameUI.helpBtn.y + gameUI.helpBtn.h) {
        toggleInstructionsPanel();
        return;
    }
    
    // Settings button
    if(x >= gameUI.settingsBtn.x && x <= gameUI.settingsBtn.x + gameUI.settingsBtn.w &&
       y >= gameUI.settingsBtn.y && y <= gameUI.settingsBtn.y + gameUI.settingsBtn.h) {
        toggleSettingsPanel();
        return;
    }

    // Dev Mode button
    if(x >= gameUI.devModeBtn.x && x <= gameUI.devModeBtn.x + gameUI.devModeBtn.w &&
       y >= gameUI.devModeBtn.y && y <= gameUI.devModeBtn.y + gameUI.devModeBtn.h) {
        toggleDevMode(!devMode);
        return;
    }
    
    canvas.focus();
});

requestAnimationFrame(loop);