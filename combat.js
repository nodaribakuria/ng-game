'use strict';
document.querySelector('#shop').onclick=()=>inventory();

function initCombat() {
  bindCareer();
  g.magazines = weapons.map((w, i) => g.unlocked[i] ? w.mag : 0);
  g.reserve = weapons.map((w, i) => g.unlocked[i] ? (w.turret?0:w.mag * (i===0?5:2)) + (g.stage==='training'?0:career.ammoBank[i]) : 0);
  if(g.stage!=='training'){g.med+=career.medBank;career.medBank=0;career.ammoBank=weapons.map(()=>0);saveCareer();}
  g.reload = null;g.swing=null;g.turrets=[];
  g.equipTime = 0;
  g.pickupTime = 0;
  g.pickupFx = [];
  g.emptyNotice = 0;
  g.flash = 0;
  g.drops.push({x:1590,y:1180,type:'scrap',value:2}, {x:1680,y:1160,type:'ammo',value:24,weapon:0});
  keys.clear();
}

function equipWeapon(index) {
  if (!g.unlocked[index]) return false;
  if (g.weapon !== index) {
    g.reload = null; // Interrupted reload transfers no ammunition.
    g.weapon = index;career.selected=index;saveCareer();
    g.equipTime = .45;
    g.flash = 0;
    g.fire = Math.max(g.fire, .2);
    sound(330, .07);
  }
  return true;
}

function acquireWeapon(index) {
  const w = weapons[index];
  if (g.unlocked[index]) {
    g.reserve[index] += w.mag;
    return `${w.name} · +${w.mag} rounds`;
  }
  g.unlocked[index] = true;
  g.magazines[index] = w.mag;
  g.reserve[index] = w.mag * 2;
  equipWeapon(index);saveCareer();
  return `${w.name} picked up`;
}

function reloadWeapon() {
  const index = g.weapon, w = weapons[index];
  if (w.melee||w.turret) return false;
  if (g.reload || g.magazines[index] >= w.mag) return false;
  if (!g.reserve[index]) {
    if (g.emptyNotice <= 0) { toast('Out of ammo — Press I to buy ammunition'); g.emptyNotice = 2; }
    return false;
  }
  g.reload = {weapon:index, elapsed:0, duration:w.reload};
  g.flash = 0;
  sound(190, .1);
  return true;
}

function updateCombat(dt) {
  if(typeof updateEngineerMotion==='function')updateEngineerMotion(dt);
  if(typeof mobileAim==='function')mobileAim();
  updateTurrets(dt);
  if(g.swing){g.swing.time-=dt;if(g.swing.time<=0)g.swing=null;}
  g.equipTime = Math.max(0, g.equipTime - dt);
  g.pickupTime = Math.max(0, g.pickupTime - dt);
  g.flash = Math.max(0, g.flash - dt);
  g.emptyNotice -= dt;
  if (g.reload) {
    g.reload.elapsed += dt;
    if (g.reload.elapsed >= g.reload.duration) {
      const i = g.reload.weapon;
      const transfer = Math.min(weapons[i].mag - g.magazines[i], g.reserve[i]);
      g.magazines[i] += transfer;
      g.reserve[i] -= transfer;
      g.reload = null;
      sound(480, .09);
    }
    return; // Reload completion and firing happen on separate frames.
  }
  if (!mouse.down || g.fire > 0 || g.equipTime > 0) return;
  if(weapons[g.weapon].turret){if(deployTurret(weapons[g.weapon]))g.fire=1;return;}
  if(weapons[g.weapon].melee){meleeAttack();return;}
  if (g.magazines[g.weapon] === 0) { reloadWeapon(); return; }
  const w = weapons[g.weapon], aim = Math.atan2(mouse.y-g.p.y, mouse.x-g.p.x);
  if(w.turret){if(!deployTurret(w))return;g.magazines[g.weapon]--;g.fire=w.rate;return;}
  g.magazines[g.weapon]--;
  for (let pellet=0; pellet<w.pellets; pellet++) {
    const angle = aim + (pellet-(w.pellets-1)/2)*.12;
    g.bullets.push({x:g.p.x+Math.cos(aim)*w.muzzle,y:g.p.y+Math.sin(aim)*w.muzzle,
      startX:g.p.x,startY:g.p.y,vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed,
      damage:w.damage*(1+(g.levels[g.weapon]-1)*.3),life:w.life,enemy:false,color:w.color,blast:w.blast});
  }
  g.fire = w.rate;
  g.flash = .065;
  sound([600,430,110,220,300,150,780,85,170,260][g.weapon]||350,g.weapon===7?.16:.065);
}

function canCollect(drop){return clearLine(g.p,drop,2);}

