import { W, H } from '../canvas.js';
import { p1, p2, tanks, bullets, devGodMode, gameMode } from '../state.js';
import { dist, flashMsg } from '../main.js';
import { addExplosion } from '../rendering/animations.js';
import { reapplyPermanentBuffs } from './bossMode.js';
import { showStatus } from '../systems/effects.js';
import Bullet from '../classes/Bullet.js';

export function jumpAttack(boss, target) {
    if (boss.isJumping) return;
    boss.isJumping = true;
    boss.jumpStartTime = performance.now();
    boss.jumpStartPos = {x: boss.x, y: boss.y};
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const jumpDistance = 100;
    boss.jumpTargetPos = {
        x: boss.x + Math.cos(angle) * jumpDistance,
        y: boss.y + Math.sin(angle) * jumpDistance
    };
    boss.jumpTargetPos.x = Math.max(boss.r + 10, Math.min(W - boss.r - 10, boss.jumpTargetPos.x));
    boss.jumpTargetPos.y = Math.max(boss.r + 10, Math.min(H - boss.r - 10, boss.jumpTargetPos.y));
    flashMsg('🟢 Slime chuẩn bị nhảy ép!');
}

export function splitSlime(boss) {
    // Add a visual effect for splitting
    addExplosion({
        x: boss.x, y: boss.y,
        radius: boss.r * 5, // Make the shockwave much larger
        duration: 600,
        color: '#a16207', // Brown color for shockwave
        isWave: true
    });

    for (let i = 0; i < 2; i++) {
        const angle = (Math.PI * 2 * i) / 2;
        const distance = 50;
        const x = boss.x + Math.cos(angle) * distance;
        const y = boss.y + Math.sin(angle) * distance;
        const miniSlime = new (tanks[0].constructor)(x, y, '#4a9', {});
        miniSlime.hp = 3;
        miniSlime.maxHp = 3;
        miniSlime.r = 20;
        miniSlime.damage = 1;
        miniSlime.isMiniSlime = true;
        miniSlime.reload = 2000;
        miniSlime.lastShot = 0;
        miniSlime.maxAmmo = 3; // Give them ammo
        miniSlime.ammo = 3;
        miniSlime.reloadRate = 1 / 60; // Allow them to reload ammo
        miniSlime.moveSpeed = boss.moveSpeed * 0.8; // A bit slower than parent
        miniSlime.chaosMoveTimer = 0; // Timer for random movement
        miniSlime.chaosMoveAngle = Math.random() * Math.PI * 2;
        tanks.push(miniSlime);
    }
    flashMsg('Slime phân tách!');
}

export function dashAttack(boss, target) {
    const startX = boss.x, startY = boss.y;
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const dashDistance = 120;

    for (let i = 0; i < 8; i++) {
        const trailX = startX + (Math.cos(angle) * dashDistance * i / 8);
        const trailY = startY + (Math.sin(angle) * dashDistance * i / 8);
        addExplosion({
            x: trailX, y: trailY,
            startTime: performance.now() + i * 50,
            duration: 300,
            color: '#6366f1',
            radius: 20 - i * 2
        });
    }

    boss.x += Math.cos(angle) * dashDistance;
    boss.y += Math.sin(angle) * dashDistance;
    boss.x = Math.max(boss.r + 10, Math.min(W - boss.r - 10, boss.x));
    boss.y = Math.max(boss.r + 10, Math.min(H - boss.r - 10, boss.y));

    if (dist(boss, target) < boss.r + target.r + 15) {
        const skipDamage = devGodMode && (target === p1 || target === p2);
        if (!skipDamage) {
            target.hp -= 2;
            showStatus(target, '-2 HP', '#ef4444', 1500);
        }
        flashMsg('⚡ Sói lao tới trúng mục tiêu!');
        addExplosion({
            x: boss.x, y: boss.y,
            startTime: performance.now(),
            duration: 400,
            color: '#6366f1',
            radius: 50
        });
    } else {
        flashMsg('🐺 Sói dash!');
    }
}

export function howlAttack(boss) {
    for (let i = 0; i < 5; i++) {
        addExplosion({
            x: boss.x, y: boss.y,
            startTime: performance.now() + i * 100,
            duration: 800,
            color: '#1e1b4b',
            radius: 30 + i * 20,
            isWave: true
        });
    }

    [p1, p2].forEach(player => {
        if (player && player.hp > 0) {
            player.moveSpeed *= 0.3;
            showStatus(player, 'Chậm lại mạnh!', '#6366f1', 2000);
            setTimeout(() => {
                if (gameMode === 'vsboss') {
                    reapplyPermanentBuffs();
                } else {
                    player.moveSpeed = player.baseMoveSpeed;
                }
            }, 2000);
        }
    });
    flashMsg('🌑 Sói gầm đêm - Tốc độ giảm!');
}

