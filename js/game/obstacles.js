import { W, H } from '../canvas.js';
import { clamp, circleRectColl } from '../utils.js';
import { devNoWalls } from '../state.js';

export let obstacles = [];

export function clearObstacles() {
    obstacles.length = 0;
}

export function isValidPosition(newWall, existingWalls, minGap = 50){
    for(const wall of existingWalls){
        // Kiểm tra khoảng cách giữa 2 thanh
        if(newWall.w > newWall.h){ // Thanh ngang
            if(wall.w > wall.h){ // Thanh ngang khác
                // Kiểm tra khoảng cách theo chiều dọc
                const gapY = Math.abs(newWall.y - wall.y);
                if(gapY < minGap && 
                   !(newWall.x + newWall.w < wall.x || wall.x + wall.w < newWall.x)){
                    return false;
                }
            } else { // Thanh dọc khác
                // Kiểm tra khoảng cách
                const gapX = Math.min(
                    Math.abs(newWall.x - (wall.x + wall.w)),
                    Math.abs((newWall.x + newWall.w) - wall.x)
                );
                const gapY = Math.abs(newWall.y - wall.y);
                if(gapX < minGap && gapY < minGap) return false;
            }
        } else { // Thanh dọc
            if(wall.w > wall.h){ // Thanh ngang khác
                const gapX = Math.abs(newWall.x - wall.x);
                const gapY = Math.min(
                    Math.abs(newWall.y - (wall.y + wall.h)),
                    Math.abs((newWall.y + newWall.h) - wall.y)
                );
                if(gapX < minGap && gapY < minGap) return false;
            } else { // Thanh dọc khác
                // Kiểm tra khoảng cách theo chiều ngang
                const gapX = Math.abs(newWall.x - wall.x);
                if(gapX < minGap && 
                   !(newWall.y + newWall.h < wall.y || wall.y + wall.h < newWall.y)){
                    return false;
                }
            }
        }
    }
    return true;
}

export function randomObstacles(){
    obstacles = [];
    const minGap = 50; // Khoảng cách tối thiểu giữa các thanh (tank r=16, cần ít nhất 50px)
    const wallCount = 8 + Math.floor(Math.random() * 8); // 8-15 thanh
    
    let horizontalCount = 0;
    let verticalCount = 0;
    let tries = 0;
    const maxTries = 200;
    
    while(obstacles.length < wallCount && tries < maxTries){
        tries++;
        
        // Đảm bảo có cả thanh ngang và thanh dọc
        let isHorizontal;
        if(horizontalCount === 0) isHorizontal = true;
        else if(verticalCount === 0) isHorizontal = false;
        else isHorizontal = Math.random() < 0.5;
        
        let wall;
        if(isHorizontal){
            // Thanh ngang
            const w = 40 + Math.random() * 200; // 40-240px
            const h = 8 + Math.random() * 4; // 8-12px
            const x = 20 + Math.random() * (W - w - 40);
            const y = 20 + Math.random() * (H - h - 40);
            wall = {x, y, w, h};
        } else {
            // Thanh dọc
            const w = 8 + Math.random() * 4; // 8-12px
            const h = 40 + Math.random() * 200; // 40-240px
            const x = 20 + Math.random() * (W - w - 40);
            const y = 20 + Math.random() * (H - h - 40);
            wall = {x, y, w, h};
        }
        wall.vx = 0;
        wall.vy = 0;
        wall.moving = false;
        
        // Kiểm tra khoảng cách với các thanh đã có
        if(isValidPosition(wall, obstacles, minGap)){
            obstacles.push(wall);
            if(isHorizontal) horizontalCount++;
            else verticalCount++;
        }
    }
    
    // Đảm bảo có ít nhất 1 thanh ngang và 1 thanh dọc
    if(horizontalCount === 0){
        const w = 100 + Math.random() * 150;
        const h = 8 + Math.random() * 4;
        const extra = {x: 50 + Math.random() * (W - w - 100), y: 50 + Math.random() * (H - h - 100), w, h, vx:0, vy:0, moving:false};
        obstacles.push(extra);
    }
    if(verticalCount === 0){
        const w = 8 + Math.random() * 4;
        const h = 100 + Math.random() * 150;
        const extra = {x: 50 + Math.random() * (W - w - 100), y: 50 + Math.random() * (H - h - 100), w, h, vx:0, vy:0, moving:false};
        obstacles.push(extra);
    }
    assignMovingObstacles();
}
export function assignMovingObstacles(){
    if(obstacles.length === 0) return;
    const movingCount = Math.min(8, Math.max(3, Math.floor(obstacles.length/3)));
    let assigned = 0;
    let guard = 0;
    while(assigned < movingCount && guard < 120){
        guard++;
        const idx = Math.floor(Math.random()*obstacles.length);
        const o = obstacles[idx];
        if(!o || o.moving) continue;
        o.moving = true;
        const horizontal = o.w >= o.h;
        const speed = 0.12 + Math.random() * 0.12;
        if(horizontal){
            o.vx = (Math.random() < 0.5 ? 1 : -1) * speed;
            o.vy = 0;
        } else {
            o.vx = 0;
            o.vy = (Math.random() < 0.5 ? 1 : -1) * speed;
        }
        assigned++;
    }
}


export function updateMovingObstacles(dt){
    if(devNoWalls) return;
    const delta = Math.max(0.5, dt / 16) * 2;
    for(const o of obstacles){
        if(!o || !o.moving) continue;
        if(o.vx){
            o.x += o.vx * delta;
            if(o.x < 20){
                o.x = 20;
                o.vx = Math.abs(o.vx);
            } else if(o.x + o.w > W - 20){
                o.x = W - 20 - o.w;
                o.vx = -Math.abs(o.vx);
            }
        }
        if(o.vy){
            o.y += o.vy * delta;
            if(o.y < 20){
                o.y = 20;
                o.vy = Math.abs(o.vy);
            } else if(o.y + o.h > H - 20){
                o.y = H - 20 - o.h;
                o.vy = -Math.abs(o.vy);
            }
        }
    }
}
export function drawMaze(ctx){
    if(devNoWalls) return;
    for(const o of obstacles){
        // Draw wall with beautiful brown gradient - ensure safe values
        const safeX = isFinite(o.x) ? o.x : 0;
        const safeY = isFinite(o.y) ? o.y : 0;
        const safeW = isFinite(o.w) ? o.w : 50;
        const safeH = isFinite(o.h) ? o.h : 50;
        const wallGradient = ctx.createLinearGradient(safeX, safeY, safeX + safeW, safeY + safeH);
        wallGradient.addColorStop(0, '#8b7355');
        wallGradient.addColorStop(0.5, '#6d5a47');
        wallGradient.addColorStop(1, '#4a3f35');
        
        ctx.fillStyle = wallGradient;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        
        // Add border
        ctx.strokeStyle = '#3d342a';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        
        // Add highlight
        ctx.strokeStyle = 'rgba(255,248,220,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    }
}