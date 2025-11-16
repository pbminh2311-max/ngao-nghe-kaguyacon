import { BUFF_COLORS, buffTypes, bossModeBuffs } from '../constants.js';
import { applyEffect, showStatus, tagEffect } from './effects.js';
import { flashMsg } from '../main.js';
import { p1, p2 } from '../state.js';

export const BuffFactory = {
    createEffect(target, type, duration, config = {}) {
        const playerName = target === p1 ? 'P1' : target === p2 ? 'P2' : 'Tank';
        const color = BUFF_COLORS[type] || '#fff';
        
        switch(type) {
            case 'heal':
                return this.createHealEffect(target, duration, color, playerName);
            case 'speed':
                return this.createSpeedEffect(target, duration, color, playerName);
            case 'homing':
                return this.createToggleEffect(target, 'homing', duration, color, playerName, 'Đạn tự dẫn');
            case 'invis':
                return this.createToggleEffect(target, 'invisible', duration, color, playerName, 'Tàng hình');
            case 'shield':
                return this.createToggleEffect(target, 'shield', duration, color, playerName, 'Khiên');
            case 'bigbullet':
                return this.createToggleEffect(target, 'bigBullet', duration, color, playerName, 'Đạn to');
            case 'shotgun':
                return this.createToggleEffect(target, 'shotgun', duration, color, playerName, 'Bắn chùm');
            case 'ricochet':
                return this.createToggleEffect(target, 'ricochet', duration, color, playerName, 'Nảy vô hạn');
            case 'explosive':
                return this.createToggleEffect(target, 'explosive', duration, color, playerName, 'Đạn nổ');
            case 'pierce':
                return this.createToggleEffect(target, 'pierce', duration, color, playerName, 'Đạn xuyên');
            case 'poisonShots':
                return this.createToggleEffect(target, 'poisonBullet', duration, BUFF_COLORS.poison, playerName, 'Đạn độc');
            case 'trail':
                return this.createToggleEffect(target, 'trailBullet', duration, color, playerName, 'Dung nham');
            default:
                return null;
        }
    },
    
    createToggleEffect(target, property, duration, color, playerName, label) {
        const effect = applyEffect(target, property, duration,
            () => { target[property] = true; },
            () => { target[property] = false; }
        );
        tagEffect(effect, label, color);
        showStatus(target, label, color);
        flashMsg(`${playerName} có ${label.toLowerCase()}!`);
        return effect;
    },
    
    createHealEffect(target, duration, color, playerName) {
        const effect = applyEffect(target, 'heal', duration,
            state => {
                state.healRate = 0.1;
                state.healTimer = 0;
            },
            null,
            (dt, tank, state) => {
                state.healTimer += dt;
                if(state.healTimer >= 1000) {
                    tank.hp = Math.min(tank.maxHp, tank.hp + state.healRate);
                    state.healTimer = 0;
                    showStatus(tank, 'Hồi máu', color, 600);
                }
            }
        );
        tagEffect(effect, 'Hồi máu', color);
        showStatus(target, 'Hồi máu', color);
        target.healPulseTimer = 320;
        flashMsg(`${playerName} hồi máu!`);
        return effect;
    },
    
    createSpeedEffect(target, duration, color, playerName) {
        const effect = applyEffect(target, 'speed', duration,
            state => {
                state.originalMoveSpeed = target.moveSpeed;
                state.originalFriction = target.friction;
                target.moveSpeed *= 2;
                target.friction = 0.9;
            },
            state => {
                if(state && state.originalMoveSpeed !== undefined) target.moveSpeed = state.originalMoveSpeed;
                else target.moveSpeed = target.baseMoveSpeed;
                if(state && state.originalFriction !== undefined) target.friction = state.originalFriction;
                else target.friction = target.baseFriction;
            }
        );
        tagEffect(effect, 'Tăng tốc', color);
        showStatus(target, 'Tăng tốc', color);
        flashMsg(`${playerName} tăng tốc!`);
        return effect;
    }
};