import { BUFF_COLORS } from '../constants.js';
export default
class Buff{
    constructor(x,y,type){this.x=x;this.y=y;this.r=10;this.type=type;this.active=true;
        this.color = BUFF_COLORS[type] || '#fff';
    }

    draw(ctx){
        if(!this.active) return;
        ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
        ctx.fillStyle=this.color; ctx.shadowColor=this.color; ctx.shadowBlur=10; ctx.fill();
        ctx.shadowBlur=0; ctx.strokeStyle='#000'; ctx.stroke();
    }
}