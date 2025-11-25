import Tank from './Tank.js';
import Bullet from './Bullet.js';
import { styleBulletForOwner, showStatus } from '../systems/effects.js';
import { flashMsg, dist } from '../main.js';
import { W, H } from '../canvas.js';
import { p1, p2, tanks, bullets, gameMode, devGodMode } from '../state.js';
import { bossMode, reapplyPermanentBuffs } from '../game/bossMode.js';
import { drawBossBody, drawBossWeapon } from '../game/bossDesigns.js';
import { updateBossAI } from '../game/bossAI.js';
import { roundRect } from '../utils.js';

export default class Boss extends Tank {
    constructor(x,y,type='normal'){
        super(x,y,'#800',{}); 
        this.isBoss = true;
        this.bossType = type;
        this.setupBossStats();
        this.r = 32; // Boss x2 tank thường, dễ trúng đạn
        this.reload = 3000; // 1 viên mỗi 3 giây (tốc bắn Phase 1)

        this.lastShot = 0;
        this.bossSkillCooldown = 10000;
        this.baseRadius = this.r;
        this.baseMoveSpeed = this.moveSpeed;
        this.baseFriction = this.friction;

        // Boss-specific properties
        this.skillCooldowns = {};
        this.hasSplit = false; // For slime boss
        this.debuffTimer = 0; // For wolf boss
        this.damageReduction = 1; // For Golem defense
        this.isDefending = false; // For Golem
        this.isHealing = false; // For Treant visual
        this.activePuddles = []; // Shared for slime puddle effects
        this.pendingPuddleId = 0;
        this.shardBurstState = null;
        this.miniSlimeLinks = null; // Track adaptive split minis
        this.pendingJumpImpact = null;
        this.isSplitForm = false;
        this.splitMergeTimer = 0;
        this.invulnerable = false;
        this.isCorruptedPhase = false;
        this.corruptedSkillState = {};
        this.environmentSpeedMultiplier = 1;

        // Animation properties
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumpStartPos = {x: 0, y: 0};
        this.jumpTargetPos = {x: 0, y: 0};
        this.jumpDuration = 1200; // Jump wind-up 1.2s

        this.skillTimer = 0; // Timer for normal boss teleport

        this.canPhase = true; // Cho phép boss đi xuyên vật thể
        this.bulletSpeedMultiplier = 1;
    }
    
    setupBossStats() {
        const now = performance.now();
        switch(this.bossType) {
            case 'slime':
                this.hp = 30;
                this.maxHp = 30;
                this.damage = 0.25;
                this.color = '#4a9';
                this.moveSpeed = 0.04;
                this.bulletSpeedMultiplier = 0.75;
                this.jumpDuration = 1200;
                this.skillCooldowns = {jump: now - 3000, shard: now - 10000}; // Ready skills immediately
                this.isCorruptedPhase = false;
                break;
            case 'wolf':
                this.hp = 16;
                this.maxHp = 16;
                this.damage = 1;
                this.color = '#333';
                this.moveSpeed = 0.06;
                this.skillCooldowns = {dash: now - 4000, howl: now - 6000}; // Ready immediately
                break;
            case 'golem':
                this.hp = 25;
                this.maxHp = 25;
                this.damage = 1.5;
                this.color = '#78716c';
                this.moveSpeed = 0.035;
                this.reload = 3500;
                this.skillCooldowns = {
                    groundSlam: now - 5000,
                    defense: now - 10000
                };
                break;
            case 'witch':
                this.hp = 22;
                this.maxHp = 22;
                this.damage = 1;
                this.color = '#7c3aed';
                this.moveSpeed = 0.05;
                this.reload = 2800;
                this.skillCooldowns = {
                    darkOrbs: now - 4000,
                    teleport: now - 6000
                };
                break;
            case 'treant':
                this.hp = 30;
                this.maxHp = 30;
                this.damage = 1.5;
                this.color = '#16a34a';
                this.moveSpeed = 0.04;
                this.reload = 3200;
                this.skillCooldowns = {
                    thorns: now - 5000,
                    heal: now - 8000,
                    roots: now - 12000
                };
                break;
            default: // fallback for higher floors
                this.hp = 30 + (Math.floor(Math.random() * 10));
                this.maxHp = this.hp;
                this.damage = 1;
                this.color = '#800';
                this.moveSpeed = 0; // Normal boss only teleports
                this.skillCooldowns = {};
                break;
        }
        // Log the final move speed for debugging
        console.log(`[Boss Setup] Boss type: ${this.bossType}, Final moveSpeed: ${this.moveSpeed}`);
    }
    