function collectDrops(dt) {
  g.drops = g.drops.filter(d => {
    // Death drops can be offset into a doorway or wall. Put them on nearby deck.
    if(!walkable(d.x,d.y)) {
      let found=false;
      for(let radius=8;radius<=80&&!found;radius+=8)for(let n=0;n<16;n++){
        const a=n*Math.PI/8,x=d.x+Math.cos(a)*radius,y=d.y+Math.sin(a)*radius;
        if(walkable(x,y)){d.x=x;d.y=y;found=true;break;}
      }
    }
    const distance = dist(d,g.p);
    if (distance > 105 || !canCollect(d)) return true;
    const speed = Math.min(1,dt*12);
    d.x += (g.p.x-d.x)*speed;
    d.y += (g.p.y-d.y)*speed;
    if (dist(d,g.p) > 28) return true;
    let label='',color='#8fe6d2';
    if(d.type==='coin'){g.coins+=d.value;label=`+${d.value} coins`;color='#ffcc69';}
    if(d.type==='scrap'){g.scrap+=d.value;label=`+${d.value} bolts`;color='#a4d9f3';}
    if(d.type==='med'){g.med+=d.value;label='+1 Medkit';}
    if(d.type==='weapon'){label=acquireWeapon(d.value);toast(label);color=weapons[d.value].color;}
    if(d.type==='ammo'){const i=d.weapon??g.weapon;g.reserve[i]+=d.value;label=`+${d.value} rounds`;color=weapons[i].color;}
    g.pickupTime=.45;
    g.pickupFx.push({x:g.p.x,y:g.p.y-60-g.pickupFx.length*14,label,color,life:1.25});
    burst(g.p.x,g.p.y,color,7);
    sound(850,.04);
    return false;
  });
  for(const fx of g.pickupFx){fx.life-=dt;fx.y-=dt*27;}
  g.pickupFx=g.pickupFx.filter(fx=>fx.life>0);
}

function baseWeaponIcon(i){
 if(weapons[i].melee)return '<svg class="weapon-icon" viewBox="0 0 170 70"><g transform="rotate(-20 85 35)"><path d="M20 35h45" stroke="#8d7b91" stroke-width="9"/><path d="M30 31v8m8-8v8m8-8v8" stroke="#272032" stroke-width="3"/>'+(i===4?'<path d="M60 24l85 7-14 13H60z" fill="#ef416f" stroke="#ffb0d8" stroke-width="3"/><path d="M60 16v36" stroke="#b7a0bf" stroke-width="6"/>':'<path d="M70 12h45v46H70z" fill="#453054" stroke="#bc96ec" stroke-width="3"/><path d="M78 17l20 15-15 7 21 15" fill="none" stroke="#e4bcff" stroke-width="4"/>')+'</g></svg>';
 const c=weapons[i].color,length=[63,96,101,119][i];
 return '<svg class="weapon-icon" viewBox="0 0 170 70" aria-hidden="true"><g transform="rotate(-8 85 35)"><path d="M8 27L20 18H'+length+'l10 8v17H23L8 35Z" fill="#39262f" stroke="#a8a0a4" stroke-width="1.4"/><path d="M23 40h18l-5 22H23l-5-6z" fill="#191820" stroke="#826e79"/><path d="M'+length+' 26h25v10h-25z" fill="#201c25" stroke="#8d6571"/><path d="M'+(length+18)+' 22h10v18h-10z" fill="#45333c" stroke="#be7386"/><path d="M23 24H'+(length-8)+'" stroke="'+c+'" stroke-width="4"/><path d="M45 33h'+(length-48)+'v7H45z" fill="#ba3455"/><path d="M28 45h6m-7 5h6m-7 5h6" stroke="#735868" stroke-width="2"/>'+(i===1?'<path d="M65 42h15l-4 22H63z" fill="#42333f" stroke="#a17888"/><path d="M15 25H2v22h15" fill="#24202b" stroke="#836571"/>':i===2?'<path d="M58 43h40v9H58z" fill="#574332" stroke="#c0985a"/><path d="M63 43v9m7-9v9m7-9v9m7-9v9m7-9v9" stroke="#1b1921" stroke-width="2"/>':i===3?'<path d="M55 8h40v11H55z" fill="#2e273b" stroke="#bb9ed4"/><path d="M65 19v5m22-5v5" stroke="#817388" stroke-width="4"/><path d="M101 24v18m7-18v18m7-18v18" stroke="#c191fa" stroke-width="2"/>':'')+'<path d="M38 43v10h12l4-10" fill="none" stroke="#ab8896"/><circle cx="22" cy="31" r="2" fill="#f3bca3"/><circle cx="'+(length-5)+'" cy="37" r="2" fill="#f3bca3"/></g></svg>';
}
