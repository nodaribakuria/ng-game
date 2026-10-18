const lessons=[
 ['Welcome! I’m Mari, your flight instructor.','Move with W A S D or arrow keys. Walk to the glowing marker.'],
 ['Good. Now let’s practice aiming.','Aim with the mouse and left-click the training robot on the right.'],
 ['Your magazine is no longer full.','Press R and wait until the reload finishes.'],
 ['These bolts are useful for repairs.','Walk close to the bolts. You collect them automatically.'],
 ['Let’s restore this damaged terminal.','Stand beside the highlighted terminal and hold E to repair it.'],
 ['You are ready for your first mission!','I opens the shop. H heals. M shows the map. On the planet, hold E to gather materials.']
];
function startTraining(){
 start(true);g.lesson=0;g.lessonDelay=0;g.trainingRepair=0;g.trainingReload=false;g.enemies=[];g.drops=[];g.systems=[];g.scrap=0;g.p.x=320;g.p.y=440;g.med=2;g.next=Infinity;
 floorAreas.splice(0,floorAreas.length,{x:80,y:140,w:1120,h:480});walls.splice(0,walls.length,{x:60,y:120,w:1160,h:20},{x:60,y:620,w:1160,h:20},{x:60,y:120,w:20,h:520},{x:1200,y:120,w:20,h:520});navGrids.clear();navFields.clear();camera.x=0;camera.y=0;hud.hidden=true;document.querySelector('#toast').style.opacity=0;
}
const mariCheers=['Wonderful! You did it! Great first steps!','Amazing aim! You hit the target!','Perfect reload! You are getting the hang of this!','Well done! All the bolts are collected!','Congratulations! You repaired it — I’m proud of you!'];
function nextLesson(){g.cheer=mariCheers[g.lesson];g.lessonDelay=2.4;g.lesson++;mouse.down=false;g.bullets=[];sound(650,.12);if(g.lesson===1)g.enemies=[{x:1000,y:330,r:28,hp:44,max:44,speed:0}];if(g.lesson===3)g.drops=[{x:740,y:460,type:'scrap',value:4}];}
function finishTraining(){menuCanResume=false;mode='training-complete';keys.clear();mouse.down=false;panel('<div class="eyebrow">MARI / TRAINING COMPLETE</div><h1>Congratulations, engineer!</h1><p>Mari: You did it! I’m proud of you — you’re ready for launch!</p><p>You practiced movement, aiming, firing, reloading, automatic pickups and repairs.<br>I — Shop · H — Heal · M — Map · 1–6 — Weapons<br>On the planet, hold E near materials to gather them.</p><div class="row"><button class="primary" data-action="start">Start Mission →</button><button data-action="training">Practice Again</button><button data-action="menu">Main Menu</button></div>');}
function updateTraining(dt){
 if(dt<=0)return;if(g.lessonDelay>0){g.time+=dt;g.lessonDelay=Math.max(0,g.lessonDelay-dt);mouse.down=false;if(!g.lessonDelay&&g.lesson===5)finishTraining();return;}hud.hidden=true;g.reserve[0]=60;g.time+=dt;g.fire-=dt;g.p.inv=10;
 const dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),len=Math.hypot(dx,dy)||1;
 moveActor(g.p,dx/len*235*dt,dy/len*235*dt,20);g.p.moving=!!(dx||dy);camera.x=0;camera.y=0;
 if(mouse.sx!==undefined){mouse.x=mouse.sx;mouse.y=mouse.sy;}if(g.lesson===2&&g.reload)g.trainingReload=true;updateCombat(dt);updateProjectiles(dt,1);g.bullets=g.bullets.filter(b=>b.life>0);collectDrops(dt);
 for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}g.particles=g.particles.filter(p=>p.life>0);
 if(g.lesson===0&&dist(g.p,{x:520,y:440})<45)nextLesson();
 else if(g.lesson===1&&g.enemies[0]?.hp<=0){g.enemies=[];nextLesson();}
 else if(g.lesson===2&&g.trainingReload&&!g.reload&&g.magazines[0]===weapons[0].mag)nextLesson();
 else if(g.lesson===3&&g.scrap>=4)nextLesson();
 else if(g.lesson===4&&dist(g.p,{x:970,y:500})<85&&keys.has('e')){g.trainingRepair=Math.min(100,g.trainingRepair+dt*35);if(g.trainingRepair===100){g.scrap-=4;nextLesson();}}
}
const mariPortrait=new Image();mariPortrait.src='assets/mari-guide.png';
function drawTraining(){
 box(0,0,W,H,'#0b101b');box(80,140,1120,480,'#252a38','#65758c');for(let x=100;x<1200;x+=60)for(let y=160;y<620;y+=60)box(x,y,52,52,'#2b3040','#3c4556');for(const w of walls)box(w.x,w.y,w.w,w.h,'#343444','#6c819a');
 text('ARK / FLIGHT ACADEMY',640,70,'#85dbed',27);text('SAFE SIMULATION · NO ENEMY ATTACKS · YOUR SAVED ITEMS ARE UNCHANGED',640,102,'#9aaec9',12);
 consoleUnit(970,500,g.trainingRepair===100?'#7be8ae':'#ffb36c');text('REPAIR '+Math.floor(g.trainingRepair)+'%',970,555,'#ffcf95',14);
 if(g.lesson===0){ctx.strokeStyle='#7ae1ce';ctx.lineWidth=4;ctx.beginPath();ctx.arc(520,440,35+Math.sin(g.time*3)*3,0,Math.PI*2);ctx.stroke();text('MOVE HERE',520,390,'#92f4dc',14);}
 for(const e of g.enemies){robotModel(e);box(e.x-35,e.y-80,70,5,'#493448');box(e.x-35,e.y-80,70*Math.max(0,e.hp)/e.max,5,'#f27c9b');text('TRAINING TARGET',e.x,e.y-95,'#eeb0c4',12);}g.drops.forEach(drawDrop);engineer(g.p.x,g.p.y,character,g.p.moving?g.time*13:0,Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x));for(const b of g.bullets)ellipse(b.x,b.y,3,3,b.color||'#b0eeff');drawPickupFeedback();
 const happy=g.lessonDelay>0,lesson=lessons[g.lesson];box(80,625,1120,90,'#111a2bf5',happy?'#8ee6bc':'#a56b83');
 const px=90,py=550,size=150;box(px-4,py-4,size+8,size+8,'#172132',happy?'#91f2bd':'#d99fb5');
 if(mariPortrait.complete&&mariPortrait.naturalWidth){const iw=mariPortrait.naturalWidth,ih=mariPortrait.naturalHeight;
 if(happy)ctx.drawImage(mariPortrait,iw*.52,0,iw*.48,ih*.40,px,py,size,size);
 else ctx.drawImage(mariPortrait,iw*.52,0,iw*.48,ih*.40,px,py,size,size);
 }else{box(px,py,size,size,'#392939');text('MARI',px+75,py+80,'#ffc5d1',22);}
 if(happy){for(let n=0;n<18;n++){const x=px-5+(n*37)%170,y=py-20+((n*43+g.time*65)%160);box(x,y,4,7,n%2?'#ffe28d':'#8ef0ba');}}
 ctx.textAlign='left';ctx.font='bold 15px Segoe UI';ctx.fillStyle=happy?'#9ff3c7':'#ffaec7';ctx.fillText(happy?'MARI / WELL DONE!':'MARI / INSTRUCTOR · '+(g.lesson+1)+' / 6',265,648);ctx.font='17px Segoe UI';ctx.fillStyle='#fff0f5';ctx.fillText(happy?g.cheer:lesson[0],265,675);ctx.font='14px Segoe UI';ctx.fillStyle='#d3deee';ctx.fillText(happy?(g.lesson===5?'Training complete! Your adventure is about to begin.':'Excellent work! Let’s try the next task together.'):lesson[1],265,700);ctx.textAlign='center';
 text('AMMO '+g.magazines[0]+' / '+g.reserve[0]+(g.reload?'  RELOADING…':'')+'     BOLTS '+g.scrap,935,185,'#e7d4b1',15);
}

