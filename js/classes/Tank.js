import { BUFF_COLORS } from '../constants.js';
import { clamp, roundRect, drawEffectRing, drawChainAround } from '../utils.js';
import { obstacles } from '../game/obstacles.js';
import Bullet from './Bullet.js';
import { styleBulletForOwner, showStatus } from '../systems/effects.js';
import { circleRectColl } from '../game/collision.js';
import { W, H } from '../canvas.js';
import { updateTankPhysics } from '../game/physics.js';
import { devNoWalls, devGodMode, p1, p2, gameMode } from '../state.js';

export default
class Tank{
    constructor(x,y,color,controls){
        this.x=x; this.y=y; this.r=16; this.angle=0; this.speed=0;
        this.vx = 0; this.vy = 0; this.color=color; this.controls={...(controls||{})};
        this.turnSpeed=0.06; this.moveSpeed=0.5; this.friction=0.93;
        this.hp=3; this.maxHp=3; this.lastShot=0; this.reload=320;
        this.maxAmmo=3; this.ammo=this.maxAmmo; this.reloadRate=1/60; this.reloadCooldown=0;
        this.invisible=false; this.shield=false;
        this.isClone = false; // mặc định false, tank chính
        this.homing=false; this.bigBullet=false; this.ricochet=false;
        this.shotgun=false; this.explosive=false; this.rooted=false;
        this.silenced=false;
        this.pierce=false; this.poisonBullet=false;
        this.possession=false; this.trailBullet=false;
        this.fireRate=false; this.fury=false;
        this.focusMode = false;
        this.possessionBulletCount=0;
        this.activeEffects = {};
        this.baseMoveSpeed = this.moveSpeed;
        this.baseFriction = this.friction;
        this.baseReloadRate = this.reloadRate;
        this.baseReload = this.reload;
        this.baseTurnSpeed = this.turnSpeed;
        this.baseRadius = this.r;
        this.baseControls = {...this.controls};
        this.reloadRate = 0;
        this.reloadCooldown = 0;
        this.effectPhase = 0;
        this.pendingRemoval = false;
        this.fadeOutTimer = 0;
        this.shootHoldTime = 0;
        this.chargeState = 'idle';
        this.wasShootDown = false;
        this.stunned = false;
        this.lastTrailDamageTime = 0;
    }
    // Đây là đoạn code mới
update(dt,input){
    // Ngăn không cho tank đã chết hoạt động
    if (this.hp <= 0) {
        this.speed = 0;
        this.renderAlpha = 0; // Làm cho xe tăng biến mất
        return;
    }
    // DEBUG: Check if stun is being applied
    if (this.stunned) {
        console.log(`[Stun] Tank ${this === p1 ? 'P1' : 'P2'} is stunned. Preventing movement.`);
        this.speed = 0;
        this.vx = 0;
        this.vy = 0;
        return;
    }
    // nếu tank đang bị root thì không được di chuyển (vẫn có thể quay)
    updateTankPhysics(this, dt, input);

    if(this.statusTimer > 0){
        this.statusTimer = Math.max(0, this.statusTimer - dt);
        if(this.statusTimer <= 0){
            this.statusText = null;
        }
    }

    this.displayRadius += (this.r - this.displayRadius) * Math.min(1, dt/140);
    this.effectPhase = (this.effectPhase + dt*0.0025) % (Math.PI*2);

    const invisState = this.activeEffects && this.activeEffects.invis;
    const targetAlpha = this.pendingRemoval ? 0 : (invisState ? 0.15 : 1);
    const alphaLerp = Math.min(1, dt/160);
    this.renderAlpha += (targetAlpha - this.renderAlpha) * alphaLerp;

    if(this.pendingRemoval){
        this.fadeOutTimer = Math.max(0, this.fadeOutTimer - dt);
        if(this.fadeOutTimer <= 0){
            this.hp = 0;
        }
    }

    if(this.activeEffects && this.activeEffects.speed){
        this.speedRingPhase = (this.speedRingPhase + dt*0.015) % (Math.PI*2);
    }

    // Reload ammo chuẩn
    if(this.ammo < this.maxAmmo){
        this.reloadCooldown += this.reloadRate * dt/16;
        while(this.reloadCooldown >= 1){
            this.ammo = Math.min(this.ammo+1, this.maxAmmo);
            this.reloadCooldown -= 1;
        }
    }
}


