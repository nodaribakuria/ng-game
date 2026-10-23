// Vexa's field shop: a physical counter, available only between cleared rounds.
function vexaLocation(){if(!g||['planet','training','landing','departing'].includes(g.stage))return null;return g.stage==='survival'?{x:2500,y:300,w:480,h:300}:{x:2370,y:300,w:410,h:300};}
function vexaOpen(){return !!vexaLocation()&&g.wave>0&&!g.remaining&&!g.enemies.some(e=>e.hp>0)&&!g.bossSpawned;}
function nearVexa(){const r=vexaLocation();return !!r&&Math.hypot(g.p.x-r.x-r.w/2,g.p.y-r.y-205)<100;}
function inVexa(){const r=vexaLocation();return !!r&&g.p.x>r.x&&g.p.x<r.x+r.w&&g.p.y>r.y&&g.p.y<r.y+r.h+45;}
function setupVexa(){const r=vexaLocation();if(!r)return;g.vexaRound=0;walls.push({x:r.x,y:r.y,w:r.w,h:14,vexa:true},{x:r.x,y:r.y,w:14,h:r.h,vexa:true},{x:r.x+r.w-14,y:r.y,w:14,h:r.h,vexa:true},{x:r.x+14,y:r.y+14,w:r.w-28,h:150,vexa:true});navGrids.clear();navFields.clear();}
function updateVexa(dt){if(!vexaLocation())return;
 if(vexaOpen()&&g.vexaRound!==g.wave){g.vexaRound=g.wave;g.next=g.stage==='survival'&&(g.wave+1)%5===0?60:35;toast('ROUND CLEAR — Vexa’s shop is OPEN. Find SHOP on the map.');}
 if(vexaOpen()&&inVexa())g.next+=dt;
 if(vexaOpen()&&nearVexa()&&keys.has('e')){keys.delete('e');shopInventory();}
}
function vexaModel(x,y){ctx.save();ctx.translate(x,y);const sway=Math.sin((g?.time||0)*1.7)*1.2;ctx.translate(sway,0);
 ellipse(0,39,23,7,'#0008');
 for(const side of [-1,1]){line(side*8,9,side*12,34,'#17171f',13);box(side*12-7,30,16,13,'#10141c','#61565f');for(let n=0;n<3;n++)line(side*12-4,33+n*3,side*12+5,33+n*3,'#918178',1);}
 poly([[-17,-26],[17,-26],[23,30],[11,25],[4,7],[-9,28],[-24,32]],'#17141d','#713046');
 poly([[-13,-24],[13,-24],[11,-3],[-11,-3]],'#29212b','#887078');box(-10,-3,20,9,'#c28e7a');box(-16,6,32,7,'#14131b');box(-3,7,6,5,'#bc9860');
 ellipse(0,-37,17,23,'#21141e');ellipse(1,-35,11,15,'#d2a08a');
 poly([[-17,-40],[-9,-57],[8,-55],[18,-43],[11,-41],[2,-50],[-8,-35],[-14,-10],[-23,10]],'#2b1520');
 for(let side of [-1,1])for(let i=0;i<3;i++){line(side*(12+i*3),-44,side*(14+i*4),8+i*4,i%2?'#a92c4c':'#5a1b32',2);}
 line(-6,-37,-2,-38,'#21131b',2);line(4,-38,8,-37,'#21131b',2);line(-2,-28,5,-28,'#812842',2);
 for(const side of [-1,1]){ellipse(side*13,-28,2,4,'#bb9562');line(side*17,-18,side*26,0,'#28202a',10);line(side*26,0,side*20,13,'#c28e7a',6);ellipse(side*20,14,5,5,'#171823');for(let n=0;n<3;n++)box(side*17-2,-17+n*6,4,2,'#b8996e');}
 ctx.strokeStyle='#b69263';ctx.lineWidth=1;ctx.beginPath();ctx.arc(8,13,10,0,Math.PI);ctx.stroke();ctx.restore();
}
function drawVexaShop(){const r=vexaLocation();if(!r)return;const open=vexaOpen(),c=open?'#71dfba':'#e05a75',cx=r.x+r.w/2;
 box(r.x,r.y,r.w,r.h,'#17121e','#9c4963');for(let x=r.x+18;x<r.x+r.w-18;x+=42)for(let y=r.y+170;y<r.y+r.h-5;y+=42)box(x,y,36,36,'#302432','#4f3749');
 metalPanel(r.x+15,r.y+15,r.w-30,45);text('VEXA / BLACK MARKET',cx,r.y+44,'#ff8daa',20);
 for(const side of [-1,1]){const sx=cx+side*(r.w/2-68);metalPanel(sx-42,r.y+65,84,80);for(let n=0;n<2;n++){ctx.save();ctx.translate(sx-18,r.y+85+n*31);ctx.scale(.55,.55);weaponModel(n+1);ctx.restore();}lightStrip(sx-33,r.y+143,66,3,'#d13d70');}
 vexaModel(cx,r.y+114);metalPanel(r.x+25,r.y+145,r.w-50,35);lightStrip(r.x+35,r.y+173,r.w-70,3,c);
 for(const side of [-1,1]){metalPanel(cx+side*78-20,r.y+145,40,22);box(cx+side*78-12,r.y+150,24,9,side<0?'#67b7bd':'#8e4d8b');}
 if(!open){box(r.x+18,r.y+65,r.w-36,78,'#282331dd');for(let y=r.y+70;y<r.y+143;y+=12)line(r.x+18,y,r.x+r.w-18,y,'#59414f',3);text('CLOSED · CLEAR THE ROUND',cx,r.y+115,'#f1b8c5',15);}
 text(open?'OPEN · E / SHOP':'SHOP',cx,r.y+r.h-18,c,17);
 if(nearVexa()&&open)text('E — Talk to Vexa · Timer paused',cx,r.y+r.h+28,'#b6f3d7',14);
 if(mode==='map'){ellipse(cx,r.y+r.h+40,17,17,'#8c2a50');text('SHOP',cx,r.y+r.h+47,'#fff',15);}
}
