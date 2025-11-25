export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const normalizeAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));

export function getDebuffDurationMultiplier(target) {
    if (!target) return 1;
    const value = typeof target.debuffDurationMultiplier === 'number' ? target.debuffDurationMultiplier : 1;
    return clamp(value, 0.3, 1);
}

export function getBossBuffName(buffType) {
    const names = {
        lifeSteal: '🧛 Hút Máu',
        bounceShot: '↺ Nảy Đa Hồi',
        bossPierce: '⤫ Xuyên Thấu',
        bossFireRate: '⚡ Tốc Độ Bắn',
        bossMoveSpeed: '🏃 Tốc Độ Di Chuyển',
        twinShot: '✦ Song Đạn',
        magnetSmall: '🧲 Hút Nhỏ',
        shotSplit: '⚛️ Phân Tách Đạn',
        shotSplit4: '⚛️×4 Đạn Chia 4',
        ricochetTracking: '🎯 Ricochet Tracking',
        poisonShot: '☠️ Poison Shot',
        microShield: '🧿 MicroShield',
        bossShield: '🛡️ Khiên Bảo Hộ',
        slowMotion10: '🐢 Làm Chậm 20%',
        fireIceShot: '🔥❄️ Đạn Hỏa/Băng',
        criticalHit: '💥 Chí Mạng',
        damageBoost: '💪 Tăng Damage',
        maxHpUp: '❤️ Tăng Máu Tối Đa',
        bulletDeflect: '🛡️ Phản Xạ Đạn',
        debuffResistance: '🧬 Kháng Hiệu Ứng Xấu',
        luckUp: '🍀 May Mắn',
        miniTank: '🤖 Xe Tăng Mini',
        doubleShot: '➿ Nhân Đôi Đạn'
    };
    return names[buffType] || buffType;
}

export function roundRect(ctx,x,y,w,h,r,fill,stroke){
    ctx.beginPath(); ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    if(fill) ctx.fill(); if(stroke) ctx.stroke();
}

export function drawEffectRing(ctx,x,y,radius,color,{lineWidth=3,alpha=1,dash=null,glow=false}={}){
    if(radius<=0) return;
    ctx.save();

    // Lớp lót màu tối để tăng độ tương phản trên nền sáng
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = 'rgba(20, 30, 45, 0.8)';
    ctx.lineWidth = lineWidth + 2; // Dày hơn một chút
    if(dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.stroke();

    // Lớp hiệu ứng chính
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if(glow){
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
    }
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.stroke();

    ctx.restore();
}

export function drawChainAround(ctx,x,y,radius,color,linkCount=10){
    if(radius<=0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([8,6]);
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);
    const linkRadius = radius + 4;
    for(let i=0;i<linkCount;i++){
        const ang = (i/linkCount)*Math.PI*2;
        const lx = x + Math.cos(ang)*radius;
        const ly = y + Math.sin(ang)*radius;
        ctx.save();
        ctx.translate(lx,ly);
        ctx.rotate(ang);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-6,-3,12,6);
        ctx.restore();
    }
    ctx.restore();
}

// Optimized collision detection with early exits
export function lineCircleColl(x1, y1, x2, y2, cx, cy, r) {
    const acx = cx - x1, acy = cy - y1;
    const abx = x2 - x1, aby = y2 - y1;
    const ab2 = abx*abx + aby*aby;
    
    // Early exit: zero-length line
    if (ab2 === 0) {
        return acx*acx + acy*acy <= r*r;
    }
    
    // Early exit: check if circle is too far from line endpoints
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
    if (lenSq === 0) {
        return Math.hypot(px - x1, py - y1);
    }
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    return Math.hypot(px - xx, py - yy);
}

// Phiên bản không căn bậc hai để so sánh nhanh trong vòng lặp
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

