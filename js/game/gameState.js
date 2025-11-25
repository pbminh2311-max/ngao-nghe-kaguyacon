import {
    p1, p2, tanks, boss, setBoss, setBullets, setBuffs,
    gameMode, scoreP1, scoreP2, setScore, setOverlay, roundEnding, setRoundEnding
} from '../state.js';
import { bossMode, showBuffSelection, showBossGameOver, reapplyPermanentBuffs } from './bossMode.js';
import { clearObstacles, randomObstacles } from './obstacles.js';
import { clearAnimations } from '../rendering/animations.js';
import { applyStatSettings } from '../ui/settings.js';
import Tank from '../classes/Tank.js';
import { bullets } from '../state.js';
import { handleAdaptiveMiniDeath, tryStartCorruptedPhase } from './bossSkills.js';

export function checkWinConditions() {
    if (roundEnding || bossMode.showingBuffSelection || bossMode.showingGameOver) return;

    for (let i = tanks.length - 1; i >= 0; i--) {
        const t = tanks[i];
        if (t.hp <= 0) {
            if (t.isMiniSlime && t.adaptiveMini) {
                handleAdaptiveMiniDeath(t);
            }
            if (t.isClone || t.isMiniSlime) {
                tanks.splice(i, 1);
            } else if (t === boss) {
                // Boss defeat is handled below
            } else {

                // Only trigger PvP win condition in PvP mode
                if (gameMode === 'pvp') {
                    if (t === p1) setScore(scoreP1, scoreP2 + 1);
                    else setScore(scoreP1 + 1, scoreP2);
                    setOverlay((t === p1 ? 'P2' : 'P1') + ' WIN', performance.now() + 1000);
                    setRoundEnding(true);
                    setTimeout(() => { resetAfterKill(); setOverlay(null, 0); setRoundEnding(false); }, 1000);
                    break;
                }
            }
        }
    }

    if (!roundEnding && boss && boss.bossType === 'slime' && !boss.isCorruptedPhase && boss.hp <= 0) {
        if (tryStartCorruptedPhase(boss)) {
            return;
        }
    }

    if (!roundEnding && boss && boss.hp <= 0) {
        const index = tanks.indexOf(boss);
        if (index !== -1) tanks.splice(index, 1);
        setBoss(null);
        tanks.splice(0, tanks.length, ...tanks.filter(t => !t.isMiniSlime));
        setOverlay('BOSS DEFEATED!', performance.now() + 2000);
        setRoundEnding(true);
        setTimeout(() => {
            setOverlay(null, 0);
            setRoundEnding(false);
            showBuffSelection();
        }, 2000);
    }

    if (!roundEnding && gameMode === 'vsboss') {
        const alivePlayers = [p1, p2].filter(p => p && p.hp > 0);
        if (alivePlayers.length === 0) {
            setRoundEnding(true);
            setTimeout(() => showBossGameOver(), 50);
        }
    }
}

function resetPvPPlayerState(player, defaults) {
    if (!player || !defaults) return;
    const { x, y, angle } = defaults;
    if (typeof player.reset === 'function') player.reset();
    player.hp = player.maxHp;
    player.x = x; player.y = y; player.vx = 0; player.vy = 0; player.angle = angle;
    player.possession = false; player.possessionFired = false; player.silenced = false;
    player.rooted = false; player.stunned = false; player.isBurning = false;
    player.isIceSlowed = false; player.chargeState = 'idle'; player.shootHoldTime = 0;
    player.wasShootDown = false; player.invisible = false;
}

export function resetAfterKill() {
    if (gameMode === 'vsboss') {
        setRoundEnding(false);
        p1.x = 110; p1.y = 110; p1.vx = 0; p1.vy = 0; p1.angle = 0;
        p2.x = 790; p2.y = 450; p2.vx = 0; p2.vy = 0; p2.angle = Math.PI;
        if (boss) boss.reset();
        setBullets([]); setBuffs([]);
        tanks.splice(0, tanks.length, ...tanks.filter(t => !t.isClone && !t.isMiniSlime));
        if (!tanks.includes(p1)) tanks.push(p1);
        if (!tanks.includes(p2)) tanks.push(p2);
        reapplyPermanentBuffs();
        p1.hp = p1.maxHp; p2.hp = p2.maxHp;
        reapplyPermanentBuffs();
    } else {
        resetPvPPlayerState(p1, { x: 110, y: 110, angle: 0 });
        resetPvPPlayerState(p2, { x: 790, y: 450, angle: Math.PI });
        setBullets([]); setBuffs([]);
        tanks.splice(0, tanks.length, p1, p2);
        setBoss(null);
    }
    clearObstacles(); clearAnimations(); randomObstacles();
    if (typeof applyStatSettings === 'function') applyStatSettings();
}

export function spawnMiniTankCompanion(tank) {
    const clone = new Tank(tank.x + 30, tank.y + 30, tank.color, {});
    clone.isClone = true;
    clone.hp = tank.hp;
    clone.moveSpeed = 0;
    clone.friction = 1;
    clone.baseMoveSpeed = clone.moveSpeed;
    clone.baseFriction = clone.friction;
    clone.baseReloadRate = clone.reloadRate;
    clone.baseRadius = clone.r;
    clone.baseControls = { ...clone.controls };
    clone.reloadRate = 0;
    clone.reloadCooldown = 0;
    clone.explosive = tank.explosive || false;
    clone.bigBullet = tank.bigBullet || false;
    clone.ricochet = tank.ricochet || false;
    clone.pierce = tank.pierce || false;
    clone.poisonBullet = tank.poisonBullet || false;
    clone.canShoot = function (now) { return now - this.lastShot >= 3000 && this.ammo > 0; };
    clone.maxAmmo = 3;
    clone.ammo = clone.maxAmmo;
    clone.update = function (dt, input) {
        Tank.prototype.update.call(this, dt, {});
        this.speed = 0;
        let target = null;
        if (gameMode === 'vsboss' && boss) {
            target = boss;
        } else {
            const opponent = (tank === p1) ? p2 : p1;
            if (opponent && opponent.hp > 0) {
                target = opponent;
            } else {
                target = tanks.find(t => t.isClone && t.hp > 0 && t.color !== this.color) || null;
            }
        }
        if (target && target.hp > 0) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            const now = performance.now();
            if (this.canShoot(now)) {
                const b = this.shoot(now);
                if (b) bullets.push(b);
            }
        } else {
            // No target, do nothing.
        }
        if (this.ammo <= 0 && !this.pendingRemoval) {
            this.pendingRemoval = true;
            this.fadeOutTimer = 600;
        }
    };
    tanks.push(clone);
}