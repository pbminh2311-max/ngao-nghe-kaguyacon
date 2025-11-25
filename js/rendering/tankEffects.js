import { drawHealEffect } from './heal.js';
import { drawSpeedEffect } from './speed.js';
import { drawHomingTargetMarker, drawHomingBarrelEffect } from './homing.js';
import { drawShrinkEffect } from './shrink.js';
import { drawShieldEffect } from './shield.js';
import { drawRapidfireEffect, drawRapidfireBarrelEffect } from './rapidfire.js';
import { drawBigBulletEffect, drawBigBulletBarrelEffect } from './bigbullet.js';
import { drawCloneEffect } from './clone.js';
import { drawShotgunEffect, drawShotgunBarrelEffect } from './shotgun.js';
import { drawRicochetEffect, drawRicochetBarrelEffect } from './ricochet.js';
import { drawOtherEffects } from './other.js';
import { drawPierceEffect } from '../classes/pierce.js';
import { drawPoisonEffect } from '../classes/poison.js';
import { drawTrailEffect } from './trail.js';
import { drawFuryEffect, drawFuryBarrelEffect } from './fury.js';
import { drawGiantEnemyEffect } from './giantEnemy.js';
import { drawReverseEffect } from './reverse.js';
import { drawRootEffect } from './root.js';
import { drawSilenceEffect } from './silence.js';
import { drawPossessionEffect } from './possession.js';
import { drawExplosiveEffect, drawExplosiveBarrelEffect } from './explosive.js';
import { drawCorruptedAbsorbEffect } from './corruptedAbsorb.js';

export function drawTankEffects(ctx, tank) {
    const now = performance.now();
    drawHealEffect(ctx, tank, now);
    drawSpeedEffect(ctx, tank, now);
    drawHomingTargetMarker(ctx, tank, now);
    drawShrinkEffect(ctx, tank, now);
    drawShieldEffect(ctx, tank, now);
    drawRapidfireEffect(ctx, tank, now);
    drawCloneEffect(ctx, tank, now);
    drawShotgunEffect(ctx, tank, now);
    drawRicochetEffect(ctx, tank, now);
    drawPierceEffect(ctx, tank, now);
    drawTrailEffect(ctx, tank, now);
    drawGiantEnemyEffect(ctx, tank, now);
    drawReverseEffect(ctx, tank, now);
    drawRootEffect(ctx, tank, now);
    drawSilenceEffect(ctx, tank, now);
    drawPossessionEffect(ctx, tank, now);
    drawFuryEffect(ctx, tank, now);
    drawPoisonEffect(ctx, tank, now);
    drawExplosiveEffect(ctx, tank, now);
    drawBigBulletEffect(ctx, tank, now);

    // Vẽ hiệu ứng của boss
    if (tank.isBoss) {
        drawCorruptedAbsorbEffect(ctx, tank, now);
    }
    drawOtherEffects(ctx, tank);
}

export function drawBarrelEffects(ctx, tank, barrelMetrics) {
    const now = performance.now();
    drawHomingBarrelEffect(ctx, tank, barrelMetrics, now);
    drawRapidfireBarrelEffect(ctx, tank, barrelMetrics, now);
    drawBigBulletBarrelEffect(ctx, tank, barrelMetrics, now);
    drawShotgunBarrelEffect(ctx, tank, barrelMetrics, now);
    drawRicochetBarrelEffect(ctx, tank, barrelMetrics, now);
    drawExplosiveBarrelEffect(ctx, tank, barrelMetrics, now);
    drawFuryBarrelEffect(ctx, tank, barrelMetrics, now);
}