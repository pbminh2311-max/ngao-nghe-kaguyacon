import { gameUI } from '../main.js';
import { p1, p2, scoreP1, scoreP2, devMode } from '../state.js';

function renderEffects(t, el) {
    if (!el) return;
    const now = performance.now();
    const effects = [];
    if (t && t.activeEffects) {
        for (const key in t.activeEffects) {
            const st = t.activeEffects[key];
            if (!st || st.expires === undefined) continue;
            const remaining = st.expires - now;
            if (remaining <= 30) continue;
            const meta = st.meta || {};
            const label = meta.label || key;
            const color = meta.color || '#8faad0';
            effects.push({ label, color, remaining });
        }
    }
    if (effects.length === 0) {
        el.innerHTML = '';
        el.classList.add('empty');
        return;
    }
    effects.sort((a, b) => a.remaining - b.remaining);
    el.classList.remove('empty');
    el.innerHTML = effects.map(effect => {
        const seconds = effect.remaining / 1000;
        const timeText = seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1);
        return `<div class="effect" style="--effect-color:${effect.color}"><span class="label">${effect.label}</span><span class="time">${timeText}s</span></div>`;
    }).join('');
}

export function updateHUD() {
    const p1Fill = document.getElementById('p1HpFill');
    const p2Fill = document.getElementById('p2HpFill');
    const p1Text = document.getElementById('p1HpText');
    const p2Text = document.getElementById('p2HpText');

    if (p1Fill) p1Fill.style.width = `${(p1.hp / p1.maxHp) * 100}%`;
    if (p2Fill) p2Fill.style.width = `${(p2.hp / p2.maxHp) * 100}%`;
    if (p1Text) p1Text.textContent = `HP: ${p1.hp.toFixed(1)}/${p1.maxHp.toFixed(1)}`;
    if (p2Text) p2Text.textContent = `HP: ${p2.hp.toFixed(1)}/${p2.maxHp.toFixed(1)}`;

    const board = document.getElementById('scoreBoard');
    const scoreP1El = document.getElementById('scoreP1Value');
    const scoreP2El = document.getElementById('scoreP2Value');
    if (scoreP1El) scoreP1El.textContent = scoreP1;
    if (scoreP2El) scoreP2El.textContent = scoreP2;
    if (board) {
        let lead = 'tie';
        if (scoreP1 > scoreP2) lead = 'p1';
        else if (scoreP2 > scoreP1) lead = 'p2';
        board.setAttribute('data-lead', lead);
    }
    renderEffects(p1, document.getElementById('p1Effects'));
    renderEffects(p2, document.getElementById('p2Effects'));
}

export function drawGameUI(ctx) {
    // Draw home button (leftmost)
    const homeBtn = gameUI.homeBtn;
    ctx.save();
    ctx.fillStyle = homeBtn.hovered ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(homeBtn.x, homeBtn.y, homeBtn.w, homeBtn.h);

    ctx.fillStyle = '#f3f7ff';
    ctx.font = '22px "Segoe UI Symbol", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⌂', homeBtn.x + homeBtn.w / 2, homeBtn.y + homeBtn.h / 2);

    // Draw help button
    const helpBtn = gameUI.helpBtn;
    ctx.fillStyle = helpBtn.hovered ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(helpBtn.x, helpBtn.y, helpBtn.w, helpBtn.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(helpBtn.x, helpBtn.y, helpBtn.w, helpBtn.h);

    ctx.fillStyle = '#f3f7ff';
    ctx.fillText('?', helpBtn.x + helpBtn.w / 2, helpBtn.y + helpBtn.h / 2);

    // Draw settings button (rightmost)
    const settingsBtn = gameUI.settingsBtn;
    ctx.fillStyle = settingsBtn.hovered ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h);

    ctx.fillStyle = '#f3f7ff';
    ctx.fillText('⚙', settingsBtn.x + settingsBtn.w / 2, settingsBtn.y + settingsBtn.h / 2);

    // Draw Dev Mode Toggle Button
    const devBtn = gameUI.devModeBtn;
    ctx.fillStyle = devBtn.hovered ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.7)';
    ctx.fillRect(devBtn.x, devBtn.y, devBtn.w, devBtn.h);
    ctx.strokeStyle = devMode ? '#ffd700' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = devMode ? 2 : 1;
    ctx.strokeRect(devBtn.x, devBtn.y, devBtn.w, devBtn.h);

    ctx.fillStyle = devMode ? '#ffd700' : '#f3f7ff';
    ctx.font = '18px "Segoe UI Symbol", Arial';
    ctx.fillText('🛠️', devBtn.x + devBtn.w / 2, devBtn.y + devBtn.h / 2);

    ctx.restore();
}