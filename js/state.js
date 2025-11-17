import Tank from './classes/Tank.js';

// --- Player & Tank State ---
export const p1 = new Tank(110, 110, '#6fe', {
    forward: 'w', back: 's', left: 'a', right: 'd', shoot: ' '
});
export const p2 = new Tank(790, 450, '#f86', {
    forward: 'ArrowUp', back: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', shoot: 'Enter'
});

export let tanks = [p1, p2];
export function setTanks(newTanks) { tanks = newTanks; }

export let boss = null;
export function setBoss(newBoss) { boss = newBoss; }

// --- Game Entity Arrays ---
export let bullets = [];
export function setBullets(newBullets) { bullets = newBullets; }

// --- Game Flow State ---
export let gameMode = 'pvp';
export function setGameMode(mode) { gameMode = mode; }

export let scoreP1 = 0;
export let scoreP2 = 0;
export function setScore(s1, s2) { scoreP1 = s1; scoreP2 = s2; }

export let overlayText = null;
export let overlayUntil = 0;
export function setOverlay(text, until) { overlayText = text; overlayUntil = until; }

export let roundEnding = false;
export function setRoundEnding(val) { roundEnding = val; }

export let buffTimer = 0;
export function setBuffTimer(val) { buffTimer = val; }

export let buffs = [];
export function setBuffs(newBuffs) { buffs = newBuffs; }

export let enemySlowFactor = 1;
export function setEnemySlowFactor(val) { enemySlowFactor = val; }

// --- Developer State ---
export let devMode = false;
export let devNoWalls = false;
export let devGodMode = false;
export let devOneHitKill = false;

export function setDevMode(val) { devMode = val; }
export function setDevNoWalls(val) { devNoWalls = val; }
export function setDevGodMode(val) { devGodMode = val; }
export function setDevOneHitKill(val) { devOneHitKill = val; }

export let p1FocusMode = false;
export let p2FocusMode = false;
export function setP1FocusMode(val) { p1FocusMode = val; }
export function setP2FocusMode(val) { p2FocusMode = val; }
// --- Object Pools ---
export const ObjectPools = {
    bullets: [],
    effects: [],
    getBullet() {
        return this.bullets.pop() || {};
    },
    returnBullet(bullet) {
        if (bullet && this.bullets.length < 50) {
            Object.keys(bullet).forEach(key => delete bullet[key]);
            this.bullets.push(bullet);
        }
    },
    getEffect() {
        return this.effects.pop() || {};
    },
    returnEffect(effect) {
        if (effect && this.effects.length < 100) {
            Object.keys(effect).forEach(key => delete effect[key]);
            this.effects.push(effect);
        }
    }
};