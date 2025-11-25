import { BUFF_COLORS } from '../constants.js';
import { clamp, roundRect, drawEffectRing, drawChainAround } from '../utils.js';
import { obstacles } from '../game/obstacles.js';
import Bullet from './Bullet.js';
import { styleBulletForOwner, showStatus } from '../systems/effects.js';
import { circleRectColl, pickHomingTarget } from '../game/collision.js';
import { W, H } from '../canvas.js';
import { drawTankEffects, drawBarrelEffects } from '../rendering/tankEffects.js';
import { drawTankHUD } from '../ui/tankHUD.js';
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
        this.damageMultiplier = 1;
        this.damageDebuffUntil = 0;
        this.isInCorrosiveGel = false;
        this.corrosiveDamageFactor = 1;
        this.lastCorrosiveTick = 0;

        this.homing=false; this.bigBullet=false; this.ricochet=false;
        this.shotgun=false; this.explosive=false; this.rooted=false;
        this.silenced=false;
        this.pierce=false; this.poisonBullet=false;
        this.possession=false; this.trailBullet=false;
        this.fireRate=false; this.fury=false;
        this.isMiniSlime = false;
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
        this.bossPierceStacks = 0;
        this.bossBounceCount = 0;
        this.bossPierceDamageFactor = 0;
        this.hasTwinShot = false;
        this.twinShotShotCount = 0;
        this.twinShotBonusCharges = 0;
        this.lifeStealPulseTimer = 0;
        this.hasShotSplit = false;
        this.hasShotSplit4 = false;
        this.hasRicochetTracking = false;
        this.hasPoisonShot = false;
        this.hasCriticalHit = false;
        this.hasBossShield = false;
        this.bossShieldReady = false;
        this.hasFireIceShot = false;
        this.bossIceSlowFactor = 1;
        this.microShieldEnabled = false;
        this.microShieldMax = 0;
        this.microShieldValue = 0;
        this.microShieldNextRegen = 0;
        this.homingTarget = null; // Mục tiêu đang bị khóa
        this.isHomingTarget = false; // Cờ cho biết tank này có đang bị khóa không
    }
    update(dt,input){
        if (this.hp <= 0) {
            this.speed = 0;
            this.renderAlpha = 0;
            this.lifeStealPulseTimer = 0;
            return;
        }

        if (this.stunned) {
            this.speed = 0;
            this.vx = 0;
            this.vy = 0;
            return;
        }

        updateTankPhysics(this, dt, input);

        if(this.statusTimer > 0){
            this.statusTimer = Math.max(0, this.statusTimer - dt);
            if(this.statusTimer <= 0){
                this.statusText = null;
            }
        }

        if (this.lifeStealPulseTimer > 0) {
            this.lifeStealPulseTimer = Math.max(0, this.lifeStealPulseTimer - dt);
        }

        if (this.microShieldEnabled && this.microShieldMax > 0) {
            if (this.microShieldValue < this.microShieldMax && performance.now() >= (this.microShieldNextRegen || 0)) {
                this.microShieldValue = this.microShieldMax;
                this.microShieldNextRegen = Number.POSITIVE_INFINITY;
                showStatus(this, '🧿 Shield hồi!', BUFF_COLORS.microShield || '#7dd3fc', 600);
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

        if(this.ammo < this.maxAmmo){
            this.reloadCooldown += this.reloadRate * dt/16;
            while(this.reloadCooldown >= 1){
                this.ammo = Math.min(this.ammo+1, this.maxAmmo);
                this.reloadCooldown -= 1;
            }
        }

        // Logic khóa mục tiêu cho đạn tự dẫn
        if (this.activeEffects && this.activeEffects.homing) {
            // Xóa cờ khỏi mục tiêu cũ nếu nó không còn là mục tiêu nữa
            if (this.homingTarget && this.homingTarget.isHomingTarget) {
                this.homingTarget.isHomingTarget = false;
            }
            this.homingTarget = pickHomingTarget(this);
            // Đặt cờ cho mục tiêu mới
            if (this.homingTarget) {
                this.homingTarget.isHomingTarget = true;
            }
        } else if (this.homingTarget) {
            // Dọn dẹp khi buff hết hạn
            this.homingTarget.isHomingTarget = false;
            this.homingTarget = null;
        }

        if (this.damageDebuffUntil > 0) {
            this.damageDebuffUntil = Math.max(0, this.damageDebuffUntil - dt);
            if (this.damageDebuffUntil <= 0) {
                this.damageMultiplier = 1;
            }
        }
    }

    draw(ctx){
        if(this.invisible && !this.isClone) {
            return;
        }
        if (this.isMiniSlime) {
            this.drawMiniSlime(ctx);
            return;
        }
        const radius = this.displayRadius || this.r;
        if(!isFinite(radius) || radius <= 0){
            return;
        }
        let effectiveBaseRadius = this.baseRadius;
        if (!Number.isFinite(effectiveBaseRadius) || effectiveBaseRadius <= 0) {
            effectiveBaseRadius = this.r || 16;
            this.baseRadius = effectiveBaseRadius;
        }
        const scale = Math.max(0.0001, radius / effectiveBaseRadius);
        const muzzleWidthScale = this.shotgun ? 1.25 : 1;
        const muzzleLengthScale = this.shotgun ? 1.5 : 1;
        const cornerRadius = Math.max(4, 6 * scale);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = Math.max(0, Math.min(1, this.renderAlpha));

        const safeRadius = Math.max(0.0001, radius);
        const bodySize = safeRadius * 2;

        if(this.isClone){
            ctx.lineWidth = 2.4 * scale;
            ctx.strokeStyle = this.color;
            roundRect(ctx, -safeRadius, -safeRadius, bodySize, bodySize, cornerRadius, false, true);
        } else {
            const bodyGradient = ctx.createRadialGradient(-safeRadius/3, -safeRadius/3, 0, 0, 0, safeRadius);

            bodyGradient.addColorStop(0, this.color);
            bodyGradient.addColorStop(0.7, this.color);
            bodyGradient.addColorStop(1, this.color.replace(/rgb\((\d+),(\d+),(\d+)\)/, (match, r, g, b) => `rgb(${Math.max(0, r-40)},${Math.max(0, g-40)},${Math.max(0, b-40)})`));
            ctx.fillStyle = bodyGradient;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2 * scale;
            roundRect(ctx, -safeRadius, -safeRadius, bodySize, bodySize, cornerRadius, true, true);
            ctx.fillStyle = '#2d3748';
            ctx.fillRect(-safeRadius + 2, -safeRadius + 2, 4, bodySize - 4);
            ctx.fillRect(safeRadius - 6, -safeRadius + 2, 4, bodySize - 4);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.arc(-safeRadius/4, -safeRadius/4, safeRadius/3, 0, Math.PI * 2);
            ctx.fill();
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
            const turretGradient = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseHeight);
            turretGradient.addColorStop(0, '#4a5568');
            turretGradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = turretGradient;
            ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(baseX, baseY, baseWidth, baseHeight);
            const barrelGradient = ctx.createLinearGradient(barrelStartX, barrelY, barrelStartX, barrelY + barrelHeight);
            barrelGradient.addColorStop(0, '#2d3748');
            barrelGradient.addColorStop(0.5, '#1a202c');
            barrelGradient.addColorStop(1, '#2d3748');
            ctx.fillStyle = barrelGradient;
            ctx.fillRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(barrelStartX, barrelY, barrelWidth, 1);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barrelStartX, barrelY, barrelWidth, barrelHeight);
            ctx.fillStyle = '#000';
            ctx.fillRect(barrelStartX + barrelWidth - 2, barrelY + 1, 2, barrelHeight - 2);
        }

        // Vẽ các hiệu ứng trên nòng súng (ví dụ: Homing)
        drawBarrelEffects(ctx, this, { barrelStartX, barrelWidth, barrelY, barrelHeight });

        ctx.restore(); // This is the main restore for the tank's transform

        // --- Vẽ các hiệu ứng và HUD ---
        drawTankEffects(ctx, this);
        drawTankHUD(ctx, this);
    }

    canShoot(now){
        if(this.silenced) return false;
        return now - this.lastShot >= this.reload;
    }

    shoot(now){
        if(this.ammo<=0) return;
        this.ammo--; this.lastShot=now;
        const offset=this.r + 6;
        const bx=this.x + Math.cos(this.angle)*offset;
        const by=this.y + Math.sin(this.angle)*offset;

        const bullet = new Bullet(bx, by, this.angle, this);
        styleBulletForOwner(bullet, this); // Thêm lại dòng này
        const baseDamage = bullet.damage || this.damage || 1;
        const damageMultiplier = this.damageMultiplier || 1;
        const corrosiveFactor = this.isInCorrosiveGel ? (this.corrosiveDamageFactor || 1) : 1;
        bullet.damage = baseDamage * damageMultiplier * corrosiveFactor;
        // Gán mục tiêu đã khóa cho viên đạn
        if (this.homingTarget) {
            bullet.homingTarget = this.homingTarget;
        }

        this.applyBossBulletTraits(bullet);
        this.recordBossShot();

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

    applyBossBulletTraits(bullet) {
        if (!bullet) return;
        if (this.bossPierceStacks > 0) {
            if (!bullet._bossPierceState) {
                bullet._bossPierceState = {
                    hadPierce: !!bullet.isPiercing,
                    originalDamage: bullet.damage || 1
                };
            }
            bullet.isPiercing = true;
            const extraTargets = Math.max(0, this.bossPierceStacks);
            // Cho phép xuyên qua số mục tiêu tương ứng + mục tiêu đầu tiên
            bullet.bossPierceRemaining = extraTargets + 1;

            if (!bullet.piercedTargets) {
                bullet.piercedTargets = new Set();
            } else {
                bullet.piercedTargets.clear();
            }
            if (this.bossPierceDamageFactor) {
                bullet.bossPierceDamageFactor = this.bossPierceDamageFactor;
            }
        }

        if (this.bossBounceCount > 0) {
            const baseMax = typeof bullet.maxBounces === 'number' ? bullet.maxBounces : 0;
            bullet.maxBounces = baseMax + this.bossBounceCount;
            bullet.bossBounceRemaining = (typeof bullet.bossBounceRemaining === 'number' ? bullet.bossBounceRemaining : 0) + this.bossBounceCount;
            if (typeof bullet.bossBounceOriginalDamage !== 'number') {
                bullet.bossBounceOriginalDamage = bullet.damage || 1;
            }
            if (this.bossBounceDamageFactor) {
                bullet.bossBounceDamageFactor = this.bossBounceDamageFactor;
            }
        }

        if (this.hasShotSplit && !bullet._fromShotSplit) {
            bullet.hasShotSplit = true;
            bullet._shotSplitConsumed = false;
        }

        if (this.hasShotSplit4 && !bullet._fromShotSplit) {
            bullet.hasShotSplit4 = true;
            bullet._shotSplit4Triggered = false;
        }

        if (this.hasRicochetTracking) {
            bullet.hasRicochetTracking = true;
            bullet._ricochetTrackingConsumed = false;
        }

        if (this.hasPoisonShot) {
            bullet.hasPoisonShot = true;
            bullet.poisonShotBaseDamage = bullet.fireIceSourceDamage || bullet.damage || 1;
        }

        if (this.hasCriticalHit) {
            const critMultiplier = Math.random() < 0.1 ? 2 : 1;
            bullet.criticalMultiplier = critMultiplier;
            bullet.isCriticalShot = critMultiplier > 1;
        } else {
            bullet.criticalMultiplier = 1;
            bullet.isCriticalShot = false;
        }

        if (this.hasFireIceShot) {
            const type = Math.random() < 0.5 ? 'fire' : 'ice';
            bullet.fireIceType = type;
            bullet.fireIceSourceDamage = bullet.damage || this.damage || 1;
        }
    }

    recordBossShot() {
        if (!this.hasTwinShot) return;
        if (typeof this.twinShotShotCount !== 'number') this.twinShotShotCount = 0;
        if (typeof this.twinShotBonusCharges !== 'number') this.twinShotBonusCharges = 0;
        this.twinShotShotCount++;
        if (this.twinShotShotCount >= 4) { // Bắn 4 viên, viên thứ 5 sẽ là twin shot
            this.twinShotShotCount = 0;
            this.twinShotBonusCharges++;
            showStatus(this, '✦ Twin Shot +1', BUFF_COLORS.twinShot, 800);
        }
    }

    createBossBonusBullet(fireAngle, fireX, fireY) {
        const angle = fireAngle ?? this.angle;
        const startX = fireX ?? this.x;
        const startY = fireY ?? this.y;
        const offset = this.r + 6;
        const bx = startX + Math.cos(angle) * offset;
        const by = startY + Math.sin(angle) * offset;
        const bullet = new Bullet(bx, by, angle, this);
        styleBulletForOwner(bullet, this);
        this.applyBossBulletTraits(bullet);
        return bullet;
    }

    reset() {
        // Hủy tất cả các hiệu ứng đang hoạt động một cách chính xác
        // Điều này sẽ kích hoạt hàm onEnd của mỗi hiệu ứng để dọn dẹp
        if (this.activeEffects) {
            for (const effectName in this.activeEffects) {
                const effect = this.activeEffects[effectName];
                if (effect && effect.timeout) clearTimeout(effect.timeout);
                if (effect && effect.onEnd) effect.onEnd(effect);
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

        this.healPulseTimer = 0;
        this.lifeStealPulseTimer = 0;
        this.displayRadius = this.r;
        this.hasShotSplit = false;
        this.hasBossShield = false;
        this.bossShieldReady = false;
        this.hasFireIceShot = false;
        this.bossIceSlowFactor = 1;
        this.microShieldEnabled = false;
        this.microShieldMax = 0;
        this.microShieldValue = 0;
        this.microShieldNextRegen = 0;
        this.isInCorrosiveGel = false;
        this.corrosiveDamageFactor = 1;
        this.lastCorrosiveTick = 0;
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