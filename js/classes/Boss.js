import Tank from './Tank.js';
import Bullet from './Bullet.js';
import { styleBulletForOwner, showStatus } from '../systems/effects.js';
import { flashMsg, dist, clamp, roundRect } from '../main.js';
import { circleRectColl } from '../game/collision.js';
import { W, H } from '../canvas.js';
import { obstacles } from '../game/obstacles.js';
import { p1, p2, tanks, bullets, gameMode, devGodMode } from '../state.js';
import { addExplosion } from '../rendering/animations.js';
import { bossMode, reapplyPermanentBuffs } from '../game/bossMode.js';

export default class Boss extends Tank {
    constructor(x,y,type='normal'){
        super(x,y,'#800',{}); 
        this.bossType = type;
        this.setupBossStats();
        this.r = 32; // Boss to x2 so với tank bình thường (16*2)
        this.moveSpeed = 0;
        this.reload = 3000; // 3s / viên
        this.lastShot = 0;
        this.bossSkillCooldown = 10000;
        this.baseRadius = this.r;
        this.baseMoveSpeed = this.moveSpeed;
        this.baseFriction = this.friction;
        this.baseReloadRate = this.reloadRate;
        this.baseReload = this.reload;
        this.baseTurnSpeed = this.turnSpeed;
        
        // Boss-specific properties
        this.skillCooldowns = {};
        this.hasSplit = false; // For slime boss
        this.debuffTimer = 0; // For wolf boss
        this.damageReduction = 1; // For Golem defense
        this.isDefending = false; // For Golem
        this.isHealing = false; // For Treant visual
        
        // Animation properties
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumpStartPos = {x: 0, y: 0};
        this.jumpTargetPos = {x: 0, y: 0};
        this.jumpDuration = 800; // 0.8s jump animation

        this.skillTimer = 0; // Timer for normal boss teleport
    }
    
    setupBossStats() {
        const now = performance.now();
        switch(this.bossType) {
            case 'slime':
                this.hp = 6;
                this.maxHp = 6;
                this.damage = 1;
                this.color = '#4a9';
                this.moveSpeed = 0.3; // Slower than player
                this.skillCooldowns = {jump: now - 3000}; // Ready to jump immediately
                break;
            case 'wolf':
                this.hp = 12;
                this.maxHp = 12;
                this.damage = 1;
                this.color = '#333';
                this.moveSpeed = 0.75; // 150% of player speed (0.5 * 1.5)
                this.skillCooldowns = {dash: now - 4000, howl: now - 6000}; // Ready immediately
                break;
            case 'golem':
                this.hp = 18;
                this.maxHp = 18;
                this.damage = 2;
                this.color = '#78716c';
                this.moveSpeed = 0.4; // 80% player speed
                this.reload = 3500;
                this.skillCooldowns = {
                    groundSlam: now - 5000,
                    defense: now - 10000
                };
                break;
            case 'witch':
                this.hp = 16;
                this.maxHp = 16;
                this.damage = 1;
                this.color = '#7c3aed';
                this.moveSpeed = 0.55; // 110% player speed
                this.reload = 2800;
                this.skillCooldowns = {
                    darkOrbs: now - 4000,
                    teleport: now - 6000
                };
                break;
            case 'treant':
                this.hp = 20;
                this.maxHp = 20;
                this.damage = 2;
                this.color = '#16a34a';
                this.moveSpeed = 0.45; // 90% player speed
                this.reload = 3200;
                this.skillCooldowns = {
                    thorns: now - 5000,
                    heal: now - 8000,
                    roots: now - 12000
                };
                break;
            default: // fallback for higher floors
                this.hp = 20 + (Math.floor(Math.random() * 10));
                this.maxHp = this.hp;
                this.damage = 1;
                this.color = '#800';
                this.moveSpeed = 0.4;
                this.skillCooldowns = {};
                break;
        }
    }
    
    draw(ctx){
        // Modern Boss Design
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        ctx.rotate(this.angle);
        
        // Boss type specific design
        this.drawBossBody(ctx);
        this.drawBossWeapon(ctx);
        
        ctx.restore();

        // Ultra Modern Boss Health Bar
        this.drawModernHealthBar(ctx);
    }
    
    drawBossBody(ctx) {
        switch(this.bossType) {
            case 'slime':
                this.drawSlimeBody(ctx);
                break;
            case 'wolf':
                this.drawWolfBody(ctx);
                break;
            case 'golem':
                this.drawGolemBody(ctx);
                break;
            case 'witch':
                this.drawWitchBody(ctx);
                break;
            case 'treant':
                this.drawTreantBody(ctx);
                break;
            default:
                this.drawNormalBossBody(ctx);
                break;
        }
    }
    
