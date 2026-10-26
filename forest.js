// Chapter II uses an orthographic Blender render and matching exported collision geometry.
const forestArt=new Image();forestArt.src='assets/forest-chapter2.jpg';
const houndArt=Array.from({length:4},(_,i)=>{const image=new Image();image.src='assets/forest-hound-'+i+'.png';return image;});
function startPlanet(){
 WORLD.w=3000;WORLD.h=1800;NAV_COLS=75;NAV_ROWS=45;
 floorAreas.splice(0,floorAreas.length,{x:60,y:60,w:2880,h:1680});
 walls.splice(0,walls.length,{x:40,y:40,w:2920,h:20},{x:40,y:1740,w:2920,h:20},{x:40,y:40,w:20,h:1720},{x:2940,y:40,w:20,h:1720},...forestLayout.walls.map(w=>({...w})));
 navGrids.clear();navFields.clear();
 Object.assign(g,{stage:'planet',ship:100,systems:[],enemies:[],bullets:[],drops:[],particles:[],pickupFx:[],turrets:[],remaining:0,materials:[0,0,0,0],planetRepair:0,planetSpawn:6,planetTime:0,forestBossSpawned:false,forestBossDefeated:false,forestAlert:0});
 Object.assign(g.p,{x:1500,y:1050,hp:100,inv:2,dashTime:0,dashCooldown:0});camera.x=860;camera.y=690;
 // Interleave types so the search spans all six ruins rather than one corner per resource.
 const order=[0,2,1,3,0,3,1,0,2,3,0,1,3,0];
 g.nodes=order.map((kind,i)=>{const b=forestLayout.buildings[i%6],row=Math.floor(i/6);return {x:b.x+90+row*100,y:b.y+b.h-100-row*45,kind,progress:0,done:false,discovered:false};});
 g.forestLoot=forestLayout.buildings.flatMap((b,i)=>[
  {x:b.x+b.w-70,y:b.y+b.h-90,type:'crate',opened:false,weapon:null},
  {x:b.x+b.w/2,y:b.y+b.h+48,type:'body',opened:false,weapon:[1,2,6,3,9,7][i]}
 ]);
 if(!g.unlocked[4])acquireWeapon(4);
 g.reserve=g.reserve.map((v,i)=>v+(weapons[i].melee||weapons[i].turret?0:weapons[i].pack));
 g.med=Math.max(2,g.med);g.reload=null;g.swing=null;mode='playing';hud.hidden=false;resume();
 toast('CHAPTER II — Search the ruins. Hold E to salvage. No shop on this planet.');
}
function forestSpawnPoint(radius,minDistance=450){
 const candidates=[{x:1500,y:130},{x:1500,y:1650},{x:140,y:900},{x:2850,y:900},{x:550,y:900},{x:2450,y:900}];
 return candidates.filter(p=>walkable(p.x,p.y,radius)&&dist(p,g.p)>minDistance).sort((a,b)=>dist(b,g.p)-dist(a,g.p))[0]||candidates.find(p=>walkable(p.x,p.y,radius));
}
function spawnForestHound(boss=false){
 const r=boss?42:20,p=forestSpawnPoint(r);if(!p)return;
 const hp=boss?(settings.difficulty==='easy'?1500:2400):75+Math.min(65,g.planetTime*.18);
 g.enemies.push({...p,hp,max:hp,r,speed:boss?100:105,hound:true,boss,forestBoss:boss,damage:boss?27:12,cooldown:boss?2:1.5,state:'hunt',timer:0,angle:0});
 if(boss){g.forestBossSpawned=true;g.forestAlert=5;g.shake=12;toast('THE RUIN ALPHA — Defeat it before repairing ARK!');}
}
function updateForestHound(e,dt,difficulty){
 e.cooldown-=dt;const angle=Math.atan2(g.p.y-e.y,g.p.x-e.x);e.angle=angle;
 if(e.state==='windup'){
  e.timer-=dt;if(e.timer<=0){e.state='leap';e.timer=.42;e.leapAngle=angle;}
 }else if(e.state==='leap'){
  moveActor(e,Math.cos(e.leapAngle)*470*dt,Math.sin(e.leapAngle)*470*dt,e.r);
  e.timer-=dt;if(e.timer<=0){e.state='recover';e.timer=.65;}
 }else if(e.state==='recover'){e.timer-=dt;if(e.timer<=0){e.state='hunt';e.cooldown=e.boss?2:3;}}
 else{
  moveEnemy(e,dt,difficulty);
  if(e.cooldown<=0&&dist(e,g.p)<(e.boss?480:300)&&clearLine(e,g.p,e.r)){e.state='windup';e.timer=e.boss?.9:.65;}
 }
}
function updatePlanet(dt){
 g.planetTime+=dt;g.forestAlert=Math.max(0,g.forestAlert-dt);
 if(!g.forestBossSpawned){g.planetSpawn-=dt;if(g.planetSpawn<=0&&g.enemies.length<7){spawnForestHound();g.planetSpawn=Math.max(5,10-g.planetTime/80);}}
 for(const n of g.nodes)if(!n.done&&dist(n,g.p)<190&&clearLine(n,g.p,3))n.discovered=true;
 const node=g.nodes.find(n=>!n.done&&dist(n,g.p)<75&&clearLine(n,g.p,3));
 const loot=g.forestLoot.find(n=>!n.opened&&dist(n,g.p)<75&&clearLine(n,g.p,3));
 if(keys.has('e')){
  if(node){node.progress+=dt/1.1;if(node.progress>=1){node.done=true;g.materials[node.kind]++;burst(node.x,node.y,materials[node.kind].color,15);sound(720,.08);toast('+1 '+materials[node.kind].name);}}
  else if(loot){loot.progress=(loot.progress||0)+dt/.8;if(loot.progress>=1){loot.opened=true;for(let i=0;i<weapons.length;i++)if(g.unlocked[i]&&!weapons[i].melee)g.reserve[i]+=weapons[i].pack;if(loot.weapon!==null){acquireWeapon(loot.weapon);g.reserve[loot.weapon]+=weapons[loot.weapon].pack;}g.med=Math.min(6,g.med+1);toast(loot.weapon!==null?weapons[loot.weapon].name+' recovered · Ammo + medkit':'Ammo supplies + medkit');sound(540,.12);}}
 }
 if(!g.forestBossSpawned&&materials.every((m,i)=>g.materials[i]>=m.need))spawnForestHound(true);
 if(g.forestBossDefeated&&dist(g.p,{x:1500,y:1000})<125&&keys.has('e')){
  g.planetRepair=Math.min(100,g.planetRepair+dt*20);if(g.planetRepair>=100){g.coins+=150;g.flight=0;mode='departing';hud.hidden=true;keys.clear();mouse.down=false;g.bullets=[];saveCareer();}
 }
}
function drawHound(e){
 const moving=e.state==='hunt'||e.state==='leap',frame=moving?Math.floor(g.time*10)%4:0,img=houndArt[frame],size=e.boss?190:110;
 ctx.save();ctx.translate(e.x,e.y);
 if(e.state==='windup'){
  ctx.save();ctx.rotate(e.angle);ctx.globalAlpha=.45;poly([[0,-e.r],[210,-e.r],[235,0],[210,e.r],[0,e.r]],'#ed713a');ctx.restore();
 }
 ellipse(0,10,e.r*1.2,e.r*.65,'#0007');ctx.rotate(e.state==='leap'?e.leapAngle:e.angle);
 if(e.hitUntil>g.time)ctx.filter='brightness(2)';
 if(img.complete&&img.naturalWidth)ctx.drawImage(img,-size/2,-size/2,size,size);else ellipse(0,0,e.r,e.r*.65,'#793e50');
 ctx.restore();if(e.boss){box(e.x-60,e.y-80,120,7,'#321b25');box(e.x-60,e.y-80,120*Math.max(0,e.hp/e.max),7,'#f36a53');text('RUIN ALPHA',e.x,e.y-90,'#ffc6a3',15);}
}
function drawForestLoot(n){
 ctx.save();ctx.translate(n.x,n.y);
 if(n.type==='crate'){box(-22,-16,44,32,n.opened?'#292e27':'#6b7150','#b2a779');line(-18,0,18,0,'#222c25',5);if(!n.opened)box(-4,-6,8,12,'#a8c5a3');}
 else{ctx.rotate(-.45);ellipse(0,6,35,15,'#0005');line(-12,0,13,0,'#3f4b51',20);ellipse(24,0,9,8,'#a9947f');line(-13,-5,-33,-12,'#333e45',9);line(-13,5,-34,14,'#333e45',9);line(5,-7,-8,-21,'#4e5c61',7);line(5,7,14,20,'#4e5c61',7);}
 ctx.restore();if(!n.opened&&dist(n,g.p)<90){text('HOLD E — SEARCH',n.x,n.y-36,'#e9dfb9',12);box(n.x-22,n.y+28,44*(n.progress||0),3,'#a7e2c0');}
}
function drawPlanet(){
 const overview=mode==='map',zoom=overview?.37:1,touch=matchMedia('(pointer:coarse)').matches,barY=touch?104:H-78;box(0,0,W,H,'#0e1716');ctx.save();
 if(overview){ctx.translate((W-3000*zoom)/2,(H-1800*zoom)/2);ctx.scale(zoom,zoom);}else ctx.translate(-camera.x,-camera.y);
 if(forestArt.complete&&forestArt.naturalWidth)ctx.drawImage(forestArt,0,0,3000,1800);else box(60,60,2880,1680,'#283c28');
 shuttle(1500,800,1.2);consoleUnit(1500,1000,'#80def1');text(g.forestBossDefeated?'HOLD E — REPAIR ARK '+Math.floor(g.planetRepair)+'%':'ARK / FIND THE MISSING PARTS',1500,1100,'#b7e4fa',16);
 g.forestLoot.forEach(drawForestLoot);
 for(const n of g.nodes)if(!n.done&&n.discovered){box(n.x-13,n.y-10,26,20,'#494d3f','#c6b780');if(dist(n,g.p)<90){text('HOLD E — SALVAGE',n.x,n.y-28,'#ffdfaa',12);box(n.x-20,n.y+20,40*n.progress,4,materials[n.kind].color);}}
 drawTurrets();g.drops.forEach(drawDrop);
 const actors=[...g.enemies.map(e=>({y:e.y,draw:()=>drawHound(e)})),{y:g.p.y,draw:()=>engineer(g.p.x,g.p.y,character,g.p.moving?g.time*13:0,Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x))}];actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
 for(const b of g.bullets)ellipse(b.x,b.y,4,4,b.enemy?'#ff647d':b.color||'#8ff0ff');for(const p of g.particles)box(p.x,p.y,3,3,p.color);drawPickupFeedback();ctx.restore();
 box(245,barY,790,66,'#10201aed','#63755a');materials.forEach((m,i)=>{const x=285+i*190;materialModel(i,x,barY+33,.5);text(m.name+' '+g.materials[i]+' / '+m.need,x+80,barY+38,g.materials[i]>=m.need?'#8ee8af':m.color,14);});
 text(g.forestBossDefeated?'ALPHA DEFEATED — Return to ARK':g.forestBossSpawned?'DEFEAT THE RUIN ALPHA':'Search six ruins · Hold E at supplies · No shop',W/2,touch?190:H-92,'#ffe0bd',15);
 if(g.forestAlert>0){box(W/2-230,110,460,48,'#32121ce6');text('WARNING — RUIN ALPHA AWAKENED',W/2,141,'#ffb18e',20);}
}


