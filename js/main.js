import { BUFF_COLORS } from './constants.js';
import { clamp, dist, normalizeAngle, roundRect, drawEffectRing, drawChainAround, getBossBuffName } from './utils.js';
import { canvas, ctx, W, H, initCanvas } from './canvas.js'; 
import Buff from './classes/Buff.js';
import { styleBulletForOwner, applyEffect, applyPoisonEffect, showStatus, tagEffect, updateAllEffects } from './systems/effects.js';
import { BuffFactory } from './systems/buffs.js';
import { obstacles, randomObstacles, updateMovingObstacles, drawMaze, clearObstacles } from './game/obstacles.js';
import { input } from './game/input.js';import Tank from './classes/Tank.js';
import { resolveTankTank, resolveTankObstacles, isSameTeam, pickHomingTarget, lineCircleColl, pointToLineDistance, pointToLineDistanceSq, lineRectColl, lineLineColl, findCollisionPoint, lineLineIntersectionT, circleColl, circleRectColl } from './game/collision.js';
import { initMenu, mainMenuVisible, returnToMainMenu } from './ui/menu.js';
import { initSettings, toggleSettingsPanel, toggleInstructionsPanel, applyStatSettings, syncSettingsUI } from './ui/settings.js';
import { updateGame } from './game/gameController.js';
import { handleDevKeys, triggerDevAction } from './game/devTools.js';
import { spawnMiniTankCompanion } from './game/gameState.js';
import { render } from './rendering/draw.js';
import { updateAnimations, clearAnimations } from './rendering/animations.js';
import { bossMode, reapplyPermanentBuffs, showBuffSelection, exitBossMode, updateGameModeUI, initBossMode, applyBossModeBuff } from './game/bossMode.js';
import { updateHUD } from './ui/hud.js';
import { buffTypes } from './constants.js';
import { 
    p1, p2, tanks, boss, bullets, buffs, gameMode, 
    devMode, setDevMode, devGodMode, setDevGodMode, devNoWalls, setDevNoWalls, devOneHitKill, setDevOneHitKill,
    setTanks, setBullets, setBuffs
} from './state.js';

export { reapplyPermanentBuffs, showBuffSelection, exitBossMode, bossMode, updateGameModeUI, setDevMode, returnToMainMenu };
export { pickHomingTarget, clamp, dist, normalizeAngle, roundRect, drawChainAround, BUFF_COLORS, drawEffectRing, getBossBuffName };


const msgEl=document.getElementById('msg'); let msgTimer=0;
export function flashMsg(t){msgEl.textContent=t; msgTimer=120;}

export function toggleDevMode(val) {
    if (devMode === val) return;
    setDevMode(val);
    flashMsg(`Developer Mode ${devMode ? 'ON' : 'OFF'}`);
    const devHintEl = document.getElementById('devHint');
    if (devHintEl) devHintEl.style.display = devMode ? 'block' : 'none';
    applyDevModeLayoutClasses();
    syncDevControlsUI();
    syncSettingsUI();
}

const fullscreenBtn = document.getElementById('fullscreenToggleBtn');
const fullscreenBtnIcon = fullscreenBtn ? fullscreenBtn.querySelector('.fullscreen-btn__icon') : null;

const devInstructionsCard = document.getElementById('devInstructionsCard');
const gameWorkspace = document.querySelector('.game-workspace');
const gameWrap = document.getElementById('gameWrap');
const devPanelCloseBtn = devInstructionsCard ? devInstructionsCard.querySelector('.dev-card-close') : null;

let devActionButtons = [];
let devToggleButtons = [];
let devBossBuffButtons = [];

const devToggleKeyMap = {
    god: {
        key: 'g',
        isActive: () => devGodMode
    },
    onehit: {
        key: 'm',
        isActive: () => devOneHitKill
    },
    walls: {
        key: 'n',
        isActive: () => devNoWalls
    }
};

function applyDevModeLayoutClasses() {
    if (devInstructionsCard) {
        devInstructionsCard.classList.toggle('hidden', !devMode);
    }
    if (gameWorkspace) {
        gameWorkspace.classList.toggle('dev-active', devMode);
    }
    if (gameWrap) {
        gameWrap.classList.toggle('dev-active', devMode);
    }
}

function syncDevControlsUI() {
    if (!devInstructionsCard) return;

    devToggleButtons.forEach(btn => {
        const toggleId = btn.dataset.devToggle;
        const config = devToggleKeyMap[toggleId];
        if (!config || typeof config.isActive !== 'function') return;

        const isOn = !!config.isActive();
        btn.classList.toggle('is-on', isOn);
        btn.classList.toggle('is-off', !isOn);
        btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');

        if (toggleId === 'walls') {
            btn.title = isOn ? 'Phím tắt: N • Tường tắt' : 'Phím tắt: N • Tường bật';
        }
    });
}

