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
    const hover = Math.sin(time * 2) * 3;

    // Draw robe
    const robeGradient = ctx.createLinearGradient(0, -r, 0, r);
    robeGradient.addColorStop(0, '#4c1d95');
    robeGradient.addColorStop(0.5, '#3730a3');
    robeGradient.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = robeGradient;
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.2 + hover); // Hood tip
    ctx.bezierCurveTo(-r * 1.5, -r * 0.5 + hover, -r * 1.2, r * 1.2 + hover, 0, r * 1.4 + hover);
    ctx.bezierCurveTo(r * 1.2, r * 1.2 + hover, r * 1.5, -r * 0.5 + hover, 0, -r * 1.2 + hover);
    ctx.closePath();
    ctx.fill();

    // Draw hood opening (shadow)
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.3 + hover, r * 0.6, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw glowing eyes
    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;
    const eyeY = -r * 0.3 + hover;
    ctx.beginPath();
    ctx.arc(-r * 0.2, eyeY, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.2, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Floating runes
    ctx.font = '12px "Times New Roman"';
    ctx.fillStyle = 'rgba(192, 132, 252, 0.7)';
    const runes = ['✧', '✦', '⬩', '⬨'];
    for (let i = 0; i < runes.length; i++) {
        const angle = time * 0.5 + (i / runes.length) * Math.PI * 2;
        const radius = r * 1.4 + Math.sin(time * 2 + i) * 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + hover;
        ctx.fillText(runes[i], x, y);
    }
}

function drawTreantBody(ctx, boss) {
    const time = performance.now() * 0.001;
    const r = boss.r;
    const hover = Math.sin(time * 1.5) * 2;

    // Main trunk
    const trunkGradient = ctx.createLinearGradient(0, -r, 0, r * 1.5);
    trunkGradient.addColorStop(0, '#5f4339'); // Dark brown top
    trunkGradient.addColorStop(0.5, '#8c6d53'); // Lighter brown middle
    trunkGradient.addColorStop(1, '#4a3f35'); // Dark root color
    ctx.fillStyle = trunkGradient;
    
    ctx.beginPath();
    ctx.moveTo(0, r * 1.5 + hover);
    ctx.bezierCurveTo(-r * 1.2, r + hover, -r, -r * 0.5 + hover, 0, -r * 1.2 + hover);
    ctx.bezierCurveTo(r, -r * 0.5 + hover, r * 1.2, r + hover, 0, r * 1.5 + hover);
    ctx.closePath();
    ctx.fill();

    // Bark texture
    ctx.strokeStyle = 'rgba(40, 30, 20, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * r - r/2, -r);
        ctx.bezierCurveTo(
            Math.random() * r - r/2, -r/2,
            Math.random() * r - r/2, r/2,
            Math.random() * r - r/2, r * 1.2
        );
        ctx.stroke();
    }

    // Glowing core (eye)
    const coreColor = boss.isHealing ? '#4ade80' : '#22c55e';
    ctx.save();
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = boss.isHealing ? 20 : 10;
    ctx.beginPath();
    ctx.arc(0, hover, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Leafy crown
    const leafColors = ['#16a34a', '#22c55e', '#4ade80'];
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const sway = Math.sin(time * 2 + i) * 0.2;
        const leafAngle = angle + sway;
        const leafDist = r * 0.8 + Math.cos(time + i) * 5;
        
        ctx.save();
        ctx.fillStyle = leafColors[i % 3];
        ctx.translate(Math.cos(leafAngle) * leafDist, Math.sin(leafAngle) * leafDist - r * 0.5 + hover);
        ctx.rotate(leafAngle + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawNormalBossBody(ctx, boss) {
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;

    const gradient = ctx.createLinearGradient(-boss.r, -boss.r, boss.r, boss.r);
    gradient.addColorStop(0, '#dc2626');
    gradient.addColorStop(0.3, '#b91c1c');
    gradient.addColorStop(0.7, '#991b1b');
    gradient.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = gradient;
    roundRect(ctx, -boss.r, -boss.r, boss.r*2, boss.r*2, 12, true, false);

    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;

    for(let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-boss.r + 10, i * boss.r/3);
        ctx.lineTo(boss.r - 10, i * boss.r/3);
        ctx.stroke();
    }
    for(let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * boss.r/3, -boss.r + 10);
        ctx.lineTo(i * boss.r/3, boss.r - 10);
        ctx.stroke();
    }

    ctx.fillStyle = '#fca5a5';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    roundRect(ctx, -boss.r, -boss.r, boss.r*2, boss.r*2, 12, false, true);
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