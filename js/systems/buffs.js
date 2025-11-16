import { BUFF_COLORS, buffTypes, bossModeBuffs } from '../constants.js';
import { applyEffect, showStatus, tagEffect } from './effects.js';
import { flashMsg } from '../main.js';
import { p1, p2 } from '../state.js';

export const BuffFactory = {
    createEffect(target, type, duration, config = {}) {
        if (!target) return null;

        const playerName =
            target === p1 ? 'P1' :
            target === p2 ? 'P2' : 'Tank';

        const color = BUFF_COLORS[type] || '#fff';

        const toggleMap = {
            homing:       ['homing',       'Đạn tự dẫn'],
            invis:        ['invisible',    'Tàng hình'],
            shield:       ['shield',       'Khiên'],
            bigbullet:    ['bigBullet',    'Đạn to'],
            shotgun:      ['shotgun',      'Bắn chùm'],
            ricochet:     ['ricochet',     'Nảy vô hạn'],
            explosive:    ['explosive',    'Đạn nổ'],
            pierce:       ['pierce',       'Đạn xuyên'],
            poisonShots:  ['poisonBullet', 'Đạn độc'],
            trail:        ['trailBullet',  'Dung nham']
        };

        if (toggleMap[type]) {
            const [prop, label] = toggleMap[type];
            const trueColor = type === 'poisonShots'
                ? BUFF_COLORS.poison
                : color;

            return this.createToggleEffect(
                target, prop, duration, trueColor, playerName, label
            );
        }

        switch(type) {
            case 'heal':  return this.createHealEffect(target, duration, color, playerName);
            case 'speed': return this.createSpeedEffect(target, duration, color, playerName);
        }

        return null;
    },

    createToggleEffect(target, property, duration, color, playerName, label) {
        const effect = applyEffect(
            target,
            property,
            duration,
            () => { target[property] = true; },       // On Start
            () => { target[property] = false; }       // On End
        );

        tagEffect(effect, label, color);
        showStatus(target, label, color);

        flashMsg(`${playerName} có ${label.toLowerCase()}!`);
        return effect;
    },

    createHealEffect(target, duration, color, playerName) {
        const effect = applyEffect(
            target,
            'heal',
            duration,
            (state) => {
                state.healRate = 0.1;
                state.healTimer = 0;
            },
            null,
            (dt, tank, state) => {
                if (!state) return;

                state.healTimer += dt;

                if (state.healTimer >= 1000) {
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
        const effect = applyEffect(
            target,
            'speed',
            duration,
            (state) => {
                state.originalMoveSpeed = target.moveSpeed;
                state.originalFriction = target.friction;

                target.moveSpeed *= 2;
                target.friction = 0.9;
            },
            (state) => {
                target.moveSpeed =
                    state?.originalMoveSpeed ?? target.baseMoveSpeed;

                target.friction =
                    state?.originalFriction ?? target.baseFriction;
            }
        );

        tagEffect(effect, 'Tăng tốc', color);
        showStatus(target, 'Tăng tốc', color);

        flashMsg(`${playerName} tăng tốc!`);
        return effect;
    }
};
