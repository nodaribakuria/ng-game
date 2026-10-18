'use strict';

// Shared models for the held weapons and the items lying on the deck.
function weaponModel(index,magOffset=0){if(index>=6){drawArsenalWeapon(index,magOffset);return;}
  const c=weapons[index].color;
  if(weapons[index].melee){line(-10,0,35,0,'#897a96',9);for(let x=-8;x<20;x+=6)line(x,-4,x,4,'#292433',2);if(index===4){line(25,-15,25,15,'#aa8ba9',5);poly([[30,-6],[91,-3],[78,8],[30,8]],'#db366e','#ff9ece');}else{box(32,-23,30,46,'#483259','#bb94e9');line(40,-17,54,0,'#e3b4ff',4);line(54,0,40,17,'#e3b4ff',4);}return;}
  if(index===0){
    poly([[-10,-9],[23,-9],[31,-4],[31,3],[-10,3]],'#40586b','#94afbc');
    box(26,-5,9,7,'#18242e');box(-4,2,10,16,'#172530','#71909e');
    box(-2,7+magOffset,6,12,'#54758a');line(-4,-6,20,-6,c,3);box(17,-12,5,3,'#afc2cf');
  }else if(index===1){
    poly([[-21,-8],[-9,-4],[-9,6],[-21,10]],'#284355','#8299a8');
    box(-9,-10,43,19,'#2a4254','#8ca7b4');box(34,-5,21,8,'#111f2a','#5c7c8e');
    box(-3,8,9,14,'#142631');box(13,9+magOffset,10,18,c,'#2a6375');
    line(-2,-5,29,-5,c,4);box(7,-14,17,4,'#132634');for(let i=0;i<3;i++)box(29+i*5,-8,2,13,'#7a929e');
  }else if(index===2){
    poly([[-23,-7],[-6,-3],[-6,8],[-23,14]],'#7a5739','#d1a974');
    box(-7,-9,45,17,'#3d4f58','#a0a9a6');box(36,-7,26,6,'#8b9b9d');box(36,1,26,6,'#23353d');
    box(20,5,27,9,'#b2804d','#e3b47b');box(-1,7,9,14,'#73503b');
    for(let i=0;i<4;i++)line(24+i*5,8,24+i*5,12,'#694729',2);
    if(magOffset>0)box(13,8+magOffset,7,13,'#eeb15f','#734b34');
  }else{
    poly([[-23,-8],[-7,-4],[-7,9],[-23,12]],'#382f54','#b298d7');
    box(-7,-10,43,20,'#3b3657','#ab9fc4');box(36,-8,35,5,'#7f91a7');box(36,3,35,5,'#7f91a7');
    line(35,-1,69,-1,c,3);box(7,-18,24,6,'#372d57','#b298d7');box(0,9,8,15,'#1a2333');
    box(15,10+magOffset,12,16,'#7662a9','#cab2f6');ellipse(26,-1,6,5,c);
  }
}

