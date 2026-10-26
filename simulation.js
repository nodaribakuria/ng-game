function update(dt){if(g.stage==='training'){updateTraining(dt);return;}
 if(dt<=0)return;g.time+=dt;g.fire-=dt;g.p.inv-=dt;g.shake=Math.max(0,g.shake-dt*30);
 const difficulty=settings.difficulty==='easy'?.75:settings.difficulty==='hard'?1.3:1;
 let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 const length=Math.hypot(dx,dy)||1,old={x:g.p.x,y:g.p.y};if(!dashStep(dt))moveActor(g.p,dx/length*235*dt,dy/length*235*dt,20);g.p.vx=(g.p.x-old.x)/dt;g.p.vy=(g.p.y-old.y)/dt;g.p.moving=!!(dx||dy);
 camera.x=Math.max(0,Math.min(WORLD.w-W,g.p.x-W/2));camera.y=Math.max(0,Math.min(WORLD.h-H,g.p.y-H/2));if(mouse.sx!==undefined){mouse.x=mouse.sx+camera.x;mouse.y=mouse.sy+camera.y;}updateCombat(dt);
 updateVexa(dt);if(mode!=='playing')return;
 if(g.stage==='survival')updateSurvival(dt);
 if(g.stage!=='survival'&&g.stage!=='planet'&&!g.remaining&&!g.enemies.length){g.next-=dt;if(g.next<=0){if(g.wave<5){g.wave++;g.remaining=4+g.wave*2;g.spawn=0;toast('WAVE '+g.wave);}else if(!g.bossSpawned&&g.systems.every(s=>s.progress>=100)){g.wave=6;g.bossSpawned=true;spawn(true);toast('ARCHON HAS ARRIVED');}}}
 if(g.stage!=='survival'&&g.stage!=='planet'&&g.remaining>0){g.spawn-=dt;if(g.spawn<=0){spawn();g.remaining--;g.spawn=1.2;}}
 for(const e of g.enemies){if(e.hp<=0)continue;updateHostile(e,dt,difficulty);if(g.stage!=='planet'&&g.stage!=='survival')g.ship-=dt*(e.boss?.05:.02);}
 for(let i=0;i<g.enemies.length;i++)for(let j=i+1;j<g.enemies.length;j++){const a=g.enemies[i],b=g.enemies[j],d=dist(a,b),overlap=a.r+b.r-d;if(overlap>0&&d>0){const push=Math.min(overlap/2,45*dt),x=(a.x-b.x)/d*push,y=(a.y-b.y)/d*push;moveActor(a,x,y);moveActor(b,-x,-y);}}
 updateProjectiles(dt,difficulty);g.bullets=g.bullets.filter(b=>b.life>0);
 let won=false;g.enemies=g.enemies.filter(e=>{if(e.hp>0)return true;burst(e.x,e.y,'#ff795e',20);if(e.boss){g.coins+=250;if(e.forestBoss){g.forestBossDefeated=true;toast('Ruin Alpha defeated — return to ARK and hold E.');}else if(g.stage!=='survival')won=true;}else{g.drops.push({x:e.x,y:e.y,type:'coin',value:8+g.wave*2},{x:e.x+20,y:e.y,type:'scrap',value:2});}g.next=4;return false;});
 collectDrops(dt);if(g.stage==='planet')updatePlanet(dt);for(const s of g.systems)if(keys.has('e')&&dist(g.p,s)<80&&s.progress<100&&g.scrap>=4){s.progress=Math.min(100,s.progress+22*dt);if(s.progress===100){g.scrap-=4;g.coins+=25;g.ship=Math.min(100,g.ship+22);toast(s.name+' repaired');}}
 for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}g.particles=g.particles.filter(p=>p.life>0);
 hud.innerHTML=`<div class="hudbox">HEALTH ${Math.max(0,Math.ceil(g.p.hp))}<div class="bar"><i style="width:${Math.max(0,g.p.hp)}%"></i></div>${g.stage==='survival'?'SURVIVAL · ROUND '+g.wave+' · BEST '+progress.bestRound:g.stage==='planet'?'CHAPTER II · PLANET SURVIVAL':'HULL '+Math.ceil(g.ship)+'% · WAVE '+g.wave+'/6'}<br>◈ ${g.coins} · ${g.scrap} BOLTS · ${g.med} MEDKITS<br>DASH ${g.p.dashCooldown>0?g.p.dashCooldown.toFixed(1)+'s':'READY'}</div><div class="hudbox">${weapons[g.weapon].name}<br><span class="ammo-readout">${weapons[g.weapon].turret?'ROBOTS '+career.turretStock+' · AMMO '+g.reserve[g.weapon]:weapons[g.weapon].melee?'MELEE · ∞':g.magazines[g.weapon]+' / '+g.reserve[g.weapon]}</span><br>${g.reload?'RELOADING…':'R — Reload · Space — Dash'}</div>`;
 if(won)beginLanding();else if(g.p.hp<=0||g.ship<=0){if(g.stage==='survival')survivalDefeat();else end(false);}
}
