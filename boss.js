'use strict';

function spawn(boss=false){
  const radius=boss?55:24;
  let point;
  if(boss){
    const options=rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2}));
    point=options.sort((a,b)=>dist(b,g.p)-dist(a,g.p))[0];
  }else{
    const candidates=rooms.map(r=>({x:r.x+120+Math.random()*(r.w-240),y:r.y+100+Math.random()*(r.h-200)}));
    point=candidates.find(p=>dist(p,g.p)>420&&walkable(p.x,p.y,radius))||{x:500,y:410};
  }
  const health=boss?(settings.difficulty==='easy'?2800:settings.difficulty==='hard'?4800:3600):45+g.wave*12;
  const e={...point,hp:health,max:health,r:radius,speed:boss?95:55+g.wave*6,boss,attack:0,
    phase:1,state:'hunt',timer:1.5,cooldown:1.3,pattern:0};
  if(!boss&&g.wave>=2&&(!g.enemies.some(v=>v.ranged)||Math.random()<.3)){e.ranged=true;e.hp=Math.round(health*.85);e.max=e.hp;e.speed=80;e.cooldown=1.2;e.winding=0;}
  g.enemies.push(e);return e;
}
function bossBullet(e,angle,speed=360){
  g.bullets.push({x:e.x+Math.cos(angle)*65,y:e.y+Math.sin(angle)*65,startX:e.x,startY:e.y,
    vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,enemy:true,damage:16+e.phase*2,life:4});
}
function summonGuards(e){
  for(let i=0;i<2&&g.enemies.filter(v=>!v.boss).length<6;i++){
    for(let n=0;n<16;n++){
      const angle=(i*8+n)*Math.PI/8,p={x:e.x+Math.cos(angle)*155,y:e.y+Math.sin(angle)*155};
      if(walkable(p.x,p.y,24)&&dist(p,g.p)>70){
        g.enemies.push({...p,hp:90,max:90,r:24,speed:95,boss:false,attack:.5});burst(p.x,p.y,'#e882fb',16);break;
      }
    }
  }
}
function hitPlayer(damage){if(g.p.inv<=0){g.p.hp-=damage;g.p.inv=.65;g.shake=12;burst(g.p.x,g.p.y,'#ff6f8c',15);}}
function updateBoss(e,dt,difficulty){
  const phase=e.hp/e.max<.33?3:e.hp/e.max<.66?2:1;
  if(phase>e.phase){e.phase=phase;e.speed=95+(phase-1)*25;summonGuards(e);toast(`ARCHON — PHASE ${phase} · Reinforcements incoming`);}
  e.cooldown-=dt;e.timer-=dt;
  const visible=clearLine(e,g.p,5),distance=dist(e,g.p);
  if(e.state==='hunt'){
    moveEnemy(e,dt,difficulty);
    if(e.cooldown<=0&&visible){
      e.aim=Math.atan2(g.p.y-e.y,g.p.x-e.x);
      e.state=distance<205?'slam-windup':e.pattern++%2===0?'burst-windup':'charge-windup';
      e.timer=e.state==='burst-windup'?.7:.95;e.telegraphDuration=e.timer;
    }
  }else if(e.state==='burst-windup'){
    if(e.timer<=0){e.state='burst';e.shots=0;e.timer=0;}
  }else if(e.state==='burst'){
    if(e.timer<=0){
      if(visible){const aim=Math.atan2(g.p.y+(g.p.vy||0)*.18-e.y,g.p.x+(g.p.vx||0)*.18-e.x);
        for(let i=-1;i<=1;i++)bossBullet(e,aim+i*(.09+e.phase*.015),330+e.phase*40);
      }
      e.shots++;e.timer=.23;
      if(e.shots>=2+e.phase){e.state='recover';e.timer=.65;}
    }
  }else if(e.state==='charge-windup'){
    if(e.timer<=0){e.state='charge';e.timer=.85;sound(80,.15);}
  }else if(e.state==='charge'){
    const old={x:e.x,y:e.y},speed=490+e.phase*55;
    const nx=e.x+Math.cos(e.aim)*speed*dt,ny=e.y+Math.sin(e.aim)*speed*dt;
    const blocked=traceWall(e.x,e.y,nx,ny,e.r)!==Infinity;
    if(!blocked)moveActor(e,nx-e.x,ny-e.y,e.r);
    if(segmentCircleT(old.x,old.y,e.x,e.y,g.p,e.r+20)!==Infinity)hitPlayer(28*difficulty);
    if(blocked||e.timer<=0){e.state='recover';e.timer=.85;burst(e.x,e.y,'#ff9169',20);}
  }else if(e.state==='slam-windup'){
    if(e.timer<=0){if(distance<165+e.phase*15&&visible)hitPlayer(26*difficulty);
      e.state='slam-flash';e.timer=.3;g.shake=10;sound(65,.2);}
  }else if(e.state==='slam-flash'){
    if(e.timer<=0){e.state='recover';e.timer=.8;}
  }else if(e.state==='recover'&&e.timer<=0){e.state='hunt';e.cooldown=e.phase===3?.4:.9;}
}
function drawBossTelegraphs(){
  for(const e of g.enemies)if(e.boss&&e.hp>0){
    const charge=e.state==='charge-windup',burst=e.state==='burst-windup';
    if(charge||burst){
      const length=charge?620:850,bx=e.x+Math.cos(e.aim)*length,by=e.y+Math.sin(e.aim)*length;
      const wallT=traceWall(e.x,e.y,bx,by,charge?e.r:5),t=Math.min(1,wallT);
      ctx.globalAlpha=.18+Math.sin(g.time*14)**2*.18;
      line(e.x,e.y,e.x+(bx-e.x)*t,e.y+(by-e.y)*t,charge?'#ff6b59':'#e478ff',charge?110:30);
      ctx.globalAlpha=1;
      text(charge?'CHARGE — DODGE!':'TARGET LOCK',e.x,e.y-110,'#ffc397',14);
    }
    if(e.state==='slam-windup'||e.state==='slam-flash'){
      const radius=165+e.phase*15;ctx.globalAlpha=e.state==='slam-flash'?.55:.18;
      ellipse(e.x,e.y,radius,radius,'#ff647e');ctx.globalAlpha=1;
      ctx.strokeStyle='#ffac79';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,radius,0,Math.PI*2);ctx.stroke();
      text('SHOCK SLAM — MOVE!',e.x,e.y-110,'#ffd4a4',14);
    }
  }
}
function drawBossHealth(){
  const boss=g?.enemies.find(e=>e.boss&&e.hp>0);if(!boss)return;
  const x=W/2-210;box(x,20,420,45,'#160e1fe8','#9b4a64');
  text(`ARCHON · PHASE ${boss.phase} · ${Math.ceil(boss.hp)} / ${boss.max}`,W/2,38,'#ffd0d9',12);
  box(x+12,47,396,7,'#3c253a');box(x+12,47,396*boss.hp/boss.max,7,'#ee657f');
}