function drawHeldWeapon(angle,red,suit){
  const w=weapons[g.weapon];
  const progress=g.reload?g.reload.elapsed/g.reload.duration:0;
  const reloadPose=g.reload?Math.sin(progress*Math.PI):0;
  const equipPose=g.equipTime/.45;
  const pickupPose=!g.reload&&g.flash<=0?Math.sin(g.pickupTime/.45*Math.PI):0;
  const recoil=g.flash>0?g.flash/.065:0;
  ctx.save();ctx.rotate(angle+reloadPose*.45+equipPose*.7+(g.swing?(1-g.swing.time/g.swing.duration)*2.2-1.1:0));
  // Both arms attach to the torso and end on actual gun grips.
  const gunX=21-recoil*4,gunY=reloadPose*6+equipPose*12;
  const sleeve=red?'#d8dddd':suit,skin=red?'#dbaf94':'#deb394';
  line(-4,-14,7,-17,sleeve,11);line(7,-17,gunX-2,gunY+8,skin,8);
  line(-4,14,8,23,sleeve,11);
  const reach=reloadPose*22+pickupPose*16;
  const frontX=gunX+(g.weapon===0?6:27)-reloadPose*11;
  const frontY=gunY+8+reach;
  line(8,23,frontX,frontY,skin,8);
  ctx.save();ctx.translate(gunX,gunY);weaponModel(g.weapon,reach);ctx.restore();
  ellipse(gunX-1,gunY+9,5,5,'#263a43');ellipse(frontX,frontY,5,5,'#263a43');
  line(frontX-2,frontY,frontX+2,frontY,'#829ba4',1.5);
  if(g.flash>0&&!g.reload&&!w.melee){const muzzle=w.muzzle-recoil*4;poly([[muzzle,-7],[muzzle+12,-3],[muzzle+22,0],[muzzle+9,5],[muzzle,8]],'#ffdf98');}
  if(g.swing){ctx.strokeStyle=w.color;ctx.lineWidth=5;ctx.globalAlpha=g.swing.time/g.swing.duration;ctx.beginPath();ctx.arc(0,0,w.range,-.7,.7);ctx.stroke();ctx.globalAlpha=1;}
  ctx.restore();
  if(g.reload){box(-29,52,58,5,'#192c3b');box(-29,52,58*progress,5,w.color);text('Reload',0,70,'#d3eef2',11);}
  if(g.pickupTime>0){ctx.strokeStyle='#a1e7d8';ctx.lineWidth=2;ctx.globalAlpha=g.pickupTime/.45;ctx.beginPath();ctx.ellipse(0,26,28+(1-g.pickupTime/.45)*20,12,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
}

function boltModel(){
  ctx.save();ctx.rotate(-.65);
  box(-5,-1,10,24,'#8aafc4','#deedf4');
  for(let y=2;y<22;y+=4)line(-5,y,5,y-2,'#355769',2);
  poly([[-11,-10],[0,-16],[11,-10],[11,1],[0,7],[-11,1]],'#aec9d7','#eff7fb');
  poly([[-5,-7],[0,-10],[5,-7],[5,-2],[0,1],[-5,-2]],'#466578','#7396ad');
  line(-2,5,-2,20,'#d2e5ee',1);ctx.restore();
}

function drawDrop(d){
  const bob=Math.sin(g.time*3+d.x*.01)*3;
  ellipse(d.x,d.y+14,d.type==='weapon'?35:16,6,'#0007');
  ctx.save();ctx.translate(d.x,d.y+bob);
  if(d.type==='scrap')boltModel();
  if(d.type==='coin'){ellipse(0,0,11,13,'#8d632c');ellipse(-2,-2,10,12,'#f3c568');text('◈',-2,3,'#806027',15);}
  if(d.type==='weapon'){ctx.scale(.8,.8);weaponModel(d.value);}
  if(d.type==='med'){box(-15,-11,30,23,'#e7eeec','#799f9a');box(-7,-15,14,4,'#9eaba9');box(-3,-7,6,16,'#d65760');box(-8,-2,16,6,'#d65760');}
  if(d.type==='ammo'){box(-16,-11,32,25,'#364634','#95ae7e');box(-18,-14,36,5,'#7f8d66');for(let i=0;i<3;i++){box(-10+i*8,-5,5,13,'#cfab63');poly([[-10+i*8,-5],[-7.5+i*8,-10],[-5+i*8,-5]],'#ece0b5');}}
  ctx.restore();
  if(dist(d,g.p)<140){const label=d.type==='scrap'?`bolts ×${d.value}`:d.type==='weapon'?weapons[d.value].name:d.type==='ammo'?`Ammo ×${d.value}`:d.type==='med'?'Medkit':`${d.value} coins`;text(label,d.x,d.y-29,'#cde3ec',12);}
}

function drawPickupFeedback(){
  for(const fx of g.pickupFx){ctx.globalAlpha=Math.min(1,fx.life*2);text(fx.label,fx.x,fx.y,fx.color,14);}
  ctx.globalAlpha=1;
}
