import { roundRect } from '../utils.js';

export function drawBossBody(ctx, boss) {
    switch(boss.bossType) {
        case 'slime':
            drawSlimeBody(ctx, boss);
            break;
        case 'wolf':
            drawWolfBody(ctx, boss);
            break;
        case 'golem':
            drawGolemBody(ctx, boss);
            break;
        case 'witch':
            drawWitchBody(ctx, boss);
            break;
        case 'treant':
            drawTreantBody(ctx, boss);
            break;
        default:
            drawNormalBossBody(ctx, boss);
            break;
    }
}

function drawSlimeBody(ctx, boss) {
    const time = performance.now() * 0.003;
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 25;

    for(let i = 3; i >= 0; i--) {
        ctx.beginPath();
        const points = 12;
        for(let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const wobble = Math.sin(time * 3 + j * 0.8) * 4;
            const radius = boss.r + wobble + i * 3;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if(j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const gradient = ctx.createRadialGradient(-boss.r/3, -boss.r/3, 0, 0, 0, boss.r + i * 3);
        gradient.addColorStop(0, '#86efac');
        gradient.addColorStop(0.4, '#4ade80');
        gradient.addColorStop(0.8, '#22c55e');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    for(let i = 0; i < 5; i++) {
        const bubbleTime = time + i * 0.5;
        const x = Math.cos(bubbleTime) * (boss.r * 0.3) + Math.sin(bubbleTime * 1.3) * (boss.r * 0.2);
        const y = Math.sin(bubbleTime * 0.8) * (boss.r * 0.3) + Math.cos(bubbleTime * 1.1) * (boss.r * 0.2);
        const size = 3 + Math.sin(bubbleTime * 2) * 2;
        ctx.fillStyle = '#bbf7d0';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(0, 0, boss.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawWolfBody(ctx, boss) {
    const time = performance.now() * 0.002;
    const r = boss.r;

    // Main body shape
    const bodyGradient = ctx.createLinearGradient(-r, 0, r, 0);
    bodyGradient.addColorStop(0, '#312e81');
    bodyGradient.addColorStop(0.5, '#4338ca');
    bodyGradient.addColorStop(1, '#312e81');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(r, 0); // Nose
    ctx.bezierCurveTo(r * 0.5, -r * 0.8, -r * 0.5, -r * 0.9, -r * 1.2, 0); // Top curve
    ctx.bezierCurveTo(-r * 0.5, r * 0.9, r * 0.5, r * 0.8, r, 0); // Bottom curve
    ctx.fill();

    // Head and ears
    ctx.fillStyle = '#3730a3';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.lineTo(r * 0.5, -r); // Left ear
    ctx.lineTo(r * 0.2, -r * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.lineTo(r * 0.5, r); // Right ear
    ctx.lineTo(r * 0.2, r * 0.2);
    ctx.closePath();
    ctx.fill();

    // Glowing eyes
    ctx.save();
    ctx.fillStyle = '#a78bfa';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(r * 0.7, -r * 0.2, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.7, r * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Energy lines on back
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r * 0.5, Math.sin(time * 3) * r * 0.3, r * 0.5, Math.cos(time * 3) * r * 0.2, r * 0.8, 0);
    ctx.stroke();
    
    // Tail
    const tailWag = Math.sin(time * 8) * 0.3;
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-boss.r * 0.8, 0);
    ctx.quadraticCurveTo(-boss.r * 1.2, tailWag * boss.r, -boss.r * 1.4, tailWag * boss.r * 0.5);
    ctx.stroke();
}

function drawGolemBody(ctx, boss) {
    const time = performance.now() * 0.001;
    const hover = Math.sin(time) * 2;

    if(boss.isDefending) {
        for(let i = 0; i < 3; i++) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 20;
            const gradient = ctx.createRadialGradient(0, 0, boss.r * 0.5, 0, 0, boss.r + i * 6);
            gradient.addColorStop(0, '#f59e0b');
            gradient.addColorStop(0.7, '#d97706');
            gradient.addColorStop(1, 'rgba(251, 191, 36, 0.2)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, hover, boss.r + i * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.shadowBlur = 0;

    // Draw main body
    drawRock(ctx, 0, hover, boss.r, '#78716c', '#44403c');

    // Draw floating fists
    const fistHoverX = Math.cos(time * 1.5) * 3;
    const fistHoverY = Math.sin(time * 2) * 2;
    drawRock(ctx, -boss.r * 1.5 + fistHoverX, hover + fistHoverY, boss.r * 0.6, '#a8a29e', '#57534e');
    drawRock(ctx, boss.r * 1.5 - fistHoverX, hover - fistHoverY, boss.r * 0.6, '#a8a29e', '#57534e');

    // Draw glowing eye
    const eyeColor = boss.isDefending ? '#fbbf24' : '#ef4444';
    ctx.save();
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = boss.isDefending ? 15 : 8;
    ctx.beginPath();
    ctx.ellipse(0, hover - boss.r * 0.2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawRock(ctx, x, y, r, color1, color2) {
    ctx.save();
    ctx.translate(x, y);
    const gradient = ctx.createRadialGradient(-r/3, -r/3, 0, 0, 0, r);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    const points = 8;
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const radius = r * (0.8 + Math.random() * 0.4);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function drawWitchBody(ctx, boss) {
    const time = performance.now() * 0.001;
    const r = boss.r;
    const hover = Math.sin(time * 2) * 2.5;

    ctx.save();

    // Radial aura beneath the witch (top-down symmetry)
    ctx.save();
    const auraPulse = 0.35 + 0.15 * Math.sin(time * 3.6);
    const auraGradient = ctx.createRadialGradient(0, r * 1.05 + hover, 0, 0, r * 1.05 + hover, r * 1.7);
    auraGradient.addColorStop(0, 'rgba(192, 132, 252, 0.4)');
    auraGradient.addColorStop(0.55, 'rgba(147, 51, 234, 0.18)');
    auraGradient.addColorStop(1, 'rgba(59, 7, 100, 0)');
    ctx.globalAlpha = auraPulse;
    ctx.beginPath();
    ctx.ellipse(0, r * 1.05 + hover, r * 1.6, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = auraGradient;
    ctx.fill();
    ctx.restore();

    // Outer magical veil (circular so rotation looks identical)
    const veilGradient = ctx.createRadialGradient(0, hover * 0.1, r * 0.3, 0, hover * 0.1, r * 1.05);
    veilGradient.addColorStop(0, 'rgba(238, 242, 255, 0.85)');
    veilGradient.addColorStop(0.4, 'rgba(196, 181, 253, 0.55)');
    veilGradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
    ctx.fillStyle = veilGradient;
    ctx.beginPath();
    ctx.arc(0, hover * 0.1, r * 1.05, 0, Math.PI * 2);
    ctx.fill();

    // Concentric energy rings
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.45)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
        const ringRadius = r * (0.45 + i * 0.2 + Math.sin(time * 1.5 + i) * 0.03);
        ctx.globalAlpha = 0.6 - i * 0.1;
        ctx.beginPath();
        ctx.arc(0, hover * 0.1, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Rotationally symmetric swirl arms
    ctx.save();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        const spin = time * 1.2;
        const angle = spin + (i / 6) * Math.PI * 2;
        const inner = r * 0.25;
        const outer = r * 0.95;
        const cx = Math.cos(angle) * inner;
        const cy = Math.sin(angle) * inner + hover * 0.1;
        const tx = Math.cos(angle) * outer;
        const ty = Math.sin(angle) * outer + hover * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
            Math.cos(angle + Math.PI / 6) * outer * 0.6,
            Math.sin(angle + Math.PI / 6) * outer * 0.6 + hover * 0.1,
            tx,
            ty
        );
        ctx.stroke();
    }
    ctx.restore();

    // Core orb body
    const coreGradient = ctx.createRadialGradient(0, hover * 0.05, r * 0.1, 0, hover * 0.05, r * 0.55);
    coreGradient.addColorStop(0, '#f5d0fe');
    coreGradient.addColorStop(0.4, '#d8b4fe');
    coreGradient.addColorStop(1, '#7c3aed');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, hover * 0.05, r * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Floating sigil ring
    ctx.save();
    ctx.font = `${Math.round(r * 0.45)}px "Times New Roman"`;
    const runes = ['✧', '✦', '⬩', '❂', '✶', '⟡'];
    for (let i = 0; i < runes.length; i++) {
        const angle = time * 0.7 + (i / runes.length) * Math.PI * 2;
        const radius = r * 1.05;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + hover * 0.1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + time * 0.4);
        ctx.fillStyle = `rgba(224, 231, 255, ${0.45 + 0.25 * Math.sin(time * 3 + i)})`;
        ctx.fillText(runes[i], 0, 0);
        ctx.restore();
    }
    ctx.restore();

    // Inner eye that stays centred regardless rotation
    const blink = 0.5 + 0.5 * Math.abs(Math.sin(time * 2.8));
    ctx.fillStyle = 'rgba(240, 171, 252, 0.9)';
    ctx.shadowColor = '#f0abfc';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(0, hover * 0.05, r * 0.22, r * 0.22 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
}

function drawTreantBody(ctx, boss) {
    const time = performance.now() * 0.001;
    const r = boss.r;
    const hover = Math.sin(time * 1.35) * 2.3;

    ctx.save();

    // Ground bloom
    ctx.save();
    const groundPulse = 0.36 + 0.12 * Math.sin(time * 2.4);
    const groundGradient = ctx.createRadialGradient(0, r * 1.25 + hover, 0, 0, r * 1.25 + hover, r * 2.0);
    groundGradient.addColorStop(0, 'rgba(134, 239, 172, 0.42)');
    groundGradient.addColorStop(0.6, 'rgba(74, 222, 128, 0.22)');
    groundGradient.addColorStop(1, 'rgba(21, 128, 61, 0)');
    ctx.globalAlpha = groundPulse;
    ctx.beginPath();
    ctx.ellipse(0, r * 1.25 + hover, r * 1.9, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fillStyle = groundGradient;
    ctx.fill();
    ctx.restore();

    // Root petals (6-fold symmetry)
    ctx.save();
    ctx.fillStyle = 'rgba(30, 64, 36, 0.45)';
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.25;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.55 + hover * 0.1);
        ctx.quadraticCurveTo(
            Math.cos(angle) * r * 0.85,
            Math.sin(angle) * r * 0.85 + hover * 0.1,
            Math.cos(angle) * r * 1.2,
            Math.sin(angle) * r * 1.2 + r * 0.75
        );
        ctx.quadraticCurveTo(0, r * 1.05 + hover * 0.05, 0, r * 0.55 + hover * 0.1);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // Trunk disk
    const trunkGradient = ctx.createRadialGradient(0, hover * 0.05, r * 0.15, 0, hover * 0.05, r * 0.96);
    trunkGradient.addColorStop(0, '#815f3f');
    trunkGradient.addColorStop(0.45, '#5f4431');
    trunkGradient.addColorStop(1, '#2b211b');
    ctx.fillStyle = trunkGradient;
    ctx.beginPath();
    ctx.arc(0, hover * 0.05, r * 0.98, 0, Math.PI * 2);
    ctx.fill();

    // Growth rings
    ctx.save();
    ctx.strokeStyle = 'rgba(25, 19, 15, 0.2)';
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -time * 10;
    for (let i = 1; i <= 4; i++) {
        ctx.lineWidth = i === 4 ? 2 : 1.4;
        ctx.beginPath();
        ctx.arc(0, hover * 0.05, r * (0.25 + i * 0.15), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();

    // Bark fissures
    ctx.save();
    ctx.strokeStyle = 'rgba(12, 10, 8, 0.38)';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    const fissures = 8;
    for (let i = 0; i < fissures; i++) {
        const angle = (i / fissures) * Math.PI * 2 + Math.sin(time * 0.8 + i) * 0.1;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r * 0.18, Math.sin(angle) * r * 0.18 + hover * 0.05);
        ctx.quadraticCurveTo(
            Math.cos(angle) * r * 0.55,
            Math.sin(angle) * r * 0.55 + hover * 0.04 + Math.sin(time * 1.6 + i) * 5,
            Math.cos(angle) * r * 0.88,
            Math.sin(angle) * r * 0.88 + hover * 0.05
        );
        ctx.stroke();
    }
    ctx.restore();

    // Luminous sap veins
    ctx.save();
    ctx.strokeStyle = boss.isHealing ? 'rgba(74, 222, 128, 0.75)' : 'rgba(34, 197, 94, 0.55)';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const baseAngle = (i / 4) * Math.PI * 2 + time * 0.35;
        ctx.beginPath();
        ctx.moveTo(Math.cos(baseAngle) * r * 0.1, Math.sin(baseAngle) * r * 0.1 + hover * 0.05);
        ctx.quadraticCurveTo(
            Math.cos(baseAngle + 0.4) * r * 0.45,
            Math.sin(baseAngle + 0.4) * r * 0.45 + hover * 0.07,
            Math.cos(baseAngle + 0.2) * r * 0.75,
            Math.sin(baseAngle + 0.2) * r * 0.75 + hover * 0.05
        );
        ctx.stroke();
    }
    ctx.restore();

    // Heartwood core
    const coreColor = boss.isHealing ? '#4ade80' : '#22c55e';
    const pulse = 0.85 + 0.18 * Math.sin(time * 4.5);
    ctx.save();
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = boss.isHealing ? 26 : 16;
    ctx.beginPath();
    ctx.arc(0, hover * 0.05, r * 0.36 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Protective bark ring
    ctx.save();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 3.1;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = time * -12;
    ctx.beginPath();
    ctx.arc(0, hover * 0.05, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Mushroom ring accents
    ctx.save();
    const mushroomColors = ['#f97316', '#fb923c'];
    for (let i = 0; i < 8; i++) {
        const angle = time * 0.5 + (i / 8) * Math.PI * 2;
        const radius = r * 1.05;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + hover * 0.08;
        ctx.fillStyle = mushroomColors[i % mushroomColors.length];
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.18, r * 0.1, angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(x, y - r * 0.02, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Leaf halos
    ctx.save();
    const leafBands = [1.3, 1.6];
    for (let band = 0; band < leafBands.length; band++) {
        const radius = r * leafBands[band];
        const sizeMul = band === 0 ? 0.22 : 0.3;
        const speed = band === 0 ? 0.45 : -0.4;
        const color = band === 0 ? '#22c55e' : '#16a34a';
        for (let i = 0; i < 16; i++) {
            const angle = time * speed + (i / 16) * Math.PI * 2;
            ctx.save();
            ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius + hover * 0.12 * (band + 1));
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * sizeMul, r * sizeMul * 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    ctx.restore();

    // Floating spores
    ctx.save();
    ctx.fillStyle = 'rgba(187, 247, 208, 0.8)';
    for (let i = 0; i < 12; i++) {
        const angle = time * 0.45 + (i / 12) * Math.PI * 2;
        const radius = r * 1.55 + Math.sin(time * 1.6 + i) * 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + hover * 0.25;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 3 + i);
        ctx.beginPath();
        ctx.arc(x, y, 2.7, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.restore();
}

export function drawBossWeapon(ctx, boss) {
    switch(boss.bossType) {
        case 'slime':
            break;
        case 'wolf':
            drawWolfClaws(ctx, boss);
            break;
        case 'golem':
            drawGolemFists(ctx, boss);
            break;
        case 'witch':
            drawWitchStaff(ctx, boss);
            break;
        case 'treant':
            drawTreantBranches(ctx, boss);
            break;
        default:
            drawTechCannon(ctx, boss);
            break;
    }
}

function drawWolfClaws(ctx, boss) {
    ctx.fillStyle = '#c4b5fd';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(boss.r - 5, -8);
    ctx.lineTo(boss.r + 15, -12);
    ctx.lineTo(boss.r + 20, -4);
    ctx.lineTo(boss.r + 15, 4);
    ctx.lineTo(boss.r + 10, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(boss.r - 5, 8);
    ctx.lineTo(boss.r + 15, 12);
    ctx.lineTo(boss.r + 20, 4);
    ctx.lineTo(boss.r + 15, -4);
    ctx.lineTo(boss.r + 10, -8);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
}

function drawGolemFists(ctx, boss) {
    // This function is now integrated into drawGolemBody and can be removed or left empty.
}

function drawWitchStaff(ctx, boss) {
    const time = performance.now() * 0.002;
    const hoverX = Math.cos(time) * 5;
    const hoverY = Math.sin(time * 1.5) * 5;
    const orbX = boss.r + 15 + hoverX;
    const orbY = hoverY;

    // Main orb
    const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 10);
    orbGradient.addColorStop(0, '#ddd6fe');
    orbGradient.addColorStop(0.5, '#a855f7');
    orbGradient.addColorStop(1, '#6d28d9');
    ctx.fillStyle = orbGradient;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawTreantBranches(ctx, boss) {
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 3;
    ctx.shadowColor = boss.isHealing ? '#22c55e' : '#166534';
    ctx.shadowBlur = boss.isHealing ? 10 : 5;

    ctx.beginPath();
    ctx.moveTo(boss.r - 5, 0);
    ctx.lineTo(boss.r + 20, -5);
    ctx.lineTo(boss.r + 25, 0);
    ctx.lineTo(boss.r + 20, 5);
    ctx.stroke();

    ctx.fillStyle = boss.isHealing ? '#4ade80' : '#22c55e';
    for(let i = 0; i < 4; i++) {
        const angle = (i * Math.PI / 2) + (performance.now() * 0.002);
        const x = boss.r + 22 + Math.cos(angle) * 8;
        const y = Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

function drawTechCannon(ctx, boss) {
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;

    const barrelGradient = ctx.createLinearGradient(-10, -10, 40, 10);
    barrelGradient.addColorStop(0, '#374151');
    barrelGradient.addColorStop(0.5, '#1f2937');
    barrelGradient.addColorStop(1, '#111827');
    ctx.fillStyle = barrelGradient;
    roundRect(ctx, -10, -10, 50, 20, 4, true, false);

    ctx.fillStyle = '#6b7280';
    for(let i = 0; i < 3; i++) {
        ctx.fillRect(-5 + i * 15, -8, 2, 16);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 15;
    roundRect(ctx, 35, -6, 12, 12, 2, true, false);

    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(41, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    roundRect(ctx, -10, -10, 50, 20, 4, false, true);
}