import { BUFF_COLORS } from '../constants.js';
import { normalizeAngle, clamp } from '../utils.js';
import { W, H } from '../canvas.js';
import { obstacles } from '../game/obstacles.js';
import { addExplosion, addTrail, addPoisonBubble } from '../rendering/animations.js';
import { updateBulletPhysics } from '../game/physics.js';

import { HOMING_MAX_TURN } from '../config.js';
import { devOneHitKill, devMode, p1, p2, tanks, devNoWalls } from '../state.js';
import { pickHomingTarget, findCollisionPoint, lineRectColl } from '../game/collision.js';

function hexWithAlpha(color, alpha = 1) {
    if (!color) return `rgba(255, 255, 255, ${alpha})`;
    let hex = color.replace('#', '').trim();
    if (hex.length === 3) {
        hex = hex.split('').map(ch => ch + ch).join('');
    }
    if (hex.length !== 6) {
        return `rgba(255, 255, 255, ${alpha})`;
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default
class Bullet{
    constructor(x,y,angle,owner){
        this.x=x; this.y=y; this.r=4; this.owner=owner;
        this.bounces=0; this.maxBounces=8; this.alive=true;
        let speed=6.5;
        this.baseSpeed = speed;

        if (owner && owner.bulletSpeedMultiplier) {
            speed *= owner.bulletSpeedMultiplier;
        }
        
        this.vx=Math.cos(angle)*speed;
        this.vy=Math.sin(angle)*speed;
        this.spawnTime = performance.now();
        this.color = '#f33';
        this.shape = 'circle';
        this.guidelineColor = null;
        this.glow = false; // Default glow
        this.explosionRadius = 150; // Tăng bán kính nổ mặc định
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
        this.hasShotSplit = false;
        this.poisonTrailCounter = 0;
        this._shotSplitConsumed = false;
        this._fromShotSplit = false;
        this._shotSplitSpawned = false;

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

    // Tạo vệt bong bóng độc
    if (this.isPoison) {
        this.poisonTrailCounter += Math.hypot(this.vx, this.vy);
        if (this.poisonTrailCounter >= 12) { // Thả bong bóng mỗi 12 pixels
            addPoisonBubble({ x: this.x, y: this.y });
            this.poisonTrailCounter = 0;
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
        if(this.glow || this.isRicochet){
            ctx.shadowColor = this.isRicochet ? this.color : (this.color || '#f00');
            ctx.shadowBlur = this.isRicochet ? 18 : 12;
        }
        const baseFill = this.isRicochet ? this.color : (this.color || '#f00');
        ctx.fillStyle = baseFill;

        if(this.isPoison){
            const pulse = 0.5 + 0.5 * Math.sin((performance.now() - this.spawnTime) / 120);
            ctx.globalAlpha *= 0.9 + 0.1 * pulse;
        }
        const fireIceType = this.fireIceType;
        const isBossBullet = !!(this.owner && this.owner.isBoss);
        const bossVisualType = this.bossVisual || (this.owner && this.owner.bossType) || 'default';
        const wantsBossVisual = isBossBullet && !this.isPoison && !fireIceType;

        const drawBossVisual = (type) => {
            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx);
            const color = this.color || (this.owner && this.owner.color) || '#f33';
            const time = performance.now() * 0.004;

            switch (type) {
                case 'slime': {
                    ctx.rotate(angle + Math.sin(time * 2) * 0.1);
                    ctx.shadowColor = hexWithAlpha(color, 0.5);
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    const points = 9;
                    for (let i = 0; i < points; i++) {
                        const ang = (i / points) * Math.PI * 2;
                        const wobble = 0.2 * Math.sin(time * 6 + i);
                        const radius = this.r * (1 + wobble);
                        const px = Math.cos(ang) * radius;
                        const py = Math.sin(ang) * radius;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fillStyle = hexWithAlpha(color, 0.9);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(255,255,255,0.35)';
                    ctx.beginPath();
                    ctx.ellipse(-this.r * 0.2, -this.r * 0.25, this.r * 0.6, this.r * 0.3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'wolf': {
                    ctx.rotate(angle);
                    ctx.shadowColor = hexWithAlpha(color, 0.65);
                    ctx.shadowBlur = 18;
                    const outer = this.r * 1.25;
                    ctx.beginPath();
                    ctx.arc(0, 0, outer, Math.PI / 2, -Math.PI / 2, true);
                    ctx.arc(-this.r * 0.5, 0, outer * 0.55, -Math.PI / 2, Math.PI / 2, false);
                    ctx.closePath();
                    ctx.fillStyle = hexWithAlpha(color, 0.9);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(-this.r * 0.2, 0, outer * 0.65, -Math.PI / 2, Math.PI / 2);
                    ctx.stroke();
                    ctx.globalAlpha = 0.7;
                    ctx.strokeStyle = hexWithAlpha(color, 0.5);
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-this.r * 1.4, -this.r * 0.4);
                    ctx.lineTo(-this.r * 2.8, 0);
                    ctx.lineTo(-this.r * 1.4, this.r * 0.4);
                    ctx.stroke();
                    break;
                }
                case 'golem': {
                    ctx.rotate(angle);
                    ctx.shadowColor = '#d6d3d1';
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = '#a3a3a3';
                    ctx.beginPath();
                    const shards = 6;
                    for (let i = 0; i < shards; i++) {
                        const ang = (i / shards) * Math.PI * 2;
                        const radius = this.r * (0.9 + 0.15 * Math.sin(time * 5 + i));
                        const px = Math.cos(ang) * radius;
                        const py = Math.sin(ang) * radius;
                        if (i === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = '#e7e5e4';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-this.r * 0.6, -this.r * 0.4);
                    ctx.lineTo(this.r * 0.2, -this.r * 0.1);
                    ctx.lineTo(this.r * 0.5, this.r * 0.4);
                    ctx.stroke();
                    break;
                }
                case 'witch': {
                    ctx.rotate(angle);
                    const orbRadius = this.r * 1.2;
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, orbRadius);
                    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
                    gradient.addColorStop(0.3, hexWithAlpha(color, 0.8));
                    gradient.addColorStop(1, hexWithAlpha(color, 0));
                    ctx.fillStyle = gradient;
                    ctx.shadowColor = hexWithAlpha(color, 0.7);
                    ctx.shadowBlur = 20;
                    ctx.beginPath();
                    ctx.arc(0, 0, orbRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = hexWithAlpha(color, 0.6);
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.arc(0, 0, orbRadius * 1.2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.rotate(-angle);
                    ctx.globalAlpha = 0.8;
                    ctx.font = `${this.r * 1.2}px serif`;
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fillText('✦', 0, 0);
                    break;
                }
                case 'treant': {
                    ctx.rotate(angle);
                    ctx.shadowColor = hexWithAlpha(color, 0.4);
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.moveTo(-this.r * 1.2, 0);
                    ctx.quadraticCurveTo(-this.r * 0.4, -this.r * 1.2, this.r * 1.3, 0);
                    ctx.quadraticCurveTo(-this.r * 0.4, this.r * 1.2, -this.r * 1.2, 0);
                    ctx.fillStyle = hexWithAlpha(color, 0.85);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-this.r * 0.6, -this.r * 0.8);
                    ctx.lineTo(this.r * 0.9, 0);
                    ctx.lineTo(-this.r * 0.6, this.r * 0.8);
                    ctx.stroke();
                    break;
                }
                default: {
                    ctx.rotate(angle);
                    const pulse = 1 + 0.12 * Math.sin(time * 6);
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 1.45 * pulse);
                    coreGradient.addColorStop(0, 'rgba(255,255,255,0.95)');
                    coreGradient.addColorStop(0.45, hexWithAlpha(color, 0.9));
                    coreGradient.addColorStop(1, hexWithAlpha(color, 0));
                    ctx.fillStyle = coreGradient;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 25;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.r * 1.4 * pulse, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    ctx.strokeStyle = hexWithAlpha(color, 0.8);
                    ctx.lineWidth = 3;
                    ctx.globalAlpha = 0.95;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.r * 1.55, 0, Math.PI * 2);
                    ctx.stroke();
                    const fins = 4;
                    for (let i = 0; i < fins; i++) {
                        const finAngle = (i / fins) * Math.PI * 2 + time;
                        ctx.save();
                        ctx.rotate(finAngle);
                        ctx.globalAlpha = 0.65;
                        const finLength = this.r * (2.2 + 0.3 * Math.sin(time * 3 + i));
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(-finLength * 0.35, this.r * 0.4);
                        ctx.lineTo(-finLength, 0);
                        ctx.lineTo(-finLength * 0.35, -this.r * 0.4);
                        ctx.closePath();
                        ctx.fillStyle = hexWithAlpha(color, 0.53);
                        ctx.fill();
                        ctx.restore();
                    }
                    ctx.globalAlpha = 0.9;
                    const tailLength = this.r * (5 + 0.8 * Math.sin(time * 5));
                    const tailGradient = ctx.createLinearGradient(-tailLength, 0, 0, 0);
                    tailGradient.addColorStop(0, hexWithAlpha(color, 0));
                    tailGradient.addColorStop(0.4, hexWithAlpha(color, 0.33));
                    tailGradient.addColorStop(1, hexWithAlpha(color, 1));
                    ctx.fillStyle = tailGradient;
                    ctx.beginPath();
                    ctx.moveTo(0, -this.r * 0.5);
                    ctx.quadraticCurveTo(-tailLength * 0.3, -this.r * 1.2, -tailLength, 0);
                    ctx.quadraticCurveTo(-tailLength * 0.3, this.r * 1.2, 0, this.r * 0.5);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 0.7;
                    for (let i = 0; i < 3; i++) {
                        const orbit = this.r * (1.2 + i * 0.35);
                        const orbAngle = time * (2 + i) + i;
                        const ox = Math.cos(orbAngle) * orbit;
                        const oy = Math.sin(orbAngle) * orbit * 0.6;
                        ctx.beginPath();
                        ctx.fillStyle = 'rgba(255,255,255,0.85)';
                        ctx.arc(ox, oy, 2 + i, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                }
            }

            ctx.restore();
            return true;
        };

        if (this.isPoison) { // Nâng cấp hiệu ứng đạn độc
            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);

            const color = this.color || BUFF_COLORS.poison || '#6cff5f';
            const time = performance.now() * 0.005;
            const pulse = 1 + 0.1 * Math.sin(time * 4);
            const wobble = Math.sin(time * 5) * 0.2; // Hiệu ứng lúc lắc

            // 1. Hình giọt độc chính
            ctx.globalAlpha = 0.95;
            ctx.shadowColor = '#abf7b1';
            ctx.shadowBlur = 20;
            const bodyGradient = ctx.createRadialGradient(this.r * 0.5, 0, 0, 0, 0, this.r * 1.5);
            bodyGradient.addColorStop(0, 'rgba(220, 255, 220, 1)');
            bodyGradient.addColorStop(0.6, color);
            bodyGradient.addColorStop(1, 'rgba(20, 150, 10, 0.9)');
            ctx.fillStyle = bodyGradient;

            ctx.beginPath();
            ctx.moveTo(this.r * 1.5 * pulse, 0); // Đầu giọt
            ctx.quadraticCurveTo(this.r * 0.5, this.r * (1.2 + wobble), -this.r * 1.5, 0); // Thân trên
            ctx.quadraticCurveTo(this.r * 0.5, -this.r * (1.2 + wobble), this.r * 1.5 * pulse, 0); // Thân dưới
            ctx.fill();

            // 2. Viền ngoài sắc nét
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(20, 100, 15, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 5]);
            const ringRadius = this.r * (1.5 + 0.2 * Math.sin(time * 2.5));
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Bong bóng khí độc bên trong
            const bubbleCount = 3;
            for (let i = 0; i < bubbleCount; i++) {
                const bubbleTime = time * (1 + i * 0.3);
                const x = Math.cos(bubbleTime) * this.r * 0.6;
                const y = Math.sin(bubbleTime * 2) * this.r * 0.4;
                const size = 1 + Math.sin(bubbleTime) * 0.8;
                ctx.fillStyle = `rgba(200, 255, 200, 0.6)`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        } else if (wantsBossVisual && drawBossVisual(bossVisualType)) {
            // Boss visual handled
        } else if(this.shape === 'square'){
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
        } else if (fireIceType === 'fire') {
            ctx.save();
            ctx.translate(this.x, this.y);
            const time = performance.now() * 0.01;
            const pulse = 1 + Math.sin(time) * 0.15;
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 1.6 * pulse);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.3, '#ffd966');
            gradient.addColorStop(0.6, '#ff8f3f');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 1.4 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (fireIceType === 'ice') {
            ctx.save();
            ctx.translate(this.x, this.y);
            const time = performance.now() * 0.006;
            const shimmer = 1 + Math.sin(time * 2) * 0.1;
            ctx.fillStyle = 'rgba(173, 216, 230, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 0, this.r * 1.2 * shimmer, this.r * 0.7 * shimmer, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
            ctx.fill();
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r);
            gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
            gradient.addColorStop(1, '#60a5fa');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        } else if (this.shape === 'bomb') { // Nâng cấp hiệu ứng đạn nổ thành mìn công nghệ cao
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(performance.now() * 0.001); // Tự xoay chậm

            const time = performance.now() * 0.005;
            const pulse = 0.9 + 0.1 * Math.sin(time * 6);
            const color = this.color || BUFF_COLORS.explosive;

            // 1. Thân mìn lục giác
            ctx.fillStyle = '#374151'; // Màu xám đậm
            ctx.strokeStyle = '#1f2937'; // Viền đen
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * this.r;
                const y = Math.sin(angle) * this.r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2. Lõi năng lượng trung tâm
            const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 0.6 * pulse);
            coreGradient.addColorStop(0, 'rgba(255, 200, 150, 1)');
            coreGradient.addColorStop(0.6, color);
            coreGradient.addColorStop(1, 'rgba(127, 29, 29, 0.7)');
            ctx.fillStyle = coreGradient;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 0.6 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // 3. Đèn báo trạng thái ở các góc
            ctx.shadowBlur = 0;
            const blinkPhase = Math.floor(time * 2) % 6; // Đèn sẽ sáng lần lượt
            for (let i = 0; i < 6; i++) {
                if (i === blinkPhase) {
                    const angle = (i / 6) * Math.PI * 2;
                    const x = Math.cos(angle) * this.r * 0.8;
                    const y = Math.sin(angle) * this.r * 0.8;
                    ctx.fillStyle = '#fb923c'; // Màu cam sáng
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
            ctx.fill();
        }

        // --- Buff-specific visual effects ---
        const now = performance.now();
        const time = now * 0.005; // General time for pulsating effects

        // Big Bullet effect (subtle shimmer)
        if (this.owner && this.owner.bigBullet) {
            ctx.save();
            const pulse = 1 + 0.1 * Math.sin(time * 3);
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 8 * pulse;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isHoming) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            const color = BUFF_COLORS.homing;
            const wingPulse = 0.85 + 0.2 * Math.sin(time * 5);
            const tailLength = this.r * (3.2 + 0.7 * Math.sin(time * 6));
            const headGlowRadius = this.r * (2.1 + 0.2 * Math.sin(time * 4));

            // Halo + lõi năng lượng
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const haloGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, headGlowRadius * 1.2);
            haloGradient.addColorStop(0, 'rgba(255,255,255,0.35)');
            haloGradient.addColorStop(0.45, 'rgba(96,165,250,0.45)');
            haloGradient.addColorStop(1, 'rgba(0,95,255,0)');
            ctx.fillStyle = haloGradient;
            ctx.beginPath();
            ctx.arc(0, 0, headGlowRadius * 1.2, 0, Math.PI * 2);
            ctx.fill();

            const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, headGlowRadius);
            coreGradient.addColorStop(0, 'rgba(255,255,255,0.95)');
            coreGradient.addColorStop(0.4, 'rgba(175,225,255,0.85)');
            coreGradient.addColorStop(1, 'rgba(64,140,255,0.0)');
            ctx.fillStyle = coreGradient;
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 0, headGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Đuôi phản lực đa lớp
            ctx.save();
            ctx.globalAlpha = 0.95;
            const tailGradient = ctx.createLinearGradient(-tailLength, 0, 0, 0);
            tailGradient.addColorStop(0, 'rgba(30, 80, 255, 0)');
            tailGradient.addColorStop(0.5, 'rgba(64, 180, 255, 0.5)');
            tailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
            ctx.fillStyle = tailGradient;
            ctx.beginPath();
            ctx.moveTo(-tailLength, -this.r * 0.4);
            ctx.quadraticCurveTo(-this.r, -this.r * 1.2, -this.r * 0.1, -this.r * 0.25);
            ctx.lineTo(this.r * 0.05, -this.r * 0.15);
            ctx.lineTo(this.r * 0.05, this.r * 0.15);
            ctx.lineTo(-this.r * 0.1, this.r * 0.25);
            ctx.quadraticCurveTo(-this.r, this.r * 1.2, -tailLength, this.r * 0.4);
            ctx.closePath();
            ctx.fill();

            // Đuôi phụ tạo cảm giác rung
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(-tailLength * 0.6, -this.r * 0.15);
            ctx.quadraticCurveTo(-this.r * 0.8, -this.r * 0.7, 0, 0);
            ctx.quadraticCurveTo(-this.r * 0.8, this.r * 0.7, -tailLength * 0.6, this.r * 0.15);
            ctx.fill();
            ctx.restore();

            // Cánh điều hướng đa lớp
            const wingLength = this.r * (3 + 0.45 * Math.sin(time * 4));
            const wingWidth = this.r * 1.45;
            for (let layer = 0; layer < 3; layer++) {
                const layerScale = 1 - layer * 0.22;
                ctx.globalAlpha = 0.5 - layer * 0.12;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(-this.r * 0.15, 0);
                ctx.quadraticCurveTo(this.r * 0.9, -wingWidth * wingPulse * layerScale, wingLength * layerScale, 0);
                ctx.quadraticCurveTo(this.r * 0.9, wingWidth * wingPulse * layerScale, -this.r * 0.15, 0);
                ctx.fill();
            }
        }

        if (this.isRicochet) {
            ctx.save();
            const pulse = 1 + 0.3 * Math.sin(time * 6);
            const rippleRadius = this.r * (2.2 + 0.4 * Math.sin(time * 4));

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(87, 213, 255, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.arc(this.x, this.y, rippleRadius * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = 'rgba(87, 213, 255, 0.95)';
            for (let i = 0; i < 4; i++) {
                const ang = (i / 4) * Math.PI * 2 + time;
                const inner = rippleRadius * 0.7;
                const outer = rippleRadius * 1.15 + Math.sin(time * 5 + i) * 2;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(ang) * inner, this.y + Math.sin(ang) * inner);
                ctx.lineTo(this.x + Math.cos(ang) * outer, this.y + Math.sin(ang) * outer);
                ctx.stroke();
            }

            // Comet tail to emphasize bouncing motion
            const speed = Math.max(1, Math.hypot(this.vx, this.vy));
            const tailLength = Math.min(60, speed * 8);
            const tailGradient = ctx.createLinearGradient(this.x, this.y, this.x - this.vx, this.y - this.vy);
            tailGradient.addColorStop(0, 'rgba(87,213,255,0.85)');
            tailGradient.addColorStop(1, 'rgba(87,213,255,0)');
            ctx.strokeStyle = tailGradient;
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - (this.vx / speed) * tailLength, this.y - (this.vy / speed) * tailLength);
            ctx.stroke();

            ctx.restore();
        }

        ctx.restore();
    }
}