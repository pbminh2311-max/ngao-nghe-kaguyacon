import { tanks, devNoWalls } from '../state.js';
import { dist, clamp } from '../utils.js';
import { W, H } from '../canvas.js';
import { obstacles } from './obstacles.js';


export function resolveTankTank(a,b){
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    let d = Math.hypot(dx, dy);
    const min = a.r + b.r + 2;
    if (d < 0.0001) { // tránh chia cho 0: đẩy hai tank ra theo hướng ngẫu nhiên nhỏ
        const ang = Math.random() * Math.PI * 2;
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        d = 0.0001;
    }
    if (d < min){
        const nx = dx / d, ny = dy / d, overlap = min - d;
        a.x += nx * overlap * 0.5; a.y += ny * overlap * 0.5;
        b.x -= nx * overlap * 0.5; b.y -= ny * overlap * 0.5;
    }
}

export function resolveTankObstacles(t){
    // Giữ tank trong giới hạn bản đồ
    t.x = clamp(t.x, t.r + 4, W - t.r - 4);
    t.y = clamp(t.y, t.r + 4, H - t.r - 4);

    if(devNoWalls) return;

    // Kiểm tra va chạm với vật cản
    for (const o of obstacles) {
        if (circleRectColl({ x: t.x, y: t.y, r: t.r }, o)) {
            const cx = o.x + o.w/2, cy = o.y + o.h/2;
            
            // Xác định cạnh nào của tường bị va chạm
            const distToLeft = Math.abs(t.x - o.x);
            const distToRight = Math.abs(t.x - (o.x + o.w));
            const distToTop = Math.abs(t.y - o.y);
            const distToBottom = Math.abs(t.y - (o.y + o.h));
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            // Đẩy tank ra khỏi tường mà không thay đổi hướng
            const pushStrength = o.moving ? 0.2 : 0.6; // Gentler push for moving obstacles
            
            if(minDist === distToLeft || minDist === distToRight){
                // Va chạm cạnh trái/phải - chỉ đẩy theo chiều ngang
                const targetX = minDist === distToLeft ? o.x - t.r - 1 : o.x + o.w + t.r + 1;
                t.x += (targetX - t.x) * pushStrength;
                // Giảm tốc độ nhưng không thay đổi hướng
                t.speed *= 0.5;
            } else {
                // Va chạm cạnh trên/dưới - chỉ đẩy theo chiều dọc
                const targetY = minDist === distToTop ? o.y - t.r - 1 : o.y + o.h + t.r + 1;
                t.y += (targetY - t.y) * pushStrength;
                // Giảm tốc độ nhưng không thay đổi hướng
                t.speed *= 0.5;
            }
        }
    }
}

export function isSameTeam(a,b){
    if(!a || !b) return false;
    if(a === b) return true;
    if(!a.color || !b.color) return false;
    return a.color === b.color;
}

// --- Collision Detection Utilities (moved from utils.js) ---

export function lineCircleColl(x1, y1, x2, y2, cx, cy, r) {
    const acx = cx - x1, acy = cy - y1;
    const abx = x2 - x1, aby = y2 - y1;
    const ab2 = abx*abx + aby*aby;
    if (ab2 === 0) return acx*acx + acy*acy <= r*r;
    const r2 = r*r;
    const dist1 = acx*acx + acy*acy;
    const bcx = cx - x2, bcy = cy - y2;
    const dist2 = bcx*bcx + bcy*bcy;
    if (dist1 <= r2 || dist2 <= r2) return true;
    const acab = acx*abx + acy*aby;
    let t = acab / ab2;
    t = Math.max(0, Math.min(1, t));
    const hx = x1 + abx*t;
    const hy = y1 + aby*t;
    const dx = cx - hx, dy = cy - hy;
    return dx*dx + dy*dy <= r2;
}

export function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    return Math.hypot(px - xx, py - yy);
}