export function groundSlamAttack(boss, target, now) {
    for (let i = 0; i < 3; i++) {
        addExplosion({
            x: boss.x, y: boss.y,
            startTime: now + i * 150,
            duration: 600,
            color: '#78716c',
            radius: 60 + i * 40, // Make the visual effect larger
            isWave: true
        });
    }

    [p1, p2].forEach(player => {
        if (player && player.hp > 0) { // Affects all players on the map
            const skipDamage = devGodMode && (player === p1 || player === p2);

            // Apply stun effect regardless of god mode
            console.log(`[Stun] Applying stun to ${player === p1 ? 'P1' : 'P2'}`);
            player.stunned = true;
            player.speed = 0;
            setTimeout(() => {
                if(player) player.stunned = false;
                console.log(`[Stun] Removing stun from ${player === p1 ? 'P1' : 'P2'}`);
            }, 1000); // Stun for 1 second
            showStatus(player, '⚡ CHOÁNG!', '#fbbf24', 1000); // Show status for 1 second

            // Apply damage only if not in god mode
            if (!skipDamage) {
                player.hp = Math.max(0, player.hp - 3);
                showStatus(player, '-3 HP', '#ef4444', 1500);
                for (let j = 0; j < 3; j++) {
                    addExplosion({
                        x: player.x, y: player.y,
                        startTime: now + j * 200,
                        duration: 600,
                        color: '#fbbf24',
                        radius: 15 + j * 5,
                        isWave: true
                    });
                }
            }
        }
    });
    flashMsg('🗿 Golem đấm đất - Choáng toàn bản đồ 1s!');
}

export function stoneDefenseAttack(boss, now) {
    boss.isDefending = true;
    boss.damageReduction = 0.5;
    for (let i = 0; i < 4; i++) {
        addExplosion({
            x: boss.x, y: boss.y,
            startTime: now + i * 200,
            duration: 800,
            color: '#fbbf24',
            radius: 35 + i * 15,
            isWave: true
        });
    }
    setTimeout(() => { boss.isDefending = false; boss.damageReduction = 1; }, 4000);
    flashMsg('🛡️ Golem phòng thủ đá - Giảm sát thương!');
}

export function darkOrbsAttack(boss, now) {
    for(let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const bullet = new Bullet(boss.x, boss.y, angle, boss);
        bullet.damage = 2;
        bullet.color = '#4c1d95';
        bullet.r = 8;
        bullet.glow = true;
        bullet.glowColor = '#7c3aed';
        bullet.shape = 'orb';
        bullets.push(bullet);
    }
    addExplosion({ x: boss.x, y: boss.y, startTime: now, duration: 400, color: '#7c3aed', radius: 50 });
    flashMsg('🔮 Phù thủy bắn cầu bóng tối!');
}

export function teleportAttack(boss, now) {
    addExplosion({ x: boss.x, y: boss.y, startTime: now, duration: 500, color: '#a855f7', radius: 60 });
    boss.x = 60 + Math.random() * (W - 120);
    boss.y = 60 + Math.random() * (H - 120);
    addExplosion({ x: boss.x, y: boss.y, startTime: now + 200, duration: 500, color: '#c084fc', radius: 60 });
    flashMsg('✨ Phù thủy dịch chuyển!');
}

export function thornsAttack(boss, target, now) {
    const angle = Math.atan2(target.y - boss.y, target.x - boss.x);
    const thornCount = 5;
    const spacing = 40;
    for(let i = 1; i <= thornCount; i++) {
        const thornX = boss.x + Math.cos(angle) * spacing * i;
        const thornY = boss.y + Math.sin(angle) * spacing * i;
        addExplosion({ x: thornX, y: thornY, startTime: now + i * 100, duration: 800, color: '#16a34a', radius: 25 });
        [p1, p2].forEach(player => {
            if (player && player.hp > 0 && Math.hypot(player.x - thornX, player.y - thornY) <= 30) {
                const skipDamage = devGodMode && (player === p1 || player === p2);
                if (!skipDamage) {
                    player.hp = Math.max(0, player.hp - 3);
                    showStatus(player, '-3 HP', '#ef4444', 1500);
                }
            }
        });
    }
    flashMsg('🌿 Người cây tạo gai đâm!');
}

export function healAttack(boss, now) {
    const healAmount = 3;
    boss.hp = Math.min(boss.maxHp, boss.hp + healAmount);
    boss.isHealing = true;
    for (let i = 0; i < 4; i++) {
        addExplosion({ x: boss.x, y: boss.y, startTime: now + i * 150, duration: 600, color: '#22c55e', radius: 30 + i * 10, isWave: true });
    }
    showStatus(boss, `+${healAmount} HP`, '#22c55e', 2000);
    setTimeout(() => { boss.isHealing = false; }, 2000);
    flashMsg('💚 Người cây hồi phục!');
}

export function rootsAttack(boss, target, now) {
    [p1, p2].forEach(player => {
        if (player && player.hp > 0 && dist(boss, player) <= 250) {
            player.rooted = true;
            showStatus(player, 'Bị trói!', '#16a34a', 2000);
            for (let j = 0; j < 3; j++) {
                addExplosion({ x: player.x, y: player.y, startTime: now + j * 100, duration: 700, color: '#15803d', radius: 20 + j * 8, isWave: true });
            }
            setTimeout(() => { player.rooted = false; }, 2000);
        }
    });
    flashMsg('🌱 Người cây triệu hồi rễ cây!');
}