    draw(ctx){
        if(this.invisible && !this.isClone) {
        return;
    }
        // Special drawing for mini slimes
        if (this.isMiniSlime) {
            this.drawMiniSlime(ctx);
            return;
        }
        
        const radius = this.displayRadius || this.r;
        if(!isFinite(radius) || radius <= 0){
            return;
        }
        // Ensure safe scale calculation
        const safeBaseRadius = this.baseRadius > 0 ? this.baseRadius : 16;
        const safeScale = isFinite(radius) && radius > 0 ? radius / safeBaseRadius : 1;
        const scale = isFinite(safeScale) ? safeScale : 1;
        
        const muzzleWidthScale = this.shotgun ? 1.25 : 1;
        const muzzleLengthScale = this.shotgun ? 1.5 : 1;
        const cornerRadius = Math.max(4, 6 * scale);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, this.renderAlpha));

        // Ensure radius is safe for all calculations
        const safeRadius = isFinite(radius) && radius > 0 ? radius : 16;
        const bodySize = safeRadius * 2;
        
        if(this.isClone){
            ctx.lineWidth = 2.4 * scale;
            ctx.strokeStyle = this.color;
            roundRect(ctx, -safeRadius, -safeRadius, bodySize, bodySize, cornerRadius, false, true);
        } else {
            // Create gradient for tank body
            const bodyGradient = ctx.createRadialGradient(-safeRadius/3, -safeRadius/3, 0, 0, 0, safeRadius);
            bodyGradient.addColorStop(0, this.color);
            bodyGradient.addColorStop(0.7, this.color);
            bodyGradient.addColorStop(1, this.color.replace(/rgb\((\d+),(\d+),(\d+)\)/, (match, r, g, b) => {
                return `rgb(${Math.max(0, r-40)},${Math.max(0, g-40)},${Math.max(0, b-40)})`;
            }));
            
            ctx.fillStyle = bodyGradient;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * scale;
            roundRect(ctx, -safeRadius, -safeRadius, bodySize, bodySize, cornerRadius, true, true);
            
            // Add tank details - tracks
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(-safeRadius + 2, -safeRadius + 2, 4, bodySize - 4);
            ctx.fillRect(safeRadius - 6, -safeRadius + 2, 4, bodySize - 4);
            
            // Add tank hatch
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(-safeRadius/4, -safeRadius/4, safeRadius/3, 0, Math.PI * 2);
            ctx.fill();
            
            // Add highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-safeRadius + 1, -safeRadius + 1, bodySize - 2, bodySize - 2);
        }

        const baseWidth = 20 * scale * muzzleWidthScale;
        const baseHeight = 10 * scale * muzzleWidthScale;
        const baseX = -5 * scale * muzzleWidthScale;
        const baseY = -5 * scale * muzzleWidthScale;
        const barrelStartX = 15 * scale * muzzleWidthScale;
        const barrelWidth = 18 * scale * muzzleWidthScale * muzzleLengthScale;
        const barrelHeight = 6 * scale * muzzleWidthScale;
        const barrelY = -3 * scale * muzzleWidthScale;

        if(this.isClone){
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2 * scale;
            ctx.strokeRect(baseX, baseY, baseWidth, baseHeight);
            ctx.strokeRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
        } else {
            // Turret base with gradient - ensure all values are finite
            const safeBaseX = isFinite(baseX) ? baseX : -5;
            const safeBaseY = isFinite(baseY) ? baseY : -5;
            const safeBaseHeight = isFinite(baseHeight) ? baseHeight : 10;
            const turretGradient = ctx.createLinearGradient(safeBaseX, safeBaseY, safeBaseX, safeBaseY + safeBaseHeight);
            turretGradient.addColorStop(0, '#4a5568');
            turretGradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = turretGradient;
            ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(baseX, baseY, baseWidth, baseHeight);
            
            // Barrel with gradient and details - ensure all values are finite
            const safeBarrelStartX = isFinite(barrelStartX) ? barrelStartX : 15;
            const safeBarrelY = isFinite(barrelY) ? barrelY : -3;
            const safeBarrelHeight = isFinite(barrelHeight) ? barrelHeight : 6;
            const barrelGradient = ctx.createLinearGradient(safeBarrelStartX, safeBarrelY, safeBarrelStartX, safeBarrelY + safeBarrelHeight);
            barrelGradient.addColorStop(0, '#2d3748');
            barrelGradient.addColorStop(0.5, '#1a202c');
            barrelGradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = barrelGradient;
            ctx.fillRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
            
            // Barrel highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(barrelStartX, barrelY, barrelWidth, 1);
            
            // Barrel outline
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
            
            // Muzzle detail
            ctx.fillStyle = '#000';
            ctx.fillRect(barrelStartX + barrelWidth - 2, barrelY + 1, 2, barrelHeight - 2);
        }

        // Fury effect
        if (this.fury) {
            const color = BUFF_COLORS.fury;
            const time = performance.now() * 0.008;
            const pulse = 1 + Math.sin(time) * 0.1;
            
            // Pulsating outer ring
            drawEffectRing(ctx, 0, 0, (radius + 10) * pulse, color, { lineWidth: 3, alpha: 0.8, glow: true });

            // Sharp, fiery spikes
            ctx.save(); // Save before spike drawing
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7 + Math.sin(time * 2) * 0.3;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + time * 0.2;
                ctx.save();
                ctx.rotate(angle);
                ctx.strokeRect(radius + 2, -1, 8 + Math.sin(time * 3 + i) * 4, 2);
                ctx.restore();
            }
            ctx.restore(); // Restore after spike drawing
        }

        // Possession effect
        const possessionState = this.activeEffects && this.activeEffects.possession;
        if(possessionState){
            const color = (possessionState.meta && possessionState.meta.color) || BUFF_COLORS.possession;
            const chaos = Math.sin(this.effectPhase * 6) * 0.5;
            const pulse = 1 + Math.sin(this.effectPhase * 5) * 0.3;
            drawEffectRing(ctx, 0, 0, radius + 12 + pulse + chaos, color, { lineWidth: 3, alpha: 0.85, dash: [4,4], glow: true });
            ctx.save();
            ctx.rotate(this.effectPhase * 2 - this.angle); // Counter-rotate to keep it static-ish
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for(let i = 0; i < 8; i++){
                const ang = (i / 8) * Math.PI * 2;
                const r1 = radius + 8;
                const r2 = radius + 16;
                ctx.beginPath();
                ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
                ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.restore(); // This is the main restore for the tank's transform

        // Burning effect from lava trail
        if (this.isBurning) {
            const time = performance.now() * 0.01;
            ctx.save();
            ctx.globalAlpha = 0.8;
            // No translate needed, draw at absolute position
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + time * 0.5;
                const r = radius + 4 + Math.sin(time + i) * 3;
                const particleX = this.x + Math.cos(angle) * r;
                const particleY = this.y + Math.sin(angle) * r;
                ctx.fillStyle = Math.random() > 0.5 ? '#ff4500' : '#ff8c00';
                ctx.beginPath();
                ctx.arc(particleX, particleY, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Heal pulse
        if(this.healPulseTimer > 0){
            const progress = 1 - Math.max(0, Math.min(1, this.healPulseTimer / 320));
            const ringRadius = radius + 8 + progress * 12;
            drawEffectRing(ctx, this.x, this.y, ringRadius, BUFF_COLORS.heal, {
                lineWidth: 3,
                alpha: 1 - progress * 0.8,
                glow: true
            });
        }

        // Speed ring
        const speedState = this.activeEffects && this.activeEffects.speed;
        if(speedState){
            const color = (speedState.meta && speedState.meta.color) || BUFF_COLORS.speed;
            const ringRadius = radius + 12;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.speedRingPhase);
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.setLineDash([9, 9]);
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            drawEffectRing(ctx, this.x, this.y, ringRadius - 3, color, { lineWidth: 1.5, alpha: 0.35 });
        }

        // Shield
        if(this.shield){
            const shieldState = this.activeEffects && this.activeEffects.shield;
            const color = (shieldState && shieldState.meta && shieldState.meta.color) || BUFF_COLORS.shield;
            drawEffectRing(ctx, this.x, this.y, radius + 9, color, { lineWidth: 4, alpha: 0.95, glow: true });
        }

        if(devGodMode && (this === p1 || this === p2)){
            drawEffectRing(ctx, this.x, this.y, radius + 18, '#ffe27a', { lineWidth: 2, alpha: 0.65, dash: [6,4], glow: true });
        }

        if(this.pierce){
            const color = BUFF_COLORS.pierce;
            const phaseRadius = radius + 14 + Math.sin(this.effectPhase * 2) * 2;
            drawEffectRing(ctx, this.x, this.y, phaseRadius, color, { lineWidth: 2.5, alpha: 0.75, dash: [4,6], glow: true });
        }

        if(this.poisonBullet){
            const color = BUFF_COLORS.poison;
            const pulse = 1 + Math.sin(this.effectPhase * 3) * 0.5;
            drawEffectRing(ctx, this.x, this.y, radius + 8 + pulse, color, { lineWidth: 3, alpha: 0.6 });
            drawEffectRing(ctx, this.x, this.y, radius + 12 + pulse, color, { lineWidth: 1.5, alpha: 0.35, dash: [2,4] });
        }

        if(this.silenced){
            const color = BUFF_COLORS.silence;
            const pulse = 1 + Math.sin(this.effectPhase * 4) * 0.4;
            drawEffectRing(ctx, this.x, this.y, radius + 10 + pulse, color, { lineWidth: 2.5, alpha: 0.8, dash: [3,3], glow: true });
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-radius - 6, -radius - 6);
            ctx.lineTo(radius + 6, radius + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(radius + 6, -radius - 6);
            ctx.lineTo(-radius - 6, radius + 6);
            ctx.stroke();
            ctx.restore();
        }

        // Reverse controls ring
        const reverseState = this.activeEffects && this.activeEffects.reverse;
        if(reverseState){
            const color = (reverseState.meta && reverseState.meta.color) || BUFF_COLORS.reverse;
            drawEffectRing(ctx, this.x, this.y, radius + 6, color, { lineWidth: 3, alpha: 0.75, dash: [5, 6] });
        }

        // Giant enemy ring
        const giantState = this.activeEffects && this.activeEffects.giantEnemy;
        if(giantState){
            const color = (giantState.meta && giantState.meta.color) || BUFF_COLORS.giantEnemy;
            drawEffectRing(ctx, this.x, this.y, radius + 16, color, { lineWidth: 5, alpha: 0.6, glow: true });
        }

        const poisonState = this.activeEffects && this.activeEffects.poison;
        if(poisonState){
            const color = (poisonState.meta && poisonState.meta.color) || BUFF_COLORS.poison;
            const innerRadius = radius - 3;
            if(innerRadius > 4){
                ctx.save();
                ctx.globalAlpha = 0.35;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            drawEffectRing(ctx, this.x, this.y, radius + 4, color, { lineWidth: 2, alpha: 0.55, dash: [3,3] });
        }

        // Root chains
        const rootState = this.activeEffects && this.activeEffects.root;
        if(rootState){
            const color = (rootState.meta && rootState.meta.color) || BUFF_COLORS.root;
            drawChainAround(ctx, this.x, this.y, radius + 5, color, 12);
        }

        const drawHUD = this.hp > 0 && !this.pendingRemoval && !this.invisible && !this.isClone;
        if (drawHUD) {
        const hpWidth = 48, hpHeight = 6;
        const hpX = this.x - hpWidth / 2;
            const hpY = this.y + radius + 12;
        const hpPerc = Math.max(0, Math.min(1, this.hp / this.maxHp));

        ctx.fillStyle = '#273344';
        ctx.fillRect(hpX, hpY, hpWidth, hpHeight);
        ctx.strokeStyle = '#0b0f18';
        ctx.strokeRect(hpX, hpY, hpWidth, hpHeight);
        ctx.fillStyle = this.color;
        ctx.fillRect(hpX + 1, hpY + 1, (hpWidth - 2) * hpPerc, hpHeight - 2);

        // Fixed width ammo bar same as health bar
        const ammoWidth = hpWidth; // Same width as health bar
        const ammoHeight = 5;
        const ammoX = this.x - ammoWidth / 2;
        const ammoY = hpY + hpHeight + 6;
        
        // Background
        ctx.fillStyle = '#273344';
        ctx.fillRect(ammoX, ammoY, ammoWidth, ammoHeight);
        ctx.strokeStyle = '#0b0f18';
        ctx.strokeRect(ammoX, ammoY, ammoWidth, ammoHeight);
        
        // Ammo fill
        const ammoPercent = this.ammo / (this.maxAmmo || 3);
        const fillWidth = ammoWidth * ammoPercent;
        ctx.fillStyle = '#21d0ff';
        ctx.fillRect(ammoX + 1, ammoY + 1, fillWidth - 2, ammoHeight - 2);
        if(this.statusText){
            ctx.save();
            ctx.font = '600 12px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const txt = this.statusText;
            const textWidth = ctx.measureText(txt).width;
            const padX = 12;
            const boxW = textWidth + padX * 2;
            const boxH = 18;
            const boxX = this.x - boxW / 2;
            const boxY = ammoY + ammoHeight + 8;
            ctx.fillStyle = 'rgba(13,22,36,0.82)';
            roundRect(ctx, boxX, boxY, boxW, boxH, 9, true, false);
            ctx.strokeStyle = this.statusColor || '#eaf2ff';
            ctx.lineWidth = 1.5;
            roundRect(ctx, boxX, boxY, boxW, boxH, 9, false, true);
            ctx.fillStyle = this.statusColor || '#eaf2ff';
            ctx.fillText(txt, this.x, boxY + boxH/2);
            ctx.restore();
        }
    }

    }
    canShoot(now){
        if(this.silenced) return false;
        return now-this.lastShot>=this.reload;
    }
    shoot(now){
    if(this.ammo<=0) return;
    this.ammo--; this.lastShot=now;
    const offset=this.r + 6;
    const bx=this.x + Math.cos(this.angle)*offset;
    const by=this.y + Math.sin(this.angle)*offset;

    const bullet = new Bullet(bx, by, this.angle, this);
    styleBulletForOwner(bullet, this);

    // Apply fury damage multiplier
    if(this.fury) {
        bullet.damage = (bullet.damage || 1) * 2;
    }

    // dịch đạn ra ngoài tank để không tự va vào bản thân
    const safeDist = this.r + bullet.r + 1;
    bullet.x = this.x + Math.cos(this.angle) * safeDist;
    bullet.y = this.y + Math.sin(this.angle) * safeDist;

    return bullet;
}

    resetStatus(){
        this.stateVersion++;
        for(const key in this.activeEffects){
            const state=this.activeEffects[key];
            if(state){
                state.cancelled = true;
                if(state.timeout) clearTimeout(state.timeout);
            }
        }
        this.activeEffects = {};
        this.speed = 0;
        
        // Don't reset boss mode permanent buffs
        if (gameMode !== 'vsboss') {
            this.moveSpeed = this.baseMoveSpeed;
            this.friction = this.baseFriction;
            this.reloadRate = this.baseReloadRate;
            this.reload = this.baseReload;
            this.turnSpeed = this.baseTurnSpeed;
            this.r = this.baseRadius;
            this.damage = 1;
            this.maxHp = 3;
            this.bulletSpeedMultiplier = 1;
        }
        
        this.homing = false;
        this.invisible = false;
        this.shield = false;
        this.shotgun = false;
        this.trailBullet = false;
        this.pierce = false;
        this.fury = false;
        this.ricochet = false; // Was 'bounce'
        this.poisonBullet = false;
        this.bigBullet = false;
        this.explosive = false;
        this.isBurning = false;
        this.healPulseTimer = 0;
        this.displayRadius = this.r;
    }
    
    drawMiniSlime(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const time = performance.now() * 0.004;
        
        // Mini slime glow
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 8;
        
        // Animated mini slime shape
        ctx.beginPath();
        const points = 6;
        for(let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const wobble = Math.sin(time + i) * 2;
            const radius = this.r + wobble;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        // Mini slime gradient
        const gradient = ctx.createRadialGradient(0, -this.r/3, 0, 0, 0, this.r);
        gradient.addColorStop(0, '#86efac');
        gradient.addColorStop(0.7, '#4ade80');
        gradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Mini slime highlight
        const highlight = ctx.createRadialGradient(-this.r/3, -this.r/2, 0, -this.r/3, -this.r/2, this.r/3);
        highlight.addColorStop(0, 'rgba(255,255,255,0.5)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = highlight;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Mini slime core
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}