function setupDevPanelButtons() {
    if (!devInstructionsCard) return;

    if (devPanelCloseBtn) {
        devPanelCloseBtn.addEventListener('click', e => {
            e.preventDefault();
            toggleDevMode(false);
            devPanelCloseBtn.blur();
        });
    }

    devActionButtons = Array.from(devInstructionsCard.querySelectorAll('[data-dev-key]'));
    devToggleButtons = Array.from(devInstructionsCard.querySelectorAll('[data-dev-toggle]'));
    devBossBuffButtons = Array.from(devInstructionsCard.querySelectorAll('[data-dev-boss-buff]'));

    devActionButtons.forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const actionKey = btn.getAttribute('data-dev-key');
            if (!actionKey) return;
            const handled = triggerDevAction(actionKey, { event: e });
            if (handled) syncDevControlsUI();
            btn.blur();
        });
    });

    devToggleButtons.forEach(btn => {
        const toggleId = btn.dataset.devToggle;
        const config = devToggleKeyMap[toggleId];
        if (!config) return;

        btn.addEventListener('click', e => {
            e.preventDefault();
            const handled = triggerDevAction(config.key, { event: e });
            if (handled) syncDevControlsUI();
            btn.blur();
        });
    });

    devBossBuffButtons.forEach(btn => {
        const buffId = btn.getAttribute('data-dev-boss-buff');
        if (!buffId) return;
        btn.addEventListener('click', e => {
            e.preventDefault();
            handleDevBossBuff(buffId);
            btn.blur();
        });
    });

    syncDevControlsUI();
}

function handleDevBossBuff(buffId) {
    if (!buffId) return;
    if (gameMode !== 'vsboss') {
        flashMsg('❌ Chỉ hoạt động trong VS Boss Mode');
        return;
    }

    applyBossModeBuff(buffId);
    if (!bossMode.permanentBuffs.includes(buffId)) {
        bossMode.permanentBuffs.push(buffId);
        flashMsg(`Boss buff: ${getBossBuffName(buffId)} +`);
    } else {
        flashMsg(`Boss buff: ${getBossBuffName(buffId)} đã kích hoạt`);
    }
}

function updateFullscreenButton() {
    if (!fullscreenBtn) return;
    const isFull = !!document.fullscreenElement;
    if (fullscreenBtnIcon) {
        fullscreenBtnIcon.textContent = isFull ? '⤡' : '⤢';
    } else {
        fullscreenBtn.textContent = isFull ? '⤡' : '⤢';
    }
    const label = isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình';
    fullscreenBtn.title = label;
    fullscreenBtn.setAttribute('aria-label', label);
    fullscreenBtn.classList.toggle('is-active', isFull);
}

randomObstacles();
setupDevPanelButtons();
initSettings();
initMenu();
initCanvas();
initBossMode();
updateGameModeUI();

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
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

let last = performance.now();

// Game UI variables
export let gameUI = {
    homeBtn: {x: W - 150, y: 10, w: 40, h: 40, hovered: false},
    helpBtn: {x: W - 100, y: 10, w: 40, h: 40, hovered: false},
    settingsBtn: {x: W - 50, y: 10, w: 40, h: 40, hovered: false},
    devModeBtn: {x: W - 200, y: 10, w: 40, h: 40, hovered: false}
};

let hasLoggedPause = false; // Cờ để chỉ log một lần

const buffInfoButton = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    hovered: false,
    visible: false
};
let showBuffList = false;

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

    // Chỉ cập nhật logic game nếu không ở màn hình Game Over
    if (!bossMode.showingGameOver) {
        // Reset cờ khi game tiếp tục
        hasLoggedPause = false;
        update(dt, now);
    }

    render(ctx, now);
    updateHUD();
    if(msgTimer>0){ msgTimer--; if(msgTimer===0) msgEl.textContent=''; }
    drawGameInfo(ctx); // Vẽ thông tin game mode
    requestAnimationFrame(loop);
}
document.addEventListener('keydown', e=>{
    if (devMode) {
        const handled = handleDevKeys(e);
        if (handled) syncDevControlsUI();
    }
});