    drawSlimeBody(ctx) {
        // Slime blob shape - không phải xe tăng
        const time = performance.now() * 0.003;
        
        // Slime glow effect
        for(let i = 3; i >= 0; i--) {
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 25 - i * 6;
            
            // Organic slime shape với nhiều blob
            ctx.beginPath();
            const points = 12;
            for(let j = 0; j < points; j++) {
                const angle = (j / points) * Math.PI * 2;
                const wobble = Math.sin(time * 3 + j * 0.8) * 4;
                const radius = this.r + wobble + i * 3;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if(j === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            
            const gradient = ctx.createRadialGradient(-this.r/3, -this.r/3, 0, 0, 0, this.r + i * 3);
            gradient.addColorStop(0, '#86efac');
            gradient.addColorStop(0.4, '#4ade80');
            gradient.addColorStop(0.8, '#22c55e');
            gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        // Slime bubbles inside
        ctx.shadowBlur = 0;
        for(let i = 0; i < 5; i++) {
            const bubbleTime = time + i * 0.5;
            const x = Math.cos(bubbleTime) * (this.r * 0.3) + Math.sin(bubbleTime * 1.3) * (this.r * 0.2);
            const y = Math.sin(bubbleTime * 0.8) * (this.r * 0.3) + Math.cos(bubbleTime * 1.1) * (this.r * 0.2);
            const size = 3 + Math.sin(bubbleTime * 2) * 2;
            
            ctx.fillStyle = '#bbf7d0';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Slime core
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawWolfBody(ctx) {
        // Wolf shape - không phải xe tăng
        const time = performance.now() * 0.005;
        
        // Dark aura
        for(let i = 0; i < 3; i++) {
            ctx.shadowColor = '#6366f1';
            ctx.shadowBlur = 25;
            
            const gradient = ctx.createRadialGradient(0, 0, this.r * 0.5, 0, 0, this.r + i * 8);
            gradient.addColorStop(0, '#4338ca');
            gradient.addColorStop(0.7, '#3730a3');
            gradient.addColorStop(1, 'rgba(30, 27, 75, 0.3)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.r + i * 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Wolf body - oval shape
        ctx.shadowBlur = 0;
        const bodyGradient = ctx.createRadialGradient(-this.r/4, -this.r/4, 0, 0, 0, this.r);
        bodyGradient.addColorStop(0, '#8b5cf6');
        bodyGradient.addColorStop(0.5, '#6366f1');
        bodyGradient.addColorStop(1, '#1e1b4b');
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r * 1.2, this.r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wolf head (smaller circle at front)
        ctx.fillStyle = '#4338ca';
        ctx.beginPath();
        ctx.ellipse(this.r * 0.6, 0, this.r * 0.6, this.r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Wolf ears
        ctx.fillStyle = '#3730a3';
        ctx.beginPath();
        ctx.ellipse(this.r * 0.8, -this.r * 0.4, this.r * 0.2, this.r * 0.3, -0.3, 0, Math.PI * 2);
        ctx.ellipse(this.r * 0.8, this.r * 0.4, this.r * 0.2, this.r * 0.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // Wolf eyes (glowing)
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#c4b5fd';
        ctx.beginPath();
        ctx.arc(this.r * 0.7, -this.r * 0.15, 4, 0, Math.PI * 2);
        ctx.arc(this.r * 0.7, this.r * 0.15, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Wolf tail (animated)
        const tailWag = Math.sin(time * 8) * 0.3;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-this.r * 0.8, 0);
        ctx.quadraticCurveTo(-this.r * 1.2, tailWag * this.r, -this.r * 1.4, tailWag * this.r * 0.5);
        ctx.stroke();
    }
    
    drawGolemBody(ctx) {
        // Stone/Rock texture with defense glow
        const time = performance.now() * 0.002;
        
        // Defense aura when defending
        if(this.isDefending) {
            for(let i = 0; i < 3; i++) {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 20;
                
                const gradient = ctx.createRadialGradient(0, 0, this.r * 0.5, 0, 0, this.r + i * 6);
                gradient.addColorStop(0, '#f59e0b');
                gradient.addColorStop(0.7, '#d97706');
                gradient.addColorStop(1, 'rgba(251, 191, 36, 0.2)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.r + i * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Main golem body - stone blocks
        ctx.shadowBlur = 0;
        const bodyGradient = ctx.createRadialGradient(-this.r/3, -this.r/3, 0, 0, 0, this.r);
        bodyGradient.addColorStop(0, '#a8a29e');
        bodyGradient.addColorStop(0.5, '#78716c');
        bodyGradient.addColorStop(1, '#44403c');
        
        // Golem torso (large rectangle)
        ctx.fillStyle = bodyGradient;
        roundRect(ctx, -this.r * 0.8, -this.r * 0.9, this.r * 1.6, this.r * 1.8, 6, true, false);
        
        // Golem head (smaller rectangle on top)
        ctx.fillStyle = '#57534e';
        roundRect(ctx, -this.r * 0.5, -this.r * 1.3, this.r, this.r * 0.6, 4, true, false);
        
        // Golem arms (rectangles on sides)
        ctx.fillStyle = '#6b7280';
        roundRect(ctx, -this.r * 1.2, -this.r * 0.4, this.r * 0.3, this.r * 0.8, 3, true, false);
        roundRect(ctx, this.r * 0.9, -this.r * 0.4, this.r * 0.3, this.r * 0.8, 3, true, false);
        
        // Golem legs (rectangles at bottom)
        roundRect(ctx, -this.r * 0.4, this.r * 0.6, this.r * 0.3, this.r * 0.6, 3, true, false);
        roundRect(ctx, this.r * 0.1, this.r * 0.6, this.r * 0.3, this.r * 0.6, 3, true, false);
        
        // Stone cracks/details
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Cracks on torso
        ctx.moveTo(-this.r/2, -this.r/2);
        ctx.lineTo(-this.r/4, this.r/4);
        ctx.moveTo(this.r/3, -this.r/3);
        ctx.lineTo(this.r/2, this.r/2);
        // Cracks on head
        ctx.moveTo(-this.r/4, -this.r);
        ctx.lineTo(this.r/4, -this.r * 0.8);
        ctx.stroke();
        
        // Golem eyes (glowing when defending)
        ctx.fillStyle = this.isDefending ? '#fbbf24' : '#ef4444';
        ctx.shadowColor = this.isDefending ? '#fbbf24' : '#ef4444';
        ctx.shadowBlur = this.isDefending ? 8 : 4;
        ctx.beginPath();
        ctx.arc(-this.r * 0.2, -this.r, 3, 0, Math.PI * 2);
        ctx.arc(this.r * 0.2, -this.r, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Stone border
        ctx.strokeStyle = this.isDefending ? '#fbbf24' : '#57534e';
        ctx.lineWidth = this.isDefending ? 4 : 3;
        if(this.isDefending) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
        }
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 4, false, true);
        ctx.shadowBlur = 0;
    }
    
    drawWitchBody(ctx) {
        // Dark magic with purple energy
        const time = performance.now() * 0.006;
        
        // Magic aura
        for(let i = 0; i < 4; i++) {
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 15;
            
            const gradient = ctx.createRadialGradient(0, 0, this.r * 0.3, 0, 0, this.r + i * 5);
            gradient.addColorStop(0, '#c084fc');
            gradient.addColorStop(0.6, '#7c3aed');
            gradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(Math.cos(time + i) * 3, Math.sin(time + i) * 3, this.r + i * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Main witch body
        ctx.shadowBlur = 0;
        const bodyGradient = ctx.createRadialGradient(-this.r/4, -this.r/4, 0, 0, 0, this.r);
        bodyGradient.addColorStop(0, '#a855f7');
        bodyGradient.addColorStop(0.5, '#7c3aed');
        bodyGradient.addColorStop(1, '#4c1d95');
        
        ctx.fillStyle = bodyGradient;
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, true, false);
        
        // Magic symbols
        ctx.fillStyle = '#ddd6fe';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', 0, 0);
        
        // Energy border with pulse
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, false, true);
        ctx.shadowBlur = 0;
    }
    
    drawTreantBody(ctx) {
        // Nature/Wood texture with healing glow
        const time = performance.now() * 0.003;
        
        // Healing aura when healing
        if(this.isHealing) {
            for(let i = 0; i < 3; i++) {
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 18;
                
                const gradient = ctx.createRadialGradient(0, 0, this.r * 0.4, 0, 0, this.r + i * 7);
                gradient.addColorStop(0, '#4ade80');
                gradient.addColorStop(0.7, '#22c55e');
                gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, this.r + i * 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Main treant body - tree trunk
        ctx.shadowBlur = 0;
        const bodyGradient = ctx.createRadialGradient(-this.r/3, -this.r/3, 0, 0, 0, this.r);
        bodyGradient.addColorStop(0, '#4ade80');
        bodyGradient.addColorStop(0.5, '#16a34a');
        bodyGradient.addColorStop(1, '#14532d');
        
        // Tree trunk (main body)
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(0, this.r * 0.2, this.r * 0.8, this.r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tree crown/canopy
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, -this.r * 0.3, this.r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        
        // Tree branches
        const branchTime = performance.now() * 0.002;
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 4;
        for(let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const sway = Math.sin(branchTime + i) * 0.1;
            const startX = Math.cos(angle) * this.r * 0.6;
            const startY = Math.sin(angle) * this.r * 0.6 - this.r * 0.3;
            const endX = Math.cos(angle + sway) * this.r * 1.1;
            const endY = Math.sin(angle + sway) * this.r * 1.1 - this.r * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Bark texture on trunk
        ctx.strokeStyle = '#052e16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let i = 0; i < 5; i++) {
            const y = -this.r * 0.5 + (i * this.r * 0.3);
            ctx.moveTo(-this.r * 0.4, y);
            ctx.lineTo(this.r * 0.4, y + 3);
        }
        ctx.stroke();
        
        // Tree face (eyes)
        ctx.fillStyle = this.isHealing ? '#4ade80' : '#052e16';
        ctx.shadowColor = this.isHealing ? '#22c55e' : 'transparent';
        ctx.shadowBlur = this.isHealing ? 6 : 0;
        ctx.beginPath();
        ctx.arc(-this.r * 0.2, this.r * 0.1, 3, 0, Math.PI * 2);
        ctx.arc(this.r * 0.2, this.r * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Nature border
        ctx.strokeStyle = this.isHealing ? '#22c55e' : '#15803d';
        ctx.lineWidth = this.isHealing ? 4 : 3;
        if(this.isHealing) {
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 10;
        }
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 6, false, true);
        ctx.shadowBlur = 0;
    }
    
    drawNormalBossBody(ctx) {
        // Mechanical/Tech boss
        // Outer glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        
        // Main body with tech pattern
        const gradient = ctx.createLinearGradient(-this.r, -this.r, this.r, this.r);
        gradient.addColorStop(0, '#dc2626');
        gradient.addColorStop(0.3, '#b91c1c');
        gradient.addColorStop(0.7, '#991b1b');
        gradient.addColorStop(1, '#7f1d1d');
        
        ctx.fillStyle = gradient;
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, true, false);
        
        // Tech lines
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        
        // Horizontal lines
        for(let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-this.r + 10, i * this.r/3);
            ctx.lineTo(this.r - 10, i * this.r/3);
            ctx.stroke();
        }
        
        // Vertical lines
        for(let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.r/3, -this.r + 10);
            ctx.lineTo(i * this.r/3, this.r - 10);
            ctx.stroke();
        }
        
        // Central core
        ctx.fillStyle = '#fca5a5';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Border
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, false, true);
    }
    
    drawBossWeapon(ctx) {
    switch(this.bossType) {
        case 'slime':
            // Slime không có weapon
            break;
        case 'wolf':
            this.drawWolfClaws(ctx);
            break;
        case 'golem':
            this.drawGolemFists(ctx);
            break;
        case 'witch':
            this.drawWitchStaff(ctx);
            break;
        case 'treant':
            this.drawTreantBranches(ctx);
            break;
        default:
            this.drawTechCannon(ctx);
            break;
    }
}
    
    drawWolfClaws(ctx) {
        // Wolf claws
        ctx.fillStyle = '#c4b5fd';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        
        // Left claw
        ctx.beginPath();
        ctx.moveTo(this.r - 5, -8);
        ctx.lineTo(this.r + 15, -12);
        ctx.lineTo(this.r + 20, -4);
        ctx.lineTo(this.r + 15, 4);
        ctx.lineTo(this.r + 10, 8);
        ctx.closePath();
        ctx.fill();
        
        // Right claw
        ctx.beginPath();
        ctx.moveTo(this.r - 5, 8);
        ctx.lineTo(this.r + 15, 12);
        ctx.lineTo(this.r + 20, 4);
        ctx.lineTo(this.r + 15, -4);
        ctx.lineTo(this.r + 10, -8);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
    
    drawGolemFists(ctx) {
        // Stone fists
        ctx.fillStyle = '#57534e';
        ctx.shadowColor = this.isDefending ? '#fbbf24' : '#44403c';
        ctx.shadowBlur = this.isDefending ? 12 : 6;
        
        // Left fist
        ctx.beginPath();
        ctx.arc(this.r - 2, -10, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Right fist
        ctx.beginPath();
        ctx.arc(this.r - 2, 10, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Fist details
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.arc(this.r + 2, -10, 3, 0, Math.PI * 2);
        ctx.arc(this.r + 2, 10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
    
    drawWitchStaff(ctx) {
        // Magic staff
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        
        // Staff shaft
        ctx.beginPath();
        ctx.moveTo(this.r - 5, 0);
        ctx.lineTo(this.r + 25, 0);
        ctx.stroke();
        
        // Staff orb
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.r + 25, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Magic sparkles
        const time = performance.now() * 0.01;
        ctx.fillStyle = '#ddd6fe';
        for(let i = 0; i < 3; i++) {
            const angle = time + (i * Math.PI * 2 / 3);
            const x = this.r + 25 + Math.cos(angle) * 12;
            const y = Math.sin(angle) * 12;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    drawTreantBranches(ctx) {
        // Tree branches/roots
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.shadowColor = this.isHealing ? '#22c55e' : '#166534';
        ctx.shadowBlur = this.isHealing ? 10 : 5;
        
        // Main branch
        ctx.beginPath();
        ctx.moveTo(this.r - 5, 0);
        ctx.lineTo(this.r + 20, -5);
        ctx.lineTo(this.r + 25, 0);
        ctx.lineTo(this.r + 20, 5);
        ctx.stroke();
        
        // Branch leaves
        ctx.fillStyle = this.isHealing ? '#4ade80' : '#22c55e';
        for(let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + (performance.now() * 0.002);
            const x = this.r + 22 + Math.cos(angle) * 8;
            const y = Math.sin(angle) * 8;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    drawTechCannon(ctx) {
        // High-tech cannon
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        
        // Main barrel
        const barrelGradient = ctx.createLinearGradient(-10, -10, 40, 10);
        barrelGradient.addColorStop(0, '#374151');
        barrelGradient.addColorStop(0.5, '#1f2937');
        barrelGradient.addColorStop(1, '#111827');
        
        ctx.fillStyle = barrelGradient;
        roundRect(ctx, -10, -10, 50, 20, 4, true, false);
        
        // Barrel details
        ctx.fillStyle = '#6b7280';
        for(let i = 0; i < 3; i++) {
            ctx.fillRect(-5 + i * 15, -8, 2, 16);
        }
        
        // Muzzle
        ctx.fillStyle = '#fbbf24';
        ctx.shadowBlur = 15;
        roundRect(ctx, 35, -6, 12, 12, 2, true, false);
        
        // Muzzle glow
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(41, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Border
        ctx.strokeStyle = '#fbbf24';
    
    // Energy border
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 10;
    roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 8, false, true);
    ctx.shadowBlur = 0;
}
    
drawNormalBossBody(ctx) {
    // Mechanical/Tech boss
    // Outer glow
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    
    // Main body with tech pattern
    const gradient = ctx.createLinearGradient(-this.r, -this.r, this.r, this.r);
    gradient.addColorStop(0, '#dc2626');
    gradient.addColorStop(0.3, '#b91c1c');
    gradient.addColorStop(0.7, '#991b1b');
    gradient.addColorStop(1, '#7f1d1d');
    
    ctx.fillStyle = gradient;
    roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, true, false);
    
    // Tech lines
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
    
    // Horizontal lines
    for(let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-this.r + 10, i * this.r/3);
        ctx.lineTo(this.r - 10, i * this.r/3);
        ctx.stroke();
    }
    
    // Vertical lines
    for(let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * this.r/3, -this.r + 10);
        ctx.lineTo(i * this.r/3, this.r - 10);
        ctx.stroke();
    }
    
    // Central core
    ctx.fillStyle = '#fca5a5';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    roundRect(ctx, -this.r, -this.r, this.r*2, this.r*2, 12, false, true);
}
    
drawBossWeapon(ctx) {
    switch(this.bossType) {
        case 'slime':
            // Slime không có weapon truyền thống
            break;
        case 'wolf':
            this.drawWolfClaws(ctx);
            break;
        default:
            this.drawTechCannon(ctx);
            break;
    }
}
    
drawWolfClaws(ctx) {
    // Wolf claws
    ctx.fillStyle = '#c4b5fd';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    
    // Left claw
    ctx.beginPath();
    ctx.moveTo(this.r - 5, -8);
    ctx.lineTo(this.r + 15, -12);
    ctx.lineTo(this.r + 20, -4);
    ctx.lineTo(this.r + 15, 4);
    ctx.lineTo(this.r + 10, 8);
    ctx.closePath();
    ctx.fill();
    
    // Right claw
    ctx.beginPath();
    ctx.moveTo(this.r - 5, 8);
    ctx.lineTo(this.r + 15, 12);
    ctx.lineTo(this.r + 20, 4);
    ctx.lineTo(this.r + 15, -4);
    ctx.lineTo(this.r + 10, -8);
    ctx.closePath();
    ctx.fill();
    
    ctx.shadowBlur = 0;
}
    
drawTechCannon(ctx) {
    // High-tech cannon
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    
    // Main barrel
    const barrelGradient = ctx.createLinearGradient(-10, -10, 40, 10);
    barrelGradient.addColorStop(0, '#374151');
    barrelGradient.addColorStop(0.5, '#1f2937');
    barrelGradient.addColorStop(1, '#111827');
    
    ctx.fillStyle = barrelGradient;
    roundRect(ctx, -10, -10, 50, 20, 4, true, false);
    
    // Barrel details
    ctx.fillStyle = '#6b7280';
    for(let i = 0; i < 3; i++) {
        ctx.fillRect(-5 + i * 15, -8, 2, 16);
    }
    
    // Muzzle
    ctx.fillStyle = '#fbbf24';
    ctx.shadowBlur = 15;
    roundRect(ctx, 35, -6, 12, 12, 2, true, false);
    
    // Muzzle glow
    ctx.fillStyle = '#fcd34d';
    ctx.beginPath();
    ctx.arc(41, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    
    // Border
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    roundRect(ctx, -10, -10, 50, 20, 4, false, true);
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
            bossName = 'Slime chúa'; bossIcon = '🟢'; 
            break;
        case 'wolf':
            primaryColor = '#6366f1'; secondaryColor = '#4338ca'; accentColor = '#3730a3';
            bossName = 'DẠ LANG THẦN'; bossIcon = '🐺'; 
            break;
        case 'golem':
            primaryColor = '#78716c'; secondaryColor = '#57534e'; accentColor = '#44403c';
            bossName = 'GOLEM ĐÁ'; bossIcon = '🗿';
            break;
        case 'witch':
            primaryColor = '#7c3aed'; secondaryColor = '#6d28d9'; accentColor = '#4c1d95';
            bossName = 'PHÙ THỦY BÓng ĐÊM'; bossIcon = '🔮';
            break;
        case 'treant':
            primaryColor = '#16a34a'; secondaryColor = '#15803d'; accentColor = '#14532d';
            bossName = 'NGƯỜI CÂY CỔ ĐẠI'; bossIcon = '🌳';
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

    const safeDist = this.r + bullet.r + 1;
    bullet.x = this.x + Math.cos(this.angle) * safeDist;
    bullet.y = this.y + Math.sin(this.angle) * safeDist;

    return bullet;
    }

    update(dt){
    // KHÔNG GỌI Tank.prototype.update vì nó reset movement
    // Tank.prototype.update.call(this, dt, {}); // XOÁ dòng này
    
    // Xử lý effects update (giữ nguyên phần này)
    if(this.statusTimer > 0){
        this.statusTimer = Math.max(0, this.statusTimer - dt);
        if(this.statusTimer <= 0){
            this.statusText = null;
        }
    }
    if(this.healPulseTimer > 0){
        this.healPulseTimer = Math.max(0, this.healPulseTimer - dt);
    }

    if(this.activeEffects){
        for(const key in this.activeEffects){
            const st = this.activeEffects[key];
            if(!st || st.cancelled) continue;
            if(typeof st.onUpdate === 'function'){
                st.onUpdate(dt, this, st);
            }
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
    
    // Chọn mục tiêu gần nhất
    let target = null;
    let minDist = Infinity;
    for(const t of [p1, p2]){
        if(t && t.hp > 0){
            const d = dist(this, t);
            if(d < minDist){
                minDist = d;
                target = t;
            }
        }
    }
    
    // Nhắm vào mục tiêu
    if(target){
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        
        // AI Movement based on boss type
        const distToTarget = dist(this, target);
        let optimalDistance = 150;
        
        // Different movement patterns per boss type
        switch(this.bossType) {
            case 'slime':
                optimalDistance = 120;
                break;
            case 'wolf':
                optimalDistance = 100;
                break;
            case 'golem':
                optimalDistance = 180;
                break;
            case 'witch':
                optimalDistance = 200;
                break;
            case 'treant':
                optimalDistance = 140;
                break;
            default:
                optimalDistance = 150;
        }
        
        // THÊM: Movement code (không bị skip bởi isJumping)
        if(this.moveSpeed > 0 && !this.isJumping) {
            if(distToTarget > optimalDistance + 50) {
                // Move towards player
                this.speed += this.moveSpeed * dt/16;
            } else if(distToTarget < optimalDistance - 30) {
                // Move away from player
                this.speed -= this.moveSpeed * dt/16;
            } else {
                // In optimal range - still move slightly for dynamic behavior
                this.speed += (Math.random() - 0.5) * this.moveSpeed * dt/32;
            }
            
            // Apply movement with collision
            this.speed *= this.friction;
            const moveX = Math.cos(this.angle) * this.speed;
            const moveY = Math.sin(this.angle) * this.speed;
            const targetX = clamp(this.x + moveX, this.r + 4, W - this.r - 4);
            const targetY = clamp(this.y + moveY, this.r + 4, H - this.r - 4);
            
            const collidesAt = (px, py) => {
                for(const o of obstacles){
                    if(circleRectColl({ x: px, y: py, r: this.r }, o)){
                        return true;
                    }
                }
                return false;
            };
            
            if(!collidesAt(targetX, targetY)){
                this.x = targetX;
                this.y = targetY;
            } else {
                this.speed *= -0.5;
            }
            
            this.x = clamp(this.x, this.r + 4, W - this.r - 4);
            this.y = clamp(this.y, this.r + 4, H - this.r - 4);
        }
    }
        
    const now = performance.now();
    if(now - this.lastShot >= this.reload){
        const b = this.shoot(now);
        if(b) bullets.push(b);
    }

    // Boss-specific skills
    this.updateBossSkills(dt, target, now);

    // Adjust reload based on HP for normal boss
    if(this.bossType === 'normal') {
        if(this.hp < 7) this.reload = 2000;
        else this.reload = 3000;
    }
}
    
    updateBossSkills(dt, target, now) {
        if (!target) return;
        
        switch(this.bossType) {
            case 'slime':
                this.updateSlimeSkills(dt, target, now);
                break;
            case 'wolf':
                this.updateWolfSkills(dt, target, now);
                break;
            case 'golem':
                this.updateGolemSkills(dt, target, now);
                break;
            case 'witch':
                this.updateWitchSkills(dt, target, now);
                break;
            case 'treant':
                this.updateTreantSkills(dt, target, now);
                break;
            default:
                this.updateNormalBossSkills(dt, target, now);
                break;
        }
    }
    
    updateSlimeSkills(dt, target, now) {
    // Update jump animation
    if (this.isJumping) {
        const jumpProgress = (now - this.jumpStartTime) / this.jumpDuration;
        
        if (jumpProgress >= 1) {
            // Jump completed
            this.x = this.jumpTargetPos.x;
            this.y = this.jumpTargetPos.y;
            this.isJumping = false;
            
            // Check for damage on landing (1 damage to players in range)
            const playersInRange = tanks.filter(t => 
                (t === p1 || t === p2) && t.hp > 0 && dist(this, t) < this.r + t.r + 30
            );
            
            playersInRange.forEach(player => {
                const skipDamage = devGodMode && (player === p1 || player === p2);
                if (!player.shield && !skipDamage) {
                    player.hp = Math.max(0, player.hp - 1);
                    showStatus(player, '-1 HP', '#ef4444', 1500);
                }
            });
            
            if (playersInRange.length > 0) {
                flashMsg('💥 Slime nhảy ép trúng mục tiêu!');
            } else {
                flashMsg('🟢 Slime đáp xuống!');
            }
            
            addExplosion({
                x: this.x, y: this.y, 
                startTime: now, duration: 500,
                color: '#4ade80', radius: 50
            });
            
        } else {
            const t = jumpProgress;
            const easeInOut = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            this.x = this.jumpStartPos.x + (this.jumpTargetPos.x - this.jumpStartPos.x) * easeInOut;
            this.y = this.jumpStartPos.y + (this.jumpTargetPos.y - this.jumpStartPos.y) * easeInOut;
        }
    } else {
        // Jump Attack - CD 3s, CHECK COOLDOWN ĐÚNG
        const timeSinceLastJump = now - (this.skillCooldowns.jump || 0);
        
        if (timeSinceLastJump >= 3000) { // 3 giây cooldown
            let closestPlayer = null;
            let minDist = Infinity;
            
            [p1, p2].forEach(player => {
                if (player && player.hp > 0) {
                    const d = dist(this, player);
                    if (d < minDist) {
                        minDist = d;
                        closestPlayer = player;
                    }
                }
            });
            
            if (closestPlayer && minDist < 400) {
                console.log('🟢 SLIME JUMP! Distance:', minDist, 'Cooldown OK:', timeSinceLastJump);
                this.jumpAttack(closestPlayer);
                this.skillCooldowns.jump = now; // CẬP NHẬT cooldown
            }
        }
    }
    
    
    // Split when 50% HP
    if (!this.hasSplit && this.hp <= this.maxHp * 0.5) {
        this.splitSlime();
        this.hasSplit = true;
    }
}
    
    updateWolfSkills(dt, target, now) {
        // Dash Attack - CD 4s
        const timeSinceLastDash = now - (this.skillCooldowns.dash || 0);
        if (timeSinceLastDash >= 4000) {
            const distToTarget = dist(this, target);
            if (distToTarget < 300 && distToTarget > 50) { // Tăng range, tránh dash quá gần
                console.log('🐺 WOLF DASH! Distance:', distToTarget, 'Cooldown OK:', timeSinceLastDash);
                this.dashAttack(target);
                this.skillCooldowns.dash = now;
            }
        }
        
        // Howl - CD 6s
        const timeSinceLastHowl = now - (this.skillCooldowns.howl || 0);
        if (timeSinceLastHowl >= 6000) {
            console.log('🌑 WOLF HOWL! Cooldown OK:', timeSinceLastHowl);
            this.howlAttack();
            this.skillCooldowns.howl = now;
        }
    }
    
    updateGolemSkills(dt, target, now) {
        // Ground Slam - CD 5s
        const timeSinceLastSlam = now - (this.skillCooldowns.groundSlam || 0);
        if (timeSinceLastSlam >= 5000) {
            const distToTarget = dist(this, target);
            if (distToTarget < 200) {
                console.log('🗿 GOLEM GROUND SLAM!');
                this.groundSlamAttack(target, now);
                this.skillCooldowns.groundSlam = now;
            }
        }
        
        // Stone Defense - CD 10s
        const timeSinceLastDefense = now - (this.skillCooldowns.defense || 0);
        if (timeSinceLastDefense >= 10000) {
            console.log('🛡️ GOLEM DEFENSE!');
            this.stoneDefenseAttack(now);
            this.skillCooldowns.defense = now;
        }
    }
    
    updateWitchSkills(dt, target, now) {
        // Dark Orbs - CD 4s
        const timeSinceLastOrbs = now - (this.skillCooldowns.darkOrbs || 0);
        if (timeSinceLastOrbs >= 4000) {
            console.log('🔮 WITCH DARK ORBS!');
            this.darkOrbsAttack(now);
            this.skillCooldowns.darkOrbs = now;
        }
        
        // Teleport - CD 6s
        const timeSinceLastTeleport = now - (this.skillCooldowns.teleport || 0);
        if (timeSinceLastTeleport >= 6000) {
            console.log('✨ WITCH TELEPORT!');
            this.teleportAttack(now);
            this.skillCooldowns.teleport = now;
        }
    }
    
    updateTreantSkills(dt, target, now) {
        // Thorns - CD 5s
        const timeSinceLastThorns = now - (this.skillCooldowns.thorns || 0);
        if (timeSinceLastThorns >= 5000) {
            console.log('🌿 TREANT THORNS!');
            this.thornsAttack(target, now);
            this.skillCooldowns.thorns = now;
        }
        
        // Heal - CD 8s
        const timeSinceLastHeal = now - (this.skillCooldowns.heal || 0);
        if (timeSinceLastHeal >= 8000 && this.hp < this.maxHp) {
            console.log('💚 TREANT HEAL!');
            this.healAttack(now);
            this.skillCooldowns.heal = now;
        }
        
        // Roots - CD 12s
        const timeSinceLastRoots = now - (this.skillCooldowns.roots || 0);
        if (timeSinceLastRoots >= 12000) {
            const distToTarget = dist(this, target);
            if (distToTarget < 250) {
                console.log('🌱 TREANT ROOTS!');
                this.rootsAttack(target, now);
                this.skillCooldowns.roots = now;
            }
        }
    }
    
    updateNormalBossSkills(dt, target, now) {
        // Original boss teleport skill
        this.skillTimer += dt;
        if(this.skillTimer >= this.bossSkillCooldown){
            this.x = 60 + Math.random()*(W-120);
            this.y = 60 + Math.random()*(H-120);
            this.skillTimer = 0;
            flashMsg('Boss dịch chuyển!');
        }
    }
    
    jumpAttack(target) {
        if (this.isJumping) return; // Already jumping
        
        // Start jump animation
        this.isJumping = true;
        this.jumpStartTime = performance.now();
        this.jumpStartPos = {x: this.x, y: this.y};
        
        // Calculate jump target (closer to player)
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const jumpDistance = 100;
        this.jumpTargetPos = {
            x: this.x + Math.cos(angle) * jumpDistance,
            y: this.y + Math.sin(angle) * jumpDistance
        };
        
        // Clamp target position to screen bounds
        this.jumpTargetPos.x = Math.max(this.r + 10, Math.min(W - this.r - 10, this.jumpTargetPos.x));
        this.jumpTargetPos.y = Math.max(this.r + 10, Math.min(H - this.r - 10, this.jumpTargetPos.y));
        
        flashMsg('🟢 Slime chuẩn bị nhảy ép!');
    }
    
    splitSlime() {
        // Create 2 mini slimes
        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI * 2 * i) / 2;
            const distance = 50;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            const miniSlime = new Tank(x, y, '#4a9', {});
            miniSlime.hp = 3;
            miniSlime.maxHp = 3;
            miniSlime.r = 20;
            miniSlime.damage = 1;
            miniSlime.isMiniSlime = true;
            miniSlime.reload = 2000;
            miniSlime.lastShot = 0;
            
            tanks.push(miniSlime);
        }
        flashMsg('Slime phân tách!');
    }
    
    dashAttack(target) {
        // Create dash trail effect
        const startX = this.x, startY = this.y;
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const dashDistance = 120;
        
        // Create multiple trail particles
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
        
        // Dash towards target
        this.x += Math.cos(angle) * dashDistance;
        this.y += Math.sin(angle) * dashDistance;
        
        // Clamp to screen bounds
        this.x = Math.max(this.r + 10, Math.min(W - this.r - 10, this.x));
        this.y = Math.max(this.r + 10, Math.min(H - this.r - 10, this.y));
        
        // Check if hit target
        if (dist(this, target) < this.r + target.r + 15) {
            const skipDamage = devGodMode && (target === p1 || target === p2);
            if (!skipDamage) {
                target.hp -= 2; // 2 damage
                showStatus(target, '-2 HP', '#ef4444', 1500);
            }
            flashMsg('⚡ Sói lao tới trúng mục tiêu!');
            
            // Impact effect
            addExplosion({
                x: this.x, y: this.y,
                startTime: performance.now(),
                duration: 400,
                color: '#6366f1',
                radius: 50
            });
        } else {
            flashMsg('🐺 Sói dash!');
        }
    }
    
    howlAttack() {
        // Create howl wave effect
        for (let i = 0; i < 5; i++) {
            addExplosion({
                x: this.x, y: this.y,
                startTime: performance.now() + i * 100,
                duration: 800,
                color: '#1e1b4b',
                radius: 30 + i * 20,
                isWave: true
            });
        }
        
        // Reduce player speed for 2 seconds
        [p1, p2].forEach(player => {
            if (player && player.hp > 0) {
                player.moveSpeed *= 0.3; // 70% speed reduction
                showStatus(player, 'Chậm lại mạnh!', '#6366f1', 2000);
                
                setTimeout(() => {
                    if (gameMode === 'vsboss') {
                        // Reapply boss mode buffs instead of base speed
                        reapplyPermanentBuffs();
                    } else {
                        player.moveSpeed = player.baseMoveSpeed;
                    }
                }, 2000);
            }
        });
        flashMsg('🌑 Sói gầm đêm - Tốc độ giảm!');
    }
    
    groundSlamAttack(target, now) {
    const slamRadius = 80;
    
    // Visual effect
    for (let i = 0; i < 3; i++) {
        addExplosion({
            x: this.x, y: this.y,
            startTime: now + i * 150,
            duration: 600,
            color: '#78716c',
            radius: 40 + i * 25
        });
    }
    
    // Check damage to players in radius
    [p1, p2].forEach(player => {
        if (player && player.hp > 0) {
            const distToPlayer = dist(this, player);
            if (distToPlayer <= slamRadius) {
                const skipDamage = devGodMode && (player === p1 || player === p2);
                if (!skipDamage) {
                    player.hp = Math.max(0, player.hp - 3);
                    showStatus(player, '-3 HP', '#ef4444', 1500);
                    
                    // THÊM: Stun effect - GÁN TRỰC TIẾP vào player
                    player.stunned = true;
                    player.speed = 0; // Force stop movement
                    
                    // Clear stun sau 2 giây
                    setTimeout(() => {
                        if(player) {
                            player.stunned = false;
                        }
                    }, 2000);
                    
                    showStatus(player, '⚡ CHOÁNG!', '#fbbf24', 2000);
                    
                    // Visual stun effect
                    for (let j = 0; j < 3; j++) {
                        addExplosion({
                            x: player.x, y: player.y,
                            startTime: now + i * 200,
                            duration: 600,
                            color: '#fbbf24',
                            radius: 15 + i * 5,
                            isWave: true
                        });
                    }
                }
            }
        }
    });
    
    flashMsg('🗿 Golem đấm đất - Choáng 2s!');
}
    
    stoneDefenseAttack(now) {
        // Activate defense mode
        this.isDefending = true;
        this.damageReduction = 0.5; // 50% damage reduction
        
        // Visual effect
        for (let i = 0; i < 4; i++) {
            addExplosion({
                x: this.x, y: this.y,
                startTime: now + i * 200,
                duration: 800,
                color: '#fbbf24',
                radius: 35 + i * 15,
                isWave: true
            });
        }
        
        // Remove defense after 4 seconds
        setTimeout(() => {
            this.isDefending = false;
            this.damageReduction = 1;
        }, 4000);
        
        flashMsg('🛡️ Golem phòng thủ đá - Giảm sát thương!');
    }
    
    darkOrbsAttack(now) {
        // Create 3 dark orbs in random directions
        for(let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4;
            
            const bullet = new Bullet(this.x, this.y, angle, this);
            bullet.damage = 2;
            bullet.color = '#4c1d95';
            bullet.r = 8;
            bullet.glow = true;
            bullet.glowColor = '#7c3aed';
            bullet.shape = 'orb';
            
            bullets.push(bullet);
        }
        
        // Visual effect
        addExplosion({
            x: this.x, y: this.y,
            startTime: now,
            duration: 400,
            color: '#7c3aed',
            radius: 50
        });
        
        flashMsg('🔮 Phù thủy bắn cầu bóng tối!');
    }
    
    teleportAttack(now) {
        // Visual effect at old position
        addExplosion({
            x: this.x, y: this.y,
            startTime: now,
            duration: 500,
            color: '#a855f7',
            radius: 60
        });
        
        // Teleport to random position
        this.x = 60 + Math.random() * (W - 120);
        this.y = 60 + Math.random() * (H - 120);
        
        // Visual effect at new position
        addExplosion({
            x: this.x, y: this.y,
            startTime: now + 200,
            duration: 500,
            color: '#c084fc',
            radius: 60
        });
        
        flashMsg('✨ Phù thủy dịch chuyển!');
    }
    
    thornsAttack(target, now) {
        // Create line of thorns towards target
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const thornCount = 5;
        const spacing = 40;
        
        for(let i = 1; i <= thornCount; i++) {
            const thornX = this.x + Math.cos(angle) * spacing * i;
            const thornY = this.y + Math.sin(angle) * spacing * i;

            addExplosion({
                x: thornX, y: thornY,
                startTime: now + i * 100,
                duration: 800,
                color: '#16a34a',
                radius: 25
            });
            
            // Check damage to players
            [p1, p2].forEach(player => {
                if (player && player.hp > 0) {
                    const distToThorn = Math.hypot(player.x - thornX, player.y - thornY);
                    if (distToThorn <= 30) {
                        const skipDamage = devGodMode && (player === p1 || player === p2);
                        if (!skipDamage) {
                            player.hp = Math.max(0, player.hp - 3);
                            showStatus(player, '-3 HP', '#ef4444', 1500);
                        }
                    }
                }
            });
        }
        
        flashMsg('🌿 Người cây tạo gai đâm!');
    }
    
    healAttack(now) {
        // Heal self
        const healAmount = 3;
        this.hp = Math.min(this.maxHp, this.hp + healAmount);
        this.isHealing = true;
        
        // Visual effect
        for (let i = 0; i < 4; i++) {
            addExplosion({
                x: this.x, y: this.y,
                startTime: now + i * 150,
                duration: 600,
                color: '#22c55e',
                radius: 30 + i * 10,
                isWave: true
            });
        }
        
        showStatus(this, `+${healAmount} HP`, '#22c55e', 2000);
        
        // Remove healing visual after 2 seconds
        setTimeout(() => {
            this.isHealing = false;
        }, 2000);
        
        flashMsg('💚 Người cây hồi phục!');
    }
    
    rootsAttack(target, now) {
        // Root all players within range
        [p1, p2].forEach(player => {
            if (player && player.hp > 0) {
                const distToPlayer = dist(this, player);
                if (distToPlayer <= 250) {
                    player.rooted = true;
                    showStatus(player, 'Bị trói!', '#16a34a', 2000);
                    
                    // Visual effect around player
                    for (let j = 0; j < 3; j++) {
                        addExplosion({
                            x: player.x, y: player.y,
                            startTime: now + i * 100,
                            duration: 700,
                            color: '#15803d',
                            radius: 20 + j * 8,
                            isWave: true
                        });
                    }
                    
                    // Remove root after 2 seconds
                    setTimeout(() => {
                        player.rooted = false;
                    }, 2000);
                }
            }
        });
        
        flashMsg('🌱 Người cây triệu hồi rễ cây!');
    }

}