// Hàm kiểm tra 2 đoạn thẳng có cắt nhau không
export function lineLineColl(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false; // Song song
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Hàm kiểm tra đoạn thẳng có cắt hình chữ nhật không (để tránh đạn xuyên tường)
export function lineRectColl(x1, y1, x2, y2, rx, ry, rw, rh, bulletR = 0) {
    // Mở rộng hình chữ nhật bằng bán kính đạn
    const minX = rx - bulletR;
    const minY = ry - bulletR;
    const maxX = rx + rw + bulletR;
    const maxY = ry + rh + bulletR;
    
    // Kiểm tra nếu cả 2 điểm đều nằm ngoài cùng một phía của hình chữ nhật
    if ((x1 < minX && x2 < minX) || (x1 > maxX && x2 > maxX) ||
        (y1 < minY && y2 < minY) || (y1 > maxY && y2 > maxY)) {
        return false;
    }
    
    // Kiểm tra nếu đoạn thẳng cắt bất kỳ cạnh nào của hình chữ nhật
    // Hoặc nếu một trong hai điểm nằm trong hình chữ nhật
    if ((x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) ||
        (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY)) {
        return true;
    }
    
    // Kiểm tra cắt 4 cạnh của hình chữ nhật
    if (lineLineColl(x1, y1, x2, y2, minX, minY, maxX, minY)) return true;
    if (lineLineColl(x1, y1, x2, y2, minX, maxY, maxX, maxY)) return true;
    if (lineLineColl(x1, y1, x2, y2, minX, minY, minX, maxY)) return true;
    if (lineLineColl(x1, y1, x2, y2, maxX, minY, maxX, maxY)) return true;
    
    return false;
}

// Hàm tìm t của điểm giao nhau giữa 2 đoạn thẳng (trả về t của đoạn đầu tiên)
export function lineLineIntersectionT(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null; // Song song
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return t;
    }
    return null;
}

// Hàm tìm điểm va chạm giữa đường đi của đạn và tường (trả về t từ 0-1)
export function findCollisionPoint(x1, y1, x2, y2, rect, bulletR) {
    // Mở rộng hình chữ nhật bằng bán kính đạn
    const minX = rect.x - bulletR;
    const minY = rect.y - bulletR;
    const maxX = rect.x + rect.w + bulletR;
    const maxY = rect.y + rect.h + bulletR;
    
    // Kiểm tra nếu cả 2 điểm đều nằm ngoài cùng một phía
    if ((x1 < minX && x2 < minX) || (x1 > maxX && x2 > maxX) ||
        (y1 < minY && y2 < minY) || (y1 > maxY && y2 > maxY)) {
        return null;
    }
    
    let minT = 1;
    let found = false;
    
    // Kiểm tra 4 cạnh của hình chữ nhật
    const edges = [
        [minX, minY, maxX, minY], // Cạnh trên
        [maxX, minY, maxX, maxY], // Cạnh phải
        [maxX, maxY, minX, maxY], // Cạnh dưới
        [minX, maxY, minX, minY]  // Cạnh trái
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

// Optimized circle-rectangle collision with early AABB check
export function circleRectColl(c,r){
    const padding = 1;
    const cr = c.r;
    
    // Early AABB check
    if (c.x + cr < r.x - padding || c.x - cr > r.x + r.w + padding ||
        c.y + cr < r.y - padding || c.y - cr > r.y + r.h + padding) {
        return false;
    }
    
    const cx = clamp(c.x, r.x - padding, r.x + r.w + padding);
    const cy = clamp(c.y, r.y - padding, r.y + r.h + padding);
    const dx = c.x - cx, dy = c.y - cy;
    return dx*dx + dy*dy <= cr*cr;
}

// Optimized circle collision with early distance check
export function circleColl(a, b){
    const ar = a.r || 0, br = b.r || 0;
    const rSum = ar + br;
    
    // Early exit: rough distance check
    const dx = a.x - b.x;
    if (Math.abs(dx) > rSum) return false;
    
    const dy = a.y - b.y;
    if (Math.abs(dy) > rSum) return false;
    
    return dx*dx + dy*dy <= rSum*rSum;
}