export function pointToLineDistanceSq(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const lenSq = C * C + D * D;
    if (lenSq === 0) {
        const dx0 = px - x1, dy0 = py - y1;
        return dx0*dx0 + dy0*dy0;
    }
    let param = (A * C + B * D) / lenSq;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    const dx = px - xx, dy = py - yy;
    return dx*dx + dy*dy;
}

export function lineLineColl(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function lineRectColl(x1, y1, x2, y2, rx, ry, rw, rh, bulletR = 0) {
    const minX = rx - bulletR;
    const minY = ry - bulletR;
    const maxX = rx + rw + bulletR;
    const maxY = ry + rh + bulletR;
    if ((x1 < minX && x2 < minX) || (x1 > maxX && x2 > maxX) ||
        (y1 < minY && y2 < minY) || (y1 > maxY && y2 > maxY)) {
        return false;
    }
    if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
        (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
        return true;
    }
    if (lineLineColl(x1, y1, x2, y2, minX, minY, maxX, minY)) return true;
    if (lineLineColl(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true;
    if (lineLineColl(x1, y1, x2, y2, minX, minY, minX, maxY)) return true;
    if (lineLineColl(x1, y1, x2, y2, maxX, minY, maxX, maxY)) return true;
    return false;
}

export function lineLineIntersectionT(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return t;
    }
    return null;
}

export function findCollisionPoint(x1, y1, x2, y2, rect, bulletR) {
    const minX = rect.x - bulletR;
    const minY = rect.y - bulletR;
    const maxX = rect.x + rect.w + bulletR;
    const maxY = rect.y + rect.h + bulletR;
    if ((x1 < minX && x2 < minX) || (x1 > maxX && x2 > maxX) ||
        (y1 < minY && y2 < minY) || (y1 > maxY && y2 > maxY)) {
        return null;
    }
    let minT = 1;
    let found = false;
    const edges = [
        [minX, minY, maxX, minY], // Top
        [maxX, minY, maxX, maxY], // Right
        [maxX, maxY, minX, maxY], // Bottom
        [minX, maxY, minX, minY]  // Left
    ];
    for(const edge of edges){
        const t = lineLineIntersectionT(x1, y1, x2, y2, edge[0], edge[1], edge[2], edge[3]);
        if(t !== null && t >= 0 && t < minT){
            minT = t;
            found = true;
        }
    }
    return found ? minT : null;
}

export function circleRectColl(c,r){
    const padding = 1;
    const cr = c.r;
    if (c.x + cr < r.x - padding || c.x - cr > r.x + r.w + padding ||
        c.y + cr < r.y - padding || c.y - cr > r.y + r.h + padding) {
        return false;
    }
    const cx = clamp(c.x, r.x - padding, r.x + r.w + padding);
    const cy = clamp(c.y, r.y - padding, r.y + r.h + padding);
    const dx = c.x - cx, dy = c.y - cy;
    return dx*dx + dy*dy <= cr*cr;
}

export function circleColl(a, b){
    const ar = a.r || 0, br = b.r || 0;
    const rSum = ar + br;
    const dx = a.x - b.x;
    if (Math.abs(dx) > rSum) return false;
    const dy = a.y - b.y;
    if (Math.abs(dy) > rSum) return false;
    return dx*dx + dy*dy <= rSum*rSum;
}


export function pickHomingTarget(bullet){
    const owner = bullet.owner;
    const candidates = [];
    for(const t of tanks){
        if(!t || t.hp <= 0 || t.invisible || t === owner || t.pendingRemoval) continue;
        if(owner && isSameTeam(t, owner)) continue;
        candidates.push(t);
    }
    if(candidates.length === 0){
        return null;
    }
    let best = null;
    let bestDist = Infinity;
    for(const t of candidates){
        const dx = t.x - bullet.x;
        const dy = t.y - bullet.y;
        const d2 = dx*dx + dy*dy;
        if(d2 < bestDist){
            bestDist = d2;
            best = t;
        }
    }
    return best;
}