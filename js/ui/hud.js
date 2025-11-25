import { gameUI } from '../main.js';
import { p1, p2, scoreP1, scoreP2, devMode } from '../state.js';

const EFFECT_LABELS = {
    heal: 'Hồi máu',
    speed: 'Tăng tốc',
    homing: 'Đạn tự dẫn',
    invis: 'Tàng hình',
    shield: 'Khiên',
    bigbullet: 'Đạn to',
    shotgun: 'Bắn chùm',
    ricochet: 'Đạn nảy',
    explosive: 'Đạn nổ',
    pierce: 'Đạn xuyên',
    poison: 'Độc',
    poisonShots: 'Đạn độc',
    trail: 'Dung nham',
    shrink: 'Thu nhỏ',
    rapidfire: 'Nạp nhanh',
    clone: 'Phân thân',
    giantEnemy: 'Khổng lồ',
    reverse: 'Đảo phím',
    root: 'Bị trói chân',
    silence: 'Câm lặng',
    possession: 'Thôi miên',
    nuke: 'Bom hạt nhân',
    fury: 'Cuồng nộ',
    fire: 'Cháy',
    ice: 'Đóng băng',
    fireIceShot: 'Hỏa/Băng',
    poisonShot: 'Độc',
    microShield: 'MicroShield',
    lifeSteal: 'Hút máu',
    bounceShot: 'Đạn nảy+',
    bossPierce: 'Xuyên+',
    bossFireRate: 'Tốc độ bắn+',
    bossMoveSpeed: 'Tốc độ chạy+',
    twinShot: 'Twin Shot',
    magnetSmall: 'Nam châm',
    shotSplit: 'Đạn tách đôi',
    shotSplit4: 'Đạn tách 4',
    ricochetTracking: 'Đạn truy đuổi',
    bossShield: 'Khiên Boss',
    slowMotion10: 'Làm chậm',
    damageBoost: 'Tăng sát thương',
    maxHpUp: 'Tăng HP',
    bulletDeflect: 'Phản đạn',
    debuffResistance: 'Kháng debuff',
    luckUp: 'May mắn',
    miniTank: 'Mini Tank',
    doubleShot: 'Double Shot'
};

function renderEffects(t, el) {
    if (!el) return;
    const now = performance.now();
    const effects = [];
    if (t && t.activeEffects) {
        for (const key in t.activeEffects) {
            const st = t.activeEffects[key];
            if (!st) continue;
            const meta = st.meta || {};
            const duration = st.duration ?? Infinity;
            const expires = duration === Infinity ? Infinity : (st.startTime + duration);
            const remaining = expires === Infinity ? Infinity : expires - now;
            if (expires !== Infinity && remaining <= 30) continue;
            const label = meta.label || EFFECT_LABELS[key] || key;

            const color = meta.color || '#8faad0';
            effects.push({ label, color, remaining, duration, key });
        }
    }

    if (effects.length === 0) {
        el.innerHTML = '';
        el.classList.add('empty');
        return;
    }

    effects.sort((a, b) => {
        const ar = a.remaining === Infinity ? Number.MAX_SAFE_INTEGER : a.remaining;
        const br = b.remaining === Infinity ? Number.MAX_SAFE_INTEGER : b.remaining;
        return ar - br;
    });
    el.classList.remove('empty');

    const maxBuffsToShow = 4;
    const buffsToShow = effects.slice(0, maxBuffsToShow);

    const effectHtml = buffsToShow.map(effect => {
        const seconds = effect.remaining === Infinity ? Infinity : Math.max(0, effect.remaining / 1000);
        const timeText = seconds === Infinity ? '∞' : (seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1));
        const progress = effect.duration === Infinity ? 1 : Math.max(0, Math.min(1, effect.remaining / effect.duration));
        const progressPercent = (progress * 100).toFixed(1);
        return `
            <div class="effect" style="--effect-color:${effect.color}">
                <div class="effect-meta">
                    <div class="effect-label-row">
                        <span class="label">${effect.label}</span>
                        <span class="time">${timeText}${seconds === Infinity ? '' : 's'}</span>
                    </div>
                    <div class="effect-progress">
                        <span class="effect-progress-bar" style="width:${progressPercent}%"></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const overflow = effects.length - maxBuffsToShow;
    const overflowHtml = overflow > 0 ? `<div class="effect more" style="--effect-color:#8faad0;">+${overflow}</div>` : '';

    el.innerHTML = effectHtml + overflowHtml;
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