    reset() {
        console.log(`[Boss Reset] Resetting state for boss type: ${this.bossType}`);
        this.hp = this.maxHp;
        this.x = W / 2;
        this.y = H / 2;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
        this.angle = 0;
        
        // Reset skill-specific properties
        this.hasSplit = false;
        this.shardBurstState = null;
        this.pendingJumpImpact = null;
        this.miniSlimeLinks = null;
        this.isDefending = false;
        this.damageReduction = 1;
        this.isHealing = false;
        this.invulnerable = false;
        this.isJumping = false;
        this.isSplitForm = false;
        this.splitMergeTimer = 0;
        this.renderAlpha = 1;
        this.setupBossStats(); // This will correctly reset skill cooldowns
    }
    
    draw(ctx){
        // Modern Boss Design
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle);

        // Call drawing functions from the new module
        drawBossBody(ctx, this);
        drawBossWeapon(ctx, this);

        ctx.restore();

        // Status visuals
        ctx.save();
        if (this.isBurning) {
            const time = performance.now() * 0.02;
            const pulse = 1 + Math.sin(time) * 0.1;
            ctx.strokeStyle = 'rgba(255, 111, 0, 0.85)';
            ctx.lineWidth = 5;
            ctx.shadowColor = 'rgba(255, 80, 0, 0.7)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 14 * pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + time;
                const sparkX = this.x + Math.cos(angle) * (this.r + 10 + Math.sin(time + i) * 4);
                const sparkY = this.y + Math.sin(angle) * (this.r + 10 + Math.sin(time + i) * 4);
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 184, 108, 0.9)' : 'rgba(255, 140, 64, 0.9)';
                ctx.beginPath();
                ctx.arc(sparkX, sparkY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (this.isIceSlowed) {
            const time = performance.now() * 0.015;
            const shimmer = 1 + Math.sin(time * 2) * 0.05;
            const gradient = ctx.createRadialGradient(this.x, this.y, this.r, this.x, this.y, this.r + 24 * shimmer);
            gradient.addColorStop(0, 'rgba(99, 179, 237, 0.15)');
            gradient.addColorStop(1, 'rgba(191, 219, 254, 0.65)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 22 * shimmer, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(191, 219, 254, 0.8)';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();

        // Ultra Modern Boss Health Bar
        this.drawModernHealthBar(ctx);
    }
    
    drawModernHealthBar(ctx) {
        const barW = 600, barH = 22;
        const x = (W - barW) / 2, y = 34; // Đẩy lên cao hơn một chút
        const hpPerc = this.hp / this.maxHp;
        const time = performance.now() * 0.002;

    // Get boss colors
    let primaryColor, secondaryColor, accentColor, bossName, bossIcon;
    switch(this.bossType) {
        case 'slime':
            primaryColor = '#4ade80'; secondaryColor = '#22c55e'; accentColor = '#16a34a';
            bossName = 'Slime Chúa'; bossIcon = '🟢'; 
            break;
        case 'wolf':
            primaryColor = '#6366f1'; secondaryColor = '#4338ca'; accentColor = '#3730a3';
            bossName = 'Sói Đêm'; bossIcon = '🐺'; 
            break;
        case 'golem':
            primaryColor = '#78716c'; secondaryColor = '#57534e'; accentColor = '#44403c';
            bossName = 'Golem Đá'; bossIcon = '🗿';
            break;
        case 'witch':
            primaryColor = '#7c3aed'; secondaryColor = '#6d28d9'; accentColor = '#4c1d95';
            bossName = 'Phù Thủy'; bossIcon = '🔮';
            break;
        case 'treant':
            primaryColor = '#16a34a'; secondaryColor = '#15803d'; accentColor = '#14532d';
            bossName = 'Treant'; bossIcon = '🌳';
            break;
        default:
            primaryColor = '#ef4444'; secondaryColor = '#dc2626'; accentColor = '#b91c1c';
            bossName = `THỐNG SOÁI TẦNG ${bossMode.currentFloor || 1}`; bossIcon = '👹';
            break;
    }
    
    ctx.save();
    ctx.globalAlpha = 0.82;

    // Outer glow container - soft neon
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18;

    // Background container with glass effect (modern dark glass)
    const bgGradient = ctx.createLinearGradient(x, y - 6, x, y + barH + 6);
    bgGradient.addColorStop(0, 'rgba(10, 20, 40, 0.55)');
    bgGradient.addColorStop(0.5, 'rgba(6, 13, 28, 0.7)');
    bgGradient.addColorStop(1, 'rgba(10, 20, 40, 0.55)');
    ctx.fillStyle = bgGradient;
    roundRect(ctx, x - 5, y - 5, barW + 10, barH + 10, 18, true, false);

    ctx.shadowBlur = 0;

    // Inner background (sleek gradient)
    const innerBg = ctx.createLinearGradient(x, y, x, y + barH);
    innerBg.addColorStop(0, 'rgba(24, 37, 63, 0.6)');
    innerBg.addColorStop(0.5, 'rgba(15, 23, 42, 0.72)');
    innerBg.addColorStop(1, 'rgba(24, 37, 63, 0.6)');
    ctx.fillStyle = innerBg;
    roundRect(ctx, x, y, barW, barH, 12, true, false);

    // Top highlight line
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.lineTo(x + barW - 8, y + 4);
    ctx.stroke();
    ctx.restore();

    // HP fill with animated gradient
    if (hpPerc > 0) {
        const hpGradient = ctx.createLinearGradient(x, y, x + barW * hpPerc, y);
        hpGradient.addColorStop(0, `${primaryColor}c4`);
        hpGradient.addColorStop(0.35, `${secondaryColor}a8`);
        hpGradient.addColorStop(0.75, `${primaryColor}c4`);
        hpGradient.addColorStop(1, `${accentColor}a8`);

        ctx.fillStyle = hpGradient;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        roundRect(ctx, x + 2, y + 2, (barW - 4) * hpPerc, barH - 4, 9, true, false);

        // Animated shine effect
        const shinePos = (Math.sin(time) + 1) * 0.5;
        const shineGradient = ctx.createLinearGradient(
            x + (barW * hpPerc * shinePos) - 30, y,
            x + (barW * hpPerc * shinePos) + 30, y
        );
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = shineGradient;
        roundRect(ctx, x + 2, y + 2, (barW - 4) * hpPerc, barH - 4, 9, true, false);

        ctx.shadowBlur = 0;
    }

    // Segmented HP indicators
    const segments = this.maxHp;
    const segmentWidth = (barW - 4) / segments;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 1; i < segments; i++) {
        const segX = x + 2 + (segmentWidth * i);
        ctx.beginPath();
        ctx.moveTo(segX, y + 2);
        ctx.lineTo(segX, y + barH - 2);
        ctx.stroke();
    }

    // Border with animated glow (sleek)
    const borderGradient = ctx.createLinearGradient(x, y, x + barW, y);
    const glowIntensity = (Math.sin(time * 2) + 1) * 0.22 + 0.3;
    borderGradient.addColorStop(0, `rgba(251, 191, 36, ${glowIntensity})`);
    borderGradient.addColorStop(0.5, `rgba(245, 158, 11, ${glowIntensity + 0.12})`);
    borderGradient.addColorStop(1, `rgba(251, 191, 36, ${glowIntensity})`);

    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 10;
    roundRect(ctx, x, y, barW, barH, 11, false, true);
    ctx.shadowBlur = 0;

    // Accent bars on sides
    ctx.save();
    ctx.globalAlpha = 0.9;
    const accentGradient = ctx.createLinearGradient(x, y, x + 24, y + barH);
    accentGradient.addColorStop(0, `${primaryColor}aa`);
    accentGradient.addColorStop(1, `${accentColor}55`);
    ctx.fillStyle = accentGradient;
    roundRect(ctx, x - 10, y + 2, 12, barH - 4, 6, true, false);

    const accentGradientRight = ctx.createLinearGradient(x + barW - 24, y, x + barW, y + barH);
    accentGradientRight.addColorStop(0, `${primaryColor}55`);
    accentGradientRight.addColorStop(1, `${accentColor}aa`);
    ctx.fillStyle = accentGradientRight;
    roundRect(ctx, x + barW - 2, y + 2, 12, barH - 4, 6, true, false);
    ctx.restore();

    ctx.restore();

    // Boss name - modern typography
    const nameY = y - 18;
    const nameGradient = ctx.createLinearGradient(x, nameY, x + barW, nameY);
    nameGradient.addColorStop(0, '#f87171');
    nameGradient.addColorStop(0.5, '#ef4444');
    nameGradient.addColorStop(1, '#fb7185');

    const displayName = `${bossIcon} ${bossName} ${bossIcon}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 16px "Segoe UI", "Poppins", sans-serif';
    ctx.fillStyle = nameGradient;

    // Soft shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 1;

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeText(displayName, x + barW / 2, nameY);
    ctx.fillText(displayName, x + barW / 2, nameY);

    // Underline accent
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.save();
    ctx.globalAlpha = 0.45;
    const underlineWidth = ctx.measureText(displayName).width * 0.55;
    const underlineX = x + barW / 2 - underlineWidth / 2;
    ctx.fillStyle = nameGradient;
    roundRect(ctx, underlineX, nameY + 10, underlineWidth, 3, 2, true, false);
    ctx.restore();
    
    // HP text with modern styling
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 2;
    
    const hpText = `${this.hp.toFixed(1)} / ${this.maxHp.toFixed(1)}`;
    ctx.strokeText(hpText, x + barW/2, y + barH/2);
    ctx.fillText(hpText, x + barW/2, y + barH/2);
    
    // HP percentage on the right
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'right';
    const percText = `${Math.round(hpPerc * 100)}%`;
    ctx.strokeText(percText, x + barW - 12, y + barH/2);
    ctx.fillText(percText, x + barW - 12, y + barH/2);
    
    // Critical HP warning effect
    if (hpPerc <= 0.25) {
        const warningAlpha = (Math.sin(time * 8) + 1) * 0.3 + 0.2;
        ctx.fillStyle = `rgba(239, 68, 68, ${warningAlpha})`;
        roundRect(ctx, x, y, barW, barH, 12, true, false);
        
        // Warning text
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('⚠ CRITICAL', x + 12, y + barH + 12);
    }
}

    shoot(now){
    // Boss không bị giới hạn ammo - bắn vô hạn
    this.lastShot=now;
    const offset=this.r + 12; // offset x2 vì boss to x2
    const bx=this.x + Math.cos(this.angle)*offset;
    const by=this.y + Math.sin(this.angle)*offset;

    const bullet = new Bullet(bx,by,this.angle,this);
    styleBulletForOwner(bullet, this);
    // Boss đạn phải to hơn: đảm bảo bán kính tối thiểu lớn
    const desiredRadius = Math.max(10, Math.round(this.r * 0.35));
    if (!bullet.r || bullet.r < desiredRadius) {
        bullet.r = desiredRadius;
    }
    bullet.bossVisual = this.bossType || 'default';

    const safeDist = this.r + bullet.r + 1;
    bullet.x = this.x + Math.cos(this.angle) * safeDist;
    bullet.y = this.y + Math.sin(this.angle) * safeDist;

    return bullet;
}

update(dt){
    // Call the centralized AI update function
    updateBossAI(this, dt);
        updateBossAI(this, dt);
    }
}