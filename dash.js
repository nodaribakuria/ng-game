// Movement uses the same swept collision checks as walking.
function dash(){
 if(mode!=='playing'||!g||g.stage==='training'||(g.p.dashCooldown||0)>0)return;
 let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
 let y=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 if(!x&&!y){x=mouse.x-g.p.x;y=mouse.y-g.p.y;}
 const length=Math.hypot(x,y);if(length<.01)return;
 g.p.dashX=x/length;g.p.dashY=y/length;g.p.dashTime=.18;g.p.dashCooldown=3;
 g.p.inv=Math.max(g.p.inv,.18);sound(240,.12);
}
function dashStep(dt){
 const p=g.p;p.dashCooldown=Math.max(0,(p.dashCooldown||0)-dt);
 const time=Math.min(dt,p.dashTime||0);if(!time)return false;
 moveActor(p,p.dashX*1000*time,p.dashY*1000*time,20);
 p.dashTime=Math.max(0,p.dashTime-time);burst(p.x,p.y,'#80e9ff',2);return true;
}
function hitEnemy(e,damage){e.hp-=damage;e.hitUntil=g.time+.12;}
