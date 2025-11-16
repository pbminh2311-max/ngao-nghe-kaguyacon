
import { BUFF_COLORS } from '../constants.js';
import { normalizeAngle, clamp } from '../utils.js';
import { W, H } from '../canvas.js';
import { obstacles } from '../game/obstacles.js';
import { addExplosion, addTrail } from '../rendering/animations.js';
import { updateBulletPhysics } from '../game/physics.js';
import { HOMING_MAX_TURN } from '../config.js';
import { devOneHitKill, devMode, p1, p2, tanks, devNoWalls } from '../state.js';
import { pickHomingTarget, findCollisionPoint, lineRectColl } from '../game/collision.js';

export default
class Bullet{
    constructor(x,y,angle,owner){
        this.x=x; this.y=y; this.r=4; this.owner=owner;
        this.bounces=0; this.maxBounces=8; this.alive=true;
        let speed=4.5;
        
        // Apply bullet speed multiplier if owner has it
        if (owner && owner.bulletSpeedMultiplier) {
            speed *= owner.bulletSpeedMultiplier;
        }
        
        this.vx=Math.cos(angle)*speed;
        this.vy=Math.sin(angle)*speed;
        this.spawnTime = performance.now();
        this.color = '#f33';
        this.shape = 'circle';
        this.guidelineColor = null;
        this.glow = false;
        this.explosionRadius = 80;
        this.isHoming = !!(owner && owner.homing);
        this.homingStartTime = this.isHoming ? performance.now() : null;
        this.isExplosive = !!(owner && owner.explosive);
        this.isRicochet = !!(owner && owner.ricochet);
        this.isPiercing = !!(owner && owner.pierce);
        this.isPoison = !!(owner && owner.poisonBullet);
        this.isTrail = !!(owner && owner.trailBullet);
        this.piercedTargets = null;
        if(this.isPiercing) this.piercedTargets = new Set();
        if(devOneHitKill && devMode && (owner === p1 || owner === p2)){
            this.damage = 999999;
        } else {
            this.damage = owner ? (owner.damage || 1) : 1;
        }
        this.homingTarget = null;
        this.lastTrailX = x;
        this.lastTrailY = y;
        this.trailInterval = 0;
    }
    // Trong class Bullet: thay thế update() và bounce(o)
    // Đây là đoạn code mới
    update(){
    if(!this.alive) return;

    if(this.isPiercing && !this.piercedTargets){
        this.piercedTargets = new Set();
    }

    // --- HOMING (nếu chủ sở hữ có homing) ---
    if(this.isHoming){
        // Auto-disable homing after 1 second
        if(this.homingStartTime && performance.now() - this.homingStartTime > 1000){
            this.isHoming = false;
            this.homingTarget = null;
        }
    }
    if(this.isHoming){
        const speed = Math.hypot(this.vx,this.vy) || 6;
        if(this.homingTarget && !tanks.includes(this.homingTarget)){
            this.homingTarget = null;
        }
        if(!this.homingTarget || this.homingTarget.hp <= 0 || this.homingTarget.invisible || this.homingTarget.pendingRemoval){
            this.homingTarget = pickHomingTarget(this);
        }
        const target = this.homingTarget;
        if(target){
        const dx = target.x - this.x;
        const dy = target.y - this.y;
            const desiredAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(this.vy, this.vx);
            let diff = normalizeAngle(desiredAngle - currentAngle);
            const clampedTurn = diff > 0 ? Math.min(diff, HOMING_MAX_TURN) : Math.max(diff, -HOMING_MAX_TURN);
            let newAngle = currentAngle + clampedTurn;
            if(this.owner){
                const distToOwner = Math.hypot(this.x - this.owner.x, this.y - this.owner.y);
                const safeRadius = (this.owner.r || 16) + this.r + 14;
                if(distToOwner < safeRadius && Math.abs(diff) > Math.PI * 0.6){
                    const reducedTurn = clampedTurn * 0.25;
                    newAngle = currentAngle + reducedTurn;
                }
            }
        this.vx = Math.cos(newAngle)*speed;
        this.vy = Math.sin(newAngle)*speed;
        }
    }

    // lưu vị trí cũ cho line-vs-rectangle (tránh tunneling)
    this.prevX = this.x;
    this.prevY = this.y;

    // Tạo trail nếu có buff trail
    if(this.isTrail){
        this.trailInterval += Math.hypot(this.vx, this.vy);
        if(this.trailInterval >= 8){
            const newX = this.x + this.vx;
            const newY = this.y + this.vy;
            const dist = Math.hypot(newX - this.lastTrailX, newY - this.lastTrailY);
            if(dist > 0){
                addTrail({
                    x: this.lastTrailX, y: this.lastTrailY,
                    endX: newX, endY: newY,
                });
            }
            this.lastTrailX = newX;
            this.lastTrailY = newY;
            this.trailInterval = 0;
        }
    }
    updateBulletPhysics(this);
    }

