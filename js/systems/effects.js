import { BUFF_COLORS } from '../constants.js';
import { devGodMode, p1, p2, tanks } from '../state.js';
import Tank from '../classes/Tank.js';
import Boss from '../classes/Boss.js';

export function updateAllEffects(dt) {
    for (const tank of tanks) {
        if (!tank || !tank.activeEffects) continue;

        for (const key in tank.activeEffects) {
            const effect = tank.activeEffects[key];
            if (!effect || effect.cancelled) continue;

            if (typeof effect.onUpdate === 'function') {
                effect.onUpdate(dt, tank, effect);
            }
        }
    }
}

export function styleBulletForOwner(bullet, owner){
    if(!bullet || !owner) return;
    bullet.shape = 'circle';
    bullet.guidelineColor = null;
    bullet.glow = false;
    bullet.explosionRadius = 80;
    
    // Special styling for boss bullets
    if (owner instanceof Boss) {
        bullet.r = 8; // Larger boss bullets
        bullet.glow = true;
        bullet.glowColor = owner.color;
        bullet.glowIntensity = 15;
        
        // Boss type specific bullet effects
        switch(owner.bossType) {
            case 'slime':
                bullet.color = '#4ade80';
                bullet.shape = 'slime';
                bullet.wobbleSpeed = 0.005;
                break;
            case 'wolf':
                bullet.color = '#6366f1';
                bullet.shape = 'energy';
                bullet.trailLength = 8;
                break;
            default:
                bullet.color = '#ef4444';
                bullet.shape = 'tech';
                bullet.pulseSpeed = 0.008;
                break;
        }
        return;
    }
    const isHoming = !!owner.homing;
    const isExplosive = !!owner.explosive;
    const isRicochet = !!owner.ricochet;
    const isPierce = !!owner.pierce;
    const hasPoison = !!owner.poisonBullet;
    const hasTrail = !!owner.trailBullet;
    const hasRapidfire = !!owner.rapidfire;
    const hasShotgun = !!owner.shotgun;
    const hasBigBullet = !!owner.bigBullet;

    bullet.isHoming = isHoming;
    bullet.isExplosive = isExplosive;
    bullet.isRicochet = isRicochet;
    bullet.isPiercing = isPierce;
    bullet.isPoison = hasPoison;
    bullet.isTrail = hasTrail;
    if(isPierce && !bullet.piercedTargets){
        bullet.piercedTargets = new Set();
    }

    bullet.maxBounces = isRicochet ? Infinity : 8;
    if(isExplosive){
        bullet.maxBounces = 0;
        bullet.shape = 'square';
        bullet.explosionRadius = 180;
        bullet.r = Math.max(bullet.r, 5);
    } else {
        bullet.maxBounces = isRicochet ? Infinity : 8;
    }

    if(hasBigBullet){
        bullet.r = 8;
    } else if(hasRapidfire){
        bullet.r = 3;
    } else {
        bullet.r = 4;
    }

    if(isPierce){
        bullet.r = Math.max(bullet.r, 4.5);
    }

    if(hasShotgun && !hasBigBullet){
        bullet.r = Math.max(bullet.r, 4.5);
    }

    const colorOrder = ['poison','pierce','ricochet','rapidfire','shotgun','bigBullet','homing','explosive','trailBullet'];
    const colorLookup = {
        poison: BUFF_COLORS.poison,
        pierce: BUFF_COLORS.pierce,
        ricochet: BUFF_COLORS.ricochet,
        rapidfire: BUFF_COLORS.rapidfire,
        shotgun: BUFF_COLORS.shotgun,
        bigBullet: BUFF_COLORS.bigbullet,
        homing: BUFF_COLORS.homing,
        explosive: BUFF_COLORS.explosive,
        trailBullet: BUFF_COLORS.trail
    };
    let color = '#f33';
    for(const key of colorOrder){
        if(owner[key]){
            color = colorLookup[key];
        }
    }
    bullet.color = color;

    if(isHoming){
        bullet.guidelineColor = '#f44336';
        bullet.glow = true;
    } else if(isPierce){
        bullet.guidelineColor = '#5fd6ff';
    }
    if(hasRapidfire || isRicochet || hasBigBullet || hasShotgun || isExplosive || isPierce || hasPoison){
        bullet.glow = true;
    }
    if(hasPoison){
        bullet.poisonPulse = 0;
    }
}
export function tagEffect(state,label,color){
    if(!state) return;
    state.meta = state.meta || {};
    if(label) state.meta.label = label;
    if(color) state.meta.color = color;
}
export function showStatus(t, text, color='#eaf2ff', duration=1500){
    if(!t) return;
    t.statusText = text;
    t.statusColor = color;
    t.statusTimer = duration;
}
export function applyEffect(target,name,duration,applyFn,revertFn,onUpdate){
    if(!target) return;
    if(!target.activeEffects) target.activeEffects = {};
    let state = target.activeEffects[name];
    if(!state){
        state = {cancelled:false};
        target.activeEffects[name] = state;
        if(applyFn) applyFn(state);
    } else {
        if(state.timeout) clearTimeout(state.timeout);
    }
    state.cancelled = false;
    state.version = target.stateVersion || 0;
    state.onUpdate = onUpdate; // Store the onUpdate callback
    const now = performance.now();
    state.start = now;
    state.duration = duration;
    state.expires = now + duration;
    state.timeout = setTimeout(()=>{
        if(state.cancelled) return;
        if((target.stateVersion || 0) !== state.version) return;
        if(target.activeEffects[name] !== state) return;
        if(revertFn) revertFn(state);
        delete target.activeEffects[name];
    }, duration);
    state.revert = revertFn;
    return state;
}

export function applyPoisonEffect(target, duration=2000){
    if(!target || target.hp <= 0) return;
    if(devGodMode && (target === p1 || target === p2)) return;
    
    const color = BUFF_COLORS.poison;
    const now = performance.now();
    const existing = target.activeEffects ? target.activeEffects.poison : null;
    const prevRemaining = existing && existing.expires ? Math.max(0, existing.expires - now) : 0;
    const totalDuration = prevRemaining + duration;
    const prevStack = existing ? (existing.stack || 1) : 0;
    
    const effPoison = applyEffect(target,'poison',totalDuration,
        state=>{
            state.stack = 1;
            state.damagePerSecond = 0.3;
            state.meta = state.meta || {};
            state.meta.color = color;
            state.meta.label = `Độc x1`; // Khởi tạo label
        },
        state=>{
            if(state){
                state.stack = 0;
            }
        },
        // onUpdate callback
        function(dt, tank, st){
            if(!tank || tank.hp <= 0) return;
            if(tank.shield) return;
            const stacks = st.stack || 1;
            const dps = st.damagePerSecond || 0.3;
            const damage = dps * stacks * dt / 1000;
            if(damage > 0){
                tank.hp = Math.max(0, tank.hp - damage);
            }
        }
    );
    
    effPoison.stack = prevStack + 1;
    effPoison.damagePerSecond = 0.3;
    effPoison.meta = effPoison.meta || {};
    effPoison.meta.color = color;
    effPoison.meta.label = `Độc x${effPoison.stack}`;
    
    showStatus(target,'Nhiễm độc', color, 1200);
}