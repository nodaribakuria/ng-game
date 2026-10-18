function meleeAttack(){
 const w=weapons[g.weapon],angle=Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x);
 g.fire=w.rate;g.swing={time:.3,duration:.3};sound(g.weapon===5?90:430,.12);
 for(const e of g.enemies){const delta=Math.atan2(Math.sin(Math.atan2(e.y-g.p.y,e.x-g.p.x)-angle),Math.cos(Math.atan2(e.y-g.p.y,e.x-g.p.x)-angle));
  if(e.hp>0&&dist(e,g.p)<=w.range+e.r&&Math.abs(delta)<=w.arc/2&&clearLine(g.p,e,2)){e.hp-=w.damage*(1+(g.levels[g.weapon]-1)*.3);burst(e.x,e.y,w.color,8);if(g.weapon===5&&!e.boss){e.cooldown=Math.max(e.cooldown||0,.8);moveActor(e,Math.cos(angle)*30,Math.sin(angle)*30,e.r);}}
 }
}
function updateRanged(e,dt,difficulty){
 e.cooldown-=dt;const visible=clearLine(e,g.p,5),d=dist(e,g.p);
 if(e.winding>0){e.winding-=dt;if(e.winding<=0){if(visible){const a=Math.atan2(g.p.y-e.y,g.p.x-e.x);g.bullets.push({x:e.x,y:e.y,startX:e.x,startY:e.y,vx:Math.cos(a)*(e.shotSpeed||310),vy:Math.sin(a)*(e.shotSpeed||310),enemy:true,damage:e.shotDamage||12,life:3});sound(180,.04);}e.cooldown=e.shotDelay||1.7;}return;}
 if(!visible||d>460)moveEnemy(e,dt,difficulty);
 else if(d<235){const a=Math.atan2(e.y-g.p.y,e.x-g.p.x);moveActor(e,Math.cos(a)*e.speed*dt,Math.sin(a)*e.speed*dt,e.r);}
 if(visible&&d<650&&e.cooldown<=0)e.winding=.65;
}