    draw(ctx){
        if(!this.alive) return;
        if(this.guidelineColor){
            ctx.save();
            ctx.strokeStyle = this.guidelineColor;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6,6]);
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.moveTo(this.x - this.vx * 2, this.y - this.vy * 2);
            ctx.lineTo(this.x + this.vx * 6, this.y + this.vy * 6);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        if(this.glow){
            ctx.shadowColor = this.color || '#f00';
            ctx.shadowBlur = 12;
        }
        ctx.fillStyle = this.color || '#f00';
        if(this.isPoison){
            const pulse = 0.5 + 0.5 * Math.sin((performance.now() - this.spawnTime) / 120);
            ctx.globalAlpha *= 0.9 + 0.1 * pulse;
        }
        if(this.shape === 'square'){
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            const size = this.r * 2;
            ctx.fillRect(-size/2, -size/2, size, size);
        } else if(this.shape === 'slime'){
            // Animated slime bullet
            const time = performance.now() * (this.wobbleSpeed || 0.005);
            ctx.beginPath();
            const points = 6;
            for(let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const wobble = Math.sin(time + i) * 1;
                const radius = this.r + wobble;
                const x = this.x + Math.cos(angle) * radius;
                const y = this.y + Math.sin(angle) * radius;
                
                if(i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if(this.shape === 'energy'){
            // Energy bullet with trail
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            
            // Energy core
            const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r);
            coreGradient.addColorStop(0, this.color);
            coreGradient.addColorStop(0.7, this.color);
            coreGradient.addColorStop(1, 'rgba(99, 102, 241, 0.3)');
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.r, 0, Math.PI*2);
            ctx.fill();
            
            // Energy tail
            ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
            ctx.beginPath();
            ctx.ellipse(-this.r, 0, this.r * 1.5, this.r * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if(this.shape === 'tech'){
            // Tech bullet with pulse
            const time = performance.now() * (this.pulseSpeed || 0.008);
            const pulse = 1 + Math.sin(time) * 0.3;
            
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            
            // Tech core
            const techGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * pulse);
            techGradient.addColorStop(0, '#fca5a5');
            techGradient.addColorStop(0.5, this.color);
            techGradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
            ctx.fillStyle = techGradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * pulse, 0, Math.PI*2);
            ctx.fill();
            
            // Tech lines
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-this.r, 0);
            ctx.lineTo(this.r, 0);
            ctx.moveTo(0, -this.r);
            ctx.lineTo(0, this.r);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
            ctx.fill();
        }
        if(this.isPoison){
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = BUFF_COLORS.poison;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
        if(this.isPiercing){
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = BUFF_COLORS.pierce;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(this.x - this.vx * 0.6, this.y - this.vy * 0.6);
            ctx.lineTo(this.x + this.vx * 0.6, this.y + this.vy * 0.6);
            ctx.stroke();
        }
        ctx.restore();
    }
}