function drawGameInfo(ctx) {
    // Chỉ hiển thị thông tin này trong chế độ đấu boss
    if (gameMode !== 'vsboss') {
        buffInfoButton.visible = false;
        buffInfoButton.hovered = false;
        showBuffList = false;
        return;
    }

    const paddingX = 18;
    const paddingY = 10;
    const floorNumber = Number.isFinite(bossMode.currentFloor) ? bossMode.currentFloor : 1;
    const floorText = `Tầng ${floorNumber}`;
    const floorFont = '700 14px "Segoe UI", sans-serif';

    const starSize = 32;

    ctx.save();
    ctx.font = floorFont;

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const textMetrics = ctx.measureText(floorText);
    const badgeWidth = textMetrics.width + paddingX * 2;
    const badgeHeight = paddingY * 2 + 15;
    const x = W - badgeWidth - 20; // Đặt ở góc dưới phải
    const y = H - badgeHeight - 20; // Đặt ở góc dưới phải

    // Buff star button (positioned above the badge)
    const starX = W - starSize - 20;
    const starY = y - starSize - 14;
    buffInfoButton.x = starX;
    buffInfoButton.y = starY;
    buffInfoButton.w = starSize;
    buffInfoButton.h = starSize;
    buffInfoButton.visible = true;

    const starCenterX = starX + starSize / 2;
    const starCenterY = starY + starSize / 2;

    ctx.shadowColor = buffInfoButton.hovered || showBuffList ? 'rgba(251, 191, 36, 0.6)' : 'rgba(15, 23, 42, 0.35)';
    ctx.shadowBlur = buffInfoButton.hovered || showBuffList ? 10 : 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = showBuffList ? '#fbbf24' : buffInfoButton.hovered ? '#fde68a' : 'rgba(255,255,255,0.92)';
    roundRect(ctx, starX, starY, starSize, starSize, 10, true, false);

    ctx.shadowBlur = 0;
    ctx.fillStyle = showBuffList ? '#1f2937' : '#111827';
    ctx.font = '700 18px "Segoe UI Symbol", sans-serif';
    ctx.fillText('✦', starCenterX, starCenterY + 1);

    // Restore font settings for floor badge
    ctx.font = floorFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Nền huy hiệu
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)'; // Màu xám đậm, bán trong suốt
    roundRect(ctx, x, y, badgeWidth, badgeHeight, 10, true, false);

    // Viền phát sáng
    ctx.shadowColor = '#a78bfa'; // Màu tím violet
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(196, 181, 253, 0.7)'; // Màu tím nhạt hơn
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, badgeWidth, badgeHeight, 10, false, true);

    ctx.shadowBlur = 0;

    // Chữ
    ctx.fillStyle = '#e0e7ff'; // Màu trắng ngà
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.fillText(floorText, x + badgeWidth / 2, y + badgeHeight / 2);

    if (showBuffList) {
        const listFont = '600 13px "Segoe UI", sans-serif';
        ctx.font = listFont;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const buffNames = bossMode.permanentBuffs.length
            ? bossMode.permanentBuffs.map(getBossBuffName)
            : ['Không có buff nào'];
        const listPaddingX = 14;
        const listPaddingY = 12;
        const lineHeight = 20;
        let maxWidth = 0;
        buffNames.forEach(name => {
            const w = ctx.measureText(name).width;
            if (w > maxWidth) maxWidth = w;
        });
        const panelWidth = listPaddingX * 2 + maxWidth;
        const panelHeight = listPaddingY * 2 + buffNames.length * lineHeight;
        let panelX = starCenterX - panelWidth / 2;
        panelX = Math.max(20, Math.min(panelX, W - panelWidth - 20));
        const panelY = Math.max(20, starY - panelHeight - 12);

        ctx.shadowColor = 'rgba(148, 163, 184, 0.35)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.94)';
        roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 10, true, false);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e5e7eb';
        buffNames.forEach((name, i) => {
            const textY = panelY + listPaddingY + i * lineHeight + lineHeight / 2;
            ctx.fillText(name, panelX + listPaddingX, textY);
        });
    }

    ctx.restore();
}

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

    if (gameMode === 'vsboss' && buffInfoButton.visible) {
        buffInfoButton.hovered = (
            x >= buffInfoButton.x && x <= buffInfoButton.x + buffInfoButton.w &&
            y >= buffInfoButton.y && y <= buffInfoButton.y + buffInfoButton.h
        );
    } else {
        buffInfoButton.hovered = false;
    }
});

canvas.addEventListener('pointerdown', e => {
    if (mainMenuVisible) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Home button
    if(x >= gameUI.homeBtn.x && x <= gameUI.homeBtn.x + gameUI.homeBtn.w &&
       y >= gameUI.homeBtn.y && y <= gameUI.homeBtn.y + gameUI.homeBtn.h) {
        // Nếu đang trong chế độ boss, cần gọi hàm exit để dọn dẹp
        if (gameMode === 'vsboss') {
            exitBossMode();
        } else {
            // Nếu ở chế độ thường, quay về menu chính ngay lập tức
            returnToMainMenu();
        }
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

    // Buff info button
    if (gameMode === 'vsboss' && buffInfoButton.visible &&
        x >= buffInfoButton.x && x <= buffInfoButton.x + buffInfoButton.w &&
        y >= buffInfoButton.y && y <= buffInfoButton.y + buffInfoButton.h) {
        showBuffList = !showBuffList;
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