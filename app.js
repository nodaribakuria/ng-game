/* ARK 2026-10-11: run node build.cjs after editing the source files. */
(()=>{
'use strict';

// --- game.js ---
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay'),hud=document.querySelector('#hud');
const W=1280,H=720,keys=new Set(),mouse={x:640,y:360,down:false};
const WORLD={w:3000,h:1800},camera={x:0,y:0};
const art={};for(const name of ['robot','boss','engineer-red','engineer-orange']){art[name]=new Image();art[name].src=`assets/${name}.png`;}
let settings={volume:.35,difficulty:'normal',shake:true,autoAim:false},character='engineer-red';try{Object.assign(settings,JSON.parse(localStorage.getItem('ark-settings')||'{}'));}catch{}
let mode='menu',g,last=0,audio;
let loopScheduled=false,frameRequest=null;
const weapons=[
  {name:'Tactical Pistol',description:'Accurate and economical starting weapon',cost:0,damage:22,rate:.3,speed:650,mag:12,reload:1.25,pack:36,ammoCost:12,pellets:1,muzzle:56,life:1.6,color:'#7ce7ef'},
  {name:'Plasma Rifle',description:'Rapid automatic fire',cost:75,damage:15,rate:.12,speed:800,mag:30,reload:1.8,pack:60,ammoCost:24,pellets:1,muzzle:76,life:1.6,color:'#68e0ba'},
  {name:'Energy Shotgun',description:'One shell fires five pellets',cost:130,damage:18,rate:.65,speed:580,mag:6,reload:2.2,pack:18,ammoCost:24,pellets:5,muzzle:83,life:.85,color:'#f7bb69'},
  {name:'Railgun',description:'High damage at long range',cost:200,damage:100,rate:1,speed:1100,mag:5,reload:2.5,pack:15,ammoCost:30,pellets:1,muzzle:92,life:2,color:'#c5a0ff'}
  ,{name:'Energy Sword',description:'Fast sweeping blade; no ammunition needed',melee:true,cost:95,damage:48,rate:.42,range:112,arc:1.35,mag:0,reload:0,pack:0,ammoCost:0,color:'#ff548e'},
  {name:'Hammer',description:'Heavy wide swing; staggers nearby robots',melee:true,cost:160,damage:95,rate:.95,range:100,arc:1.9,mag:0,reload:0,pack:0,ammoCost:0,color:'#b895ff'}
 ,{name:'Laser SMG',description:'Compact laser weapon with very rapid fire',cost:180,damage:11,rate:.075,speed:950,mag:40,reload:1.4,pack:80,ammoCost:26,pellets:1,muzzle:65,life:1.1,color:'#ff5c7c',model:1,group:'rifle'},
 {name:'Rocket Launcher',description:'Explosive rockets damage nearby enemies; walls block the blast',cost:320,damage:145,rate:1.3,speed:390,mag:3,reload:2.8,pack:6,ammoCost:36,pellets:1,muzzle:85,life:2.8,color:'#ff994c',model:2,group:'heavy',blast:125},
 {name:'Minigun',description:'Belt-fed rotary gun with a deep ammunition reserve',cost:380,damage:13,rate:.055,speed:750,mag:100,reload:3.4,pack:150,ammoCost:45,pellets:1,muzzle:88,life:1.4,color:'#ffbb65',model:1,group:'heavy'},
 {name:'Sniper Rifle',description:'Precise high-damage shots with a long barrel',cost:290,damage:160,rate:1.45,speed:1450,mag:4,reload:2.6,pack:12,ammoCost:32,pellets:1,muzzle:100,life:2,color:'#83dbff',model:3,group:'rifle'},
 {name:'Plasma Axe',description:'Broad plasma blade sweeps through nearby robots',cost:240,damage:115,rate:1.05,range:125,arc:2.1,mag:0,reload:0,pack:0,ammoCost:0,color:'#e577ff',melee:true,model:5,group:'melee'},
 {name:'Pulse Turret',description:'Deploy one purchased robot. 240 HP; repair with F, refill with G',cost:450,damage:24,rate:2,speed:720,mag:1,reload:3,pack:60,ammoCost:24,pellets:1,muzzle:60,life:1.5,color:'#ff5265',model:1,group:'special',turret:true}
];
weapons.forEach((w,i)=>{w.model??=i;w.group??=w.melee?'melee':i===0?'pistol':i===2?'shotgun':'rifle';});
function sound(freq=300,duration=.06){if(!settings.volume)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let o=audio.createOscillator(),v=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq/2,audio.currentTime+duration);v.gain.setValueAtTime(settings.volume*.12,audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(v).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
let toastTimer;function toast(s){const t=document.querySelector('#toast');t.textContent=s;t.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.opacity=0,2600);}
function panel(content){overlay.innerHTML=`<section class="panel">${content}</section>`;}
let menuCanResume=false;
function menu(){if(['playing','paused','map'].includes(mode)&&g)menuCanResume=true;if(['ended','training-complete','error'].includes(mode))menuCanResume=false;mode='menu';hud.hidden=true;mouse.down=false;keys.clear();panel(`<div class="nexus-menu"><div class="nexus-top"><button class="commander" data-action="crew"><span class="commander-face crew-photo ${character}" role="img" aria-label="Selected engineer portrait"></span><span>COMMANDER<small>${character==='engineer-red'?'NIA / ENGINEER':'ELENA / ENGINEER'}</small></span><b>◈</b></button><div class="nexus-wallet">◈ ${career.coins.toLocaleString()} <small>COINS</small>　<span>⚙ ${career.unlocked.filter(Boolean).length}/${weapons.length}</span></div></div><div class="nexus-title"><img class="nexus-logo" src="assets/red-nexus-logo.png" alt="Red Nexus"></div><nav class="nexus-actions" aria-label="Main menu"><button class="launch" data-action="start"><span>▷</span> START GAME</button><button data-action="continue" ${menuCanResume?'':'disabled'} title="Resume the current mission in this browser session"><span>◷</span> CONTINUE</button><button data-action="chapter2" ${progress.chapter2?'':'disabled'} title="Unlocked and saved after defeating Archon"><span>◈</span> CHAPTER II ${progress.chapter2?' / SAVED':' / LOCKED'}</button><button data-action="survival"><span>⚔</span> SURVIVAL / ROUNDS</button><button data-action="training"><span>✧</span> TRAINING WITH MARI</button><button data-action="shop"><span>⚒</span> ARMORY / SHOP</button><button data-action="settings"><span>⚙</span> SETTINGS</button><button data-action="exit"><span>⇥</span> EXIT</button></nav><div class="nexus-bottom"><div class="sector-card"><span>SECTOR ALPHA</span><strong>● SYSTEM ONLINE</strong><small>ORBITAL SURVIVAL → PLANET EXPEDITION</small></div><button data-action="crew">SELECT ENGINEER　◈</button></div></div>`);}
function chooseCrew(){panel(`<div class="eyebrow">COMMANDER / CREW SELECTION</div><h1>Choose your engineer</h1><div class="cards">${['engineer-red','engineer-orange'].map((name,i)=>'<button class="character '+(character===name?'selected':'')+'" data-char="'+name+'"><span class="portrait crew-photo '+name+'" role="img" aria-label="'+['Nia','Elena'][i]+' portrait"></span><span>'+['Nia / Red Engineer','Elena / Orange Engineer'][i]+'</span></button>').join('')}</div><div class="row"><button data-action="menu">Back</button></div>`);}
function start(training=false){restoreShipWorld();g={p:{x:1500,y:1160,hp:100,inv:0},ship:65,coins:0,scrap:8,med:2,unlocked:[true,false,false,false],levels:[1,1,1,1],weapon:0,enemies:[],bullets:[],drops:[{x:430,y:1370,type:'scrap',value:4},{x:2490,y:1380,type:'med',value:1},{x:2490,y:610,type:'weapon',value:1}],particles:[],wave:0,spawn:0,remaining:0,next:2,fire:0,time:0,bossSpawned:false,shake:0,systems:[{x:510,y:510,name:'Engine',progress:0},{x:1500,y:1010,name:'Reactor',progress:0},{x:1500,y:280,name:'Navigation',progress:0}]};if(training)g.stage='training';initCombat();setupVexa();mode='playing';overlay.innerHTML='';hud.hidden=false;mouse.down=false;focusGame();ensureGameLoop();toast('Auto-pickup enabled · R — Reload · I — Shop');}
function pause(){if(mode==='landing'||mode==='departing')return;if(mode==='map'){resume();return;}if(mode==='inventory'){closeShop();return;}if(mode==='settings'&&settingsReturn==='menu'){menu();return;}if(!g||mode==='menu')return;if(mode==='playing'){mode='paused';mouse.down=false;panel('<div class="eyebrow">MISSION PAUSED</div><h1>Pause</h1><div class="row"><button class="primary" data-action="resume">Resume</button><button data-action="restart">Restart</button><button data-action="settings">Settings</button><button data-action="menu">Main Menu</button></div>');}else if(['paused','inventory','settings'].includes(mode))resume();}
function resume(){mode='playing';hud.hidden=false;overlay.innerHTML='';keys.clear();mouse.down=false;focusGame();ensureGameLoop();}
let settingsReturn='menu';function showSettings(){settingsReturn=mode;mode='settings';panel(`<h2>Settings</h2><label>Volume <input id="volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label><label>Difficulty <select id="difficulty"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><label><input id="shake" type="checkbox" ${settings.shake?'checked':''}> Screen Shake</label><label><input id="auto-aim" type="checkbox" ${settings.autoAim?'checked':''}> Auto aim / Fire button</label><p>Auto aim selects the nearest visible enemy. Hold Fire to shoot.</p><button class="primary" data-action="save">Save and Return</button>`);document.querySelector('#difficulty').value=settings.difficulty;}
function inventory(){shopInventory();}
function refreshInventory(){renderShop();}
function heal(){if(g.med>0&&g.p.hp<100){g.med--;g.p.hp=Math.min(100,g.p.hp+45);sound(500);toast('Health restored.');}else toast('No medkits available, or health is already full.');}
overlay.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.char){character=b.dataset.char;menu();}if(b.dataset.inspect!==undefined){shopSelected=+b.dataset.inspect;renderShop();return;}if(b.dataset.filter){shopFilter=b.dataset.filter;renderShop();return;}if(b.dataset.category){shopCategory=b.dataset.category;if(shopCategory==='melee')shopSelected=4;else if(shopCategory!=='supplies'&&weapons[shopSelected].melee)shopSelected=0;renderShop();return;}let i;if(b.dataset.unlock!==undefined){i=+b.dataset.unlock;buyWeapon(i);refreshInventory();}if(b.dataset.equip!==undefined){selectWeapon(+b.dataset.equip);refreshInventory();}if(b.dataset.upgrade!==undefined){i=+b.dataset.upgrade;upgradeWeapon(i);refreshInventory();}if(b.dataset.ammo!==undefined){buyAmmo(+b.dataset.ammo);refreshInventory();}switch(b.dataset.action){case'chapter2':launchChapterTwo();break;case'survival':startSurvival();break;case'crew':chooseCrew();break;case'continue':if(menuCanResume&&g)resume();break;case'exit':panel('<div class="eyebrow">SEE YOU SOON, COMMANDER</div><h1>Exit game</h1><p>You can now close this browser tab. Coins and weapon upgrades are saved. Current mission progress is kept only while this page stays open.</p><button data-action="menu">Back to menu</button>');break;case'training':startTraining();break;case'start':start();break;case'restart':if(g?.stage==='training')startTraining();else if(g?.stage==='survival')startSurvival();else if(g?.stage==='planet')launchChapterTwo();else start();break;case'shop':shopInventory();break;case'shop-close':closeShop();break;case'resume':resume();break;case'menu':menu();break;case'settings':showSettings();break;case'save':settings.volume=+document.querySelector('#volume').value;settings.difficulty=document.querySelector('#difficulty').value;settings.shake=document.querySelector('#shake').checked;settings.autoAim=document.querySelector('#auto-aim').checked;try{localStorage.setItem('ark-settings',JSON.stringify(settings));}catch{}if(settingsReturn==='menu')menu();else{mode='playing';pause();}break;case'heal':heal();refreshInventory();break;case'med':buyMedkit();refreshInventory();}});
document.querySelector('#pause').onclick=pause;document.querySelector('#map').onclick=()=>toggleMap();
function inputKey(e){return e.code?.startsWith('Key')?e.code.slice(3).toLowerCase():e.code?.startsWith('Digit')?e.code.slice(5):e.key.toLowerCase();}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const k=inputKey(e);if(!e.repeat){if(k==='escape')pause();if(k==='i')inventory();if(k==='m')toggleMap();if(mode==='playing'&&k==='q')cycleWeapon(-1);if(mode==='playing'&&k==='t')cycleWeapon(1);if(mode==='playing'&&k==='h')heal();if(mode==='playing'&&k==='r')reloadWeapon();if(mode==='playing'&&['1','2','3','4','5','6'].includes(k))equipWeapon(+k-1);}keys.add(k);});window.addEventListener('keyup',e=>keys.delete(inputKey(e)));window.addEventListener('blur',()=>{keys.clear();mouse.down=false;if(mode==='playing')pause();});
function updateAim(e){const r=canvas.getBoundingClientRect();mouse.sx=(e.clientX-r.left)*W/r.width;mouse.sy=(e.clientY-r.top)*H/r.height;mouse.x=mouse.sx+camera.x;mouse.y=mouse.sy+camera.y;}
canvas.addEventListener('mousemove',updateAim);
canvas.addEventListener('mousedown',e=>{if(e.button===0&&mode==='playing'){e.preventDefault();focusGame();updateAim(e);mouse.down=true;ensureGameLoop();}});window.addEventListener('mouseup',()=>mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function burst(x,y,color,n=10){for(let i=0;i<n;i++)g.particles.push({x,y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:.5+Math.random()*.4,color});}
function end(win){menuCanResume=false;saveCareer();mode='ended';mouse.down=false;panel(`<div class="eyebrow">${win?'MISSION COMPLETE':'SIGNAL LOST'}</div><h1>${win?'Home at last!':'Mission failed'}</h1><p>${win?'You survived the planet, restored ARK and returned home.':g.p.hp<=0?'The engineer has fallen. Upgrade your weapons and use medkits to survive.':'The ship was destroyed. Repair its systems to restore hull integrity.'}</p><div class="metrics"><span>Wave ${Math.min(g.wave,6)}</span><span>${g.coins} saved coins</span></div><div class="row"><button class="primary" data-action="restart">Try Again</button><button data-action="shop">Shop & Upgrades</button><button data-action="menu">Main Menu</button></div>`);}
function text(s,x,y,color='#98afc4',size=12){ctx.fillStyle=color;ctx.font=`${size}px Segoe UI`;ctx.textAlign='center';ctx.fillText(s,x,y);}

function focusGame(){canvas.focus?.({preventScroll:true});}
function ensureGameLoop(){
  if(loopScheduled)return;
  loopScheduled=true;
  frameRequest=requestAnimationFrame(frame);
}
function frame(t){
  loopScheduled=false;
  const dt=last?Math.max(0,Math.min((t-last)/1000,.04)):1/60;
  last=t;
  try{
    if(mode==='landing'||mode==='departing')updateFlight(dt);else if(mode==='playing')update(dt);
    if(typeof updateMobile==='function')updateMobile();
    draw();
  }catch(error){
    mode='error';mouse.down=false;keys.clear();
    console.error('ARK frame failed:',error);
    panel('<h1>Game could not update</h1><p>The error below stopped the game. Reload the page to try again.</p><pre id="runtime-error"></pre>');
    document.querySelector('#runtime-error').textContent=String(error.stack||error);
    return;
  }
  ensureGameLoop();
}
function bootGame(){
  canvas.tabIndex=0;
  menu();
  ensureGameLoop();
}



// --- combat.js ---
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
  sound(g.weapon===2?110:g.weapon===3?220:600,.065);
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


// --- world.js ---
'use strict';

// Rendering, movement, sight, and projectiles share exactly these wall rectangles.
const rooms=[
  {x:1120,y:100,w:760,h:420,name:'01 / COMMAND',color:'#ec6561',kind:'bridge',ports:{bottom:true,left:400,right:400}},
  {x:160,y:260,w:700,h:500,name:'02 / ENGINEERING',color:'#ed8952',kind:'engine',ports:{right:510,bottom:true}},
  {x:2140,y:260,w:700,h:500,name:'03 / ARMORY',color:'#d75670',kind:'armory',ports:{left:510,bottom:true}},
  {x:1120,y:700,w:760,h:400,name:'04 / CRIMSON CORE',color:'#ff365f',kind:'reactor',ports:{top:true,bottom:true,left:900,right:900}},
  {x:160,y:1040,w:700,h:500,name:'05 / CARGO',color:'#dc8051',kind:'cargo',ports:{right:1290,top:true}},
  {x:2140,y:1040,w:700,h:500,name:'06 / MEDICAL',color:'#5bd5de',kind:'medical',ports:{left:1290,top:true}},
  {x:1120,y:1280,w:760,h:420,name:'07 / ARCHON DOCK',color:'#fa604d',kind:'drive',ports:{top:true,left:1400,right:1400}}
];
const floorAreas=[...rooms,
  {x:820,y:360,w:1360,h:300},{x:820,y:1140,w:1360,h:300},
  {x:1300,y:480,w:400,h:840},{x:340,y:720,w:340,h:360},
  {x:2320,y:720,w:340,h:360},{x:640,y:760,w:1720,h:280}
];
const floorContains=(x,y)=>floorAreas.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
const walls=[],doors=[];
function wall(x,y,w,h){if(w>0&&h>0)walls.push({x,y,w,h});}
function horizontalWall(r,y,open){
  if(!open){wall(r.x,y,r.w,16);return;}
  const center=r.x+r.w/2;
  wall(r.x,y,center-150-r.x,16);wall(center+150,y,r.x+r.w-center-150,16);
  doors.push({x:center-150,y,w:300,h:16,color:r.color});
}
function verticalWall(r,x,center){
  if(!center){wall(x,r.y,16,r.h);return;}
  const from=Math.max(r.y,center-150),to=Math.min(r.y+r.h,center+150);
  wall(x,r.y,16,from-r.y);wall(x,to,16,r.y+r.h-to);
  doors.push({x,y:from,w:16,h:to-from,color:r.color});
}
rooms.forEach(r=>{
  horizontalWall(r,r.y,r.ports.top);horizontalWall(r,r.y+r.h-16,r.ports.bottom);
  verticalWall(r,r.x,r.ports.left);verticalWall(r,r.x+r.w-16,r.ports.right);
});
// Merge the exposed 20px floor-grid edges into physical exterior hull segments.
const edgeGroups=new Map();
function edge(axis,at,from,to){const key=axis+':'+at;if(!edgeGroups.has(key))edgeGroups.set(key,[]);edgeGroups.get(key).push([from,to]);}
for(let y=0;y<1800;y+=20)for(let x=0;x<3000;x+=20)if(floorContains(x+10,y+10)){
  if(!floorContains(x+10,y-10))edge('h',y,x,x+20);
  if(!floorContains(x+10,y+30))edge('h',y+20,x,x+20);
  if(!floorContains(x-10,y+10))edge('v',x,y,y+20);
  if(!floorContains(x+30,y+10))edge('v',x+20,y,y+20);
}
for(const [key,segments] of edgeGroups){
  const [axis,value]=key.split(':'),at=+value;segments.sort((a,b)=>a[0]-b[0]);
  let from=segments[0][0],to=segments[0][1];
  const add=()=>axis==='h'?wall(from,at-6,to-from,12):wall(at-6,from,12,to-from);
  for(let i=1;i<segments.length;i++){if(segments[i][0]===to)to=segments[i][1];else{add();[from,to]=segments[i];}}add();
}

function walkable(x,y,radius=20){
  if(!floorContains(x,y))return false;
  for(const w of walls){
    const nx=Math.max(w.x,Math.min(x,w.x+w.w)),ny=Math.max(w.y,Math.min(y,w.y+w.h));
    if(radius===0?x>=w.x&&x<=w.x+w.w&&y>=w.y&&y<=w.y+w.h:(x-nx)**2+(y-ny)**2<radius*radius)return false;
  }
  return true;
}
function segmentRectT(ax,ay,bx,by,w,r=0){
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[ax,bx-ax,w.x-r,w.x+w.w+r],[ay,by-ay,w.y-r,w.y+w.h+r]]){
    if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return Infinity;continue;}
    let a=(min-origin)/delta,b=(max-origin)/delta;if(a>b)[a,b]=[b,a];
    lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity;
  }
  return lo;
}
function traceWall(ax,ay,bx,by,radius=0){
  let t=Infinity;for(const w of walls)t=Math.min(t,segmentRectT(ax,ay,bx,by,w,radius));return t;
}
function clearLine(a,b,radius=0){return traceWall(a.x,a.y,b.x,b.y,radius)===Infinity;}
function moveActor(actor,dx,dy,radius=actor.r||20){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/8));let moved=false;
  for(let n=0;n<steps;n++){
    const x=actor.x+dx/steps,y=actor.y+dy/steps;
    if(walkable(x,y,radius)){actor.x=x;actor.y=y;moved=true;}
    else if(walkable(x,actor.y,radius)){actor.x=x;moved=true;}
    else if(walkable(actor.x,y,radius)){actor.y=y;moved=true;}
  }
  return moved;
}
function roomAt(p){return rooms.find(r=>p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h);}

// A shared breadth-first flow field per body size avoids door-target oscillation.
const NAV_SIZE=40,navGrids=new Map(),navFields=new Map();let NAV_COLS=75,NAV_ROWS=45;
function navPoint(index){return{x:(index%NAV_COLS+.5)*NAV_SIZE,y:(Math.floor(index/NAV_COLS)+.5)*NAV_SIZE};}
function navGrid(radius){
  if(navGrids.has(radius))return navGrids.get(radius);
  const valid=new Uint8Array(NAV_COLS*NAV_ROWS),neighbors=Array.from({length:valid.length},()=>[]);
  for(let i=0;i<valid.length;i++){const p=navPoint(i);valid[i]=walkable(p.x,p.y,radius+1)?1:0;}
  for(let i=0;i<valid.length;i++)if(valid[i]){
    const x=i%NAV_COLS,y=Math.floor(i/NAV_COLS);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,j=ny*NAV_COLS+nx;
      if(nx>=0&&nx<NAV_COLS&&ny>=0&&ny<NAV_ROWS&&valid[j]&&clearLine(navPoint(i),navPoint(j),radius+1))neighbors[i].push(j);
    }
  }
  const grid={valid,neighbors};navGrids.set(radius,grid);return grid;
}
function closestNode(p,radius,requireSight=false){
 const {valid}=navGrid(radius),cx=Math.floor(p.x/NAV_SIZE),cy=Math.floor(p.y/NAV_SIZE);
 for(const reach of [1,2,4,8,32,80]){const candidates=[];for(let y=Math.max(0,cy-reach);y<=Math.min(NAV_ROWS-1,cy+reach);y++)for(let x=Math.max(0,cx-reach);x<=Math.min(NAV_COLS-1,cx+reach);x++){const i=y*NAV_COLS+x;if(valid[i]){const n=navPoint(i);candidates.push({i,d:(n.x-p.x)**2+(n.y-p.y)**2});}}candidates.sort((a,b)=>a.d-b.d);for(const c of candidates)if(clearLine(p,navPoint(c.i),requireSight?radius:0))return c.i;}return -1;
}
function flowField(p,radius){
  const target=closestNode(p,radius),existing=navFields.get(radius);
  if(existing?.target===target)return existing;
  const grid=navGrid(radius),distance=new Int32Array(grid.valid.length).fill(-1),queue=new Int32Array(grid.valid.length);
  let head=0,tail=0;if(target>=0){distance[target]=0;queue[tail++]=target;}
  while(head<tail){const i=queue[head++];for(const j of grid.neighbors[i])if(distance[j]<0){distance[j]=distance[i]+1;queue[tail++]=j;}}
  const field={target,distance};navFields.set(radius,field);return field;
}
function chaseTarget(e,p){
  const radius=e.r||24;
  if(clearLine(e,p,radius))return p;
  const grid=navGrid(radius),field=flowField(p,radius),at=closestNode(e,radius,true);
  if(at<0)return e;
  let next=at,best=field.distance[at];
  for(const i of grid.neighbors[at])if(field.distance[i]>=0&&(best<0||field.distance[i]<best)&&clearLine(e,navPoint(i),radius)){
    next=i;best=field.distance[i];
  }
  return navPoint(next);
}
function moveEnemy(e,dt,difficulty=1){
  const target=chaseTarget(e,g.p),distance=dist(e,target),step=Math.min(distance,e.speed*difficulty*dt);
  if(distance>.1)moveActor(e,(target.x-e.x)/distance*step,(target.y-e.y)/distance*step,e.r);
}
function segmentCircleT(ax,ay,bx,by,c,r){
  const dx=bx-ax,dy=by-ay,ox=ax-c.x,oy=ay-c.y,aa=dx*dx+dy*dy,cc=ox*ox+oy*oy-r*r;
  if(cc<=0)return 0;if(aa<1e-9)return Infinity;
  const bb=2*(ox*dx+oy*dy),disc=bb*bb-4*aa*cc;if(disc<0)return Infinity;
  const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:Infinity;
}
function updateProjectiles(dt,difficulty){
  for(const b of g.bullets){
    if(b.life<=0)continue;
    const ax=b.startX??b.x,ay=b.startY??b.y,bx=b.x+b.vx*dt,by=b.y+b.vy*dt;
    delete b.startX;delete b.startY;
    const wallT=traceWall(ax,ay,bx,by,b.enemy?5:3);
    let victim=null,hitT=Infinity;
    const targets=b.enemy?[...(g.p.inv<=0?[g.p]:[]),...(g.turrets||[]).filter(t=>t.hp>0)]:g.enemies.filter(e=>e.hp>0);
    for(const target of targets){const t=segmentCircleT(ax,ay,bx,by,target,(target.r||20)+(b.enemy?5:3));if(t<hitT){hitT=t;victim=target;}}
    if(wallT!==Infinity&&wallT<=hitT){b.x=ax+(bx-ax)*wallT;b.y=ay+(by-ay)*wallT;b.life=0;burst(b.x,b.y,'#91b5cd',3);}
    else if(victim){
      b.x=ax+(bx-ax)*hitT;b.y=ay+(by-ay)*hitT;b.life=0;
      if(b.enemy){victim.hp-=(b.damage||12)*difficulty;victim.inv=.45;g.shake=6;}else victim.hp-=b.damage;
      burst(b.x,b.y,b.enemy?'#ff7182':'#ffbd77',5);
    }else{b.x=bx;b.y=by;b.life-=dt;}
  }
}
function drawWalls(){
  for(const w of walls){box(w.x,w.y,w.w,w.h,'#332733','#a14c60');}
  for(const d of doors){box(d.x,d.y,d.w,d.h,'#342b35');
    if(d.w>d.h){line(d.x+5,d.y+3,d.x+d.w-5,d.y+3,d.color,2);}
    else line(d.x+3,d.y+5,d.x+3,d.y+d.h-5,d.color,2);
  }
  for(const y of [410,1390])for(const x of [1000,1990]){
    text('↔',x,y+8,'#8be0ce',32);
  }
}


// --- boss.js ---
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


// --- melee-ranged.js ---
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


// --- arsenal.js ---
function cycleWeapon(direction){for(let n=1;n<=weapons.length;n++){const i=(g.weapon+direction*n+weapons.length*2)%weapons.length;if(g.unlocked[i]){equipWeapon(i);return;}}}
function explodeRocket(b){burst(b.x,b.y,'#ff9955',30);g.shake=9;for(const e of g.enemies)if(e.hp>0&&dist(e,b)<b.blast&&clearLine(b,e,0))e.hp-=b.damage*.55*(1-dist(e,b)/b.blast);}
function deployTurret(w){g.turrets??=[];if(!career.turretStock){toast('Buy one support robot from the shop first.');g.fire=.5;return false;}if(g.turrets.length>=4){toast('Maximum four active robots.');g.fire=.5;return false;}const a=Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x),x=g.p.x+Math.cos(a)*85,y=g.p.y+Math.sin(a)*85;if(!walkable(x,y,24)||!clearLine(g.p,{x,y},20)||g.turrets.some(t=>dist(t,{x,y})<50)){toast('Find a clear position to deploy.');g.fire=.5;return false;}career.turretStock--;saveCareer();g.turrets.push({x,y,r:22,hp:240,max:240,ammo:60,capacity:120,fire:0,inv:0,service:0,angle:a,damage:w.damage*(1+(g.levels[11]-1)*.3)});return true;}
function updateHostile(e,dt,difficulty){const player=g.p;const targets=[player,...(g.turrets||[]).filter(t=>t.hp>0)];const target=targets.sort((a,b)=>dist(e,a)-dist(e,b))[0];try{g.p=target;if(e.boss)updateBoss(e,dt,difficulty*(e.bossStrength||1));else if(e.ranged)updateRanged(e,dt,difficulty);else moveEnemy(e,dt,difficulty);if(dist(e,target)<e.r+(target.r||20))hitPlayer((e.damage||(e.boss?24:10))*difficulty);}finally{g.p=player;}}
function updateTurrets(dt){if(!g.turrets)return;for(const t of g.turrets){if(t.hp<=0)continue;t.inv=Math.max(0,t.inv-dt);t.service=Math.max(0,t.service-dt);t.fire-=dt;if(dist(t,g.p)<100&&clearLine(t,g.p,2)&&t.service<=0){if(keys.has('f')&&t.hp<t.max&&g.scrap>0){g.scrap--;t.hp=Math.min(t.max,t.hp+50);t.service=.5;sound(400,.06);}else if(keys.has('g')&&t.ammo<t.capacity&&g.reserve[11]>0){const n=Math.min(30,t.capacity-t.ammo,g.reserve[11]);g.reserve[11]-=n;t.ammo+=n;t.service=.5;sound(600,.06);}}const e=g.enemies.filter(e=>e.hp>0&&dist(t,e)<600&&clearLine(t,e,3)).sort((a,b)=>dist(t,a)-dist(t,b))[0];if(e&&t.fire<=0&&t.ammo>0){t.angle=Math.atan2(e.y-t.y,e.x-t.x);g.bullets.push({x:t.x,y:t.y,vx:Math.cos(t.angle)*720,vy:Math.sin(t.angle)*720,life:1,damage:t.damage,color:'#ff718a',enemy:false});t.fire=.24;t.ammo--;}}g.turrets=g.turrets.filter(t=>{if(t.hp>0)return true;burst(t.x,t.y,'#ff9b76',15);return false;});}
function drawTurrets(){for(const t of g.turrets||[]){ctx.save();ctx.translate(t.x,t.y);for(let n=0;n<3;n++){const a=n*Math.PI*2/3;line(0,0,Math.cos(a)*28,Math.sin(a)*28,'#93848c',6);}ctx.rotate(t.angle);box(-15,-14,34,28,'#3c2735','#b7748b');box(12,-7,33,14,'#6c3447','#ff8599');ctx.restore();box(t.x-30,t.y-40,60,5,'#442b38');box(t.x-30,t.y-40,60*t.hp/t.max,5,'#84e6b3');text(Math.ceil(t.hp)+' HP · '+t.ammo+' rounds',t.x,t.y-50,'#ffb7c6',11);if(dist(t,g.p)<100)text('F: repair (1 bolt) · G: load ammo',t.x,t.y+48,'#c7eafa',12);}}
function drawArsenalWeapon(i,offset){const w=weapons[i],c=w.color;if(i===10){line(-15,0,50,0,'#a38bb5',8);poly([[35,-6],[55,-38],[83,-20],[62,-7],[82,25],[51,35]],'#9237a2',c);line(55,-35,79,-20,'#f9c9ff',4);return;}if(i===7){box(-18,-15,75,30,'#4b3038','#a98a82');ellipse(57,0,9,15,'#1a1a24');ellipse(57,0,5,9,c);box(-5,13,12,17,'#211d27');line(-10,-9,45,-9,c,4);return;}if(i===11){box(-17,-14,40,28,'#432934','#b47887');for(const y of [-7,7])box(20,y-3,36,6,'#b66b79');line(-12,12,-25,25,'#9a8291',5);line(12,12,30,25,'#9a8291',5);return;}weaponModel(w.model,offset);if(i===8){for(const y of [-10,0,10])box(30,y-2,35,4,'#b79686');box(3,15,24,22+offset,'#6b3641','#b98379');}if(i===6){box(12,-15,21,4,c);box(25,-5,20,3,c);}if(i===9){box(38,-2,40,4,c);box(2,-23,35,8,'#253244',c);}}
function weaponIcon(i){const w=weapons[i];if(i<6)return baseWeaponIcon(i);let svg=baseWeaponIcon(w.model).replaceAll(weapons[w.model].color,w.color);let extra=i===6?'<path d="M65 17h45m-35 5h25" stroke="#ff647a" stroke-width="4"/>':i===8?'<path d="M95 22h60m-60 9h60m-60 9h60" stroke="#d4ab89" stroke-width="5"/><path d="M65 40v24h25V40" fill="#753a4c" stroke="#c7899b"/>':i===9?'<path d="M90 28h70M60 12h40" stroke="#a0dfff" stroke-width="5"/>':'';if(i===7)svg='<svg class="weapon-icon" viewBox="0 0 170 70"><path d="M20 20h110v30H20z" fill="#59323d" stroke="#d9a192" stroke-width="3"/><ellipse cx="130" cy="35" rx="12" ry="18" fill="#17151e" stroke="#ff9f5a" stroke-width="4"/><path d="M45 50v15h15V50M30 25h80" stroke="#ff775f" stroke-width="5"/></svg>';if(i===10)svg='<svg class="weapon-icon" viewBox="0 0 170 70"><path d="M25 58L105 15" stroke="#ac8fba" stroke-width="8"/><path d="M85 18l28-15 30 17-25 8 22 25-39-7z" fill="#872fa5" stroke="#f3a1ff" stroke-width="3"/></svg>';if(i===11)svg='<svg class="weapon-icon" viewBox="0 0 170 70"><path d="M65 42L35 65m45-23v25m0-25 40 23" stroke="#bb879a" stroke-width="6"/><path d="M40 20h55v25H40z" fill="#693045" stroke="#e58c9d"/><path d="M90 23h60m-60 15h60" stroke="#ed5d7c" stroke-width="8"/></svg>';return svg.replace('</svg>',extra+'</svg>');}


// --- career.js ---
const CAREER_KEY='ark-career-v1';
let storageAvailable=true,shopReturn='menu',shopCategory='weapons',shopSelected=0,shopFilter='all';
function newCareer(){return{version:1,coins:0,unlocked:weapons.map((w,i)=>i===0),levels:weapons.map(()=>1),selected:0,ammoBank:weapons.map(()=>0),turretStock:0,medBank:0};}
function loadCareer(){const c=newCareer();try{const s=JSON.parse(localStorage.getItem(CAREER_KEY)||'null');if(s?.version===1){const n=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;c.coins=n(s.coins,999999999);c.unlocked=weapons.map((w,i)=>i===0||s.unlocked?.[i]===true);c.levels=weapons.map((w,i)=>Math.max(1,n(s.levels?.[i],5)));c.ammoBank=weapons.map((w,i)=>n(s.ammoBank?.[i],99999));c.medBank=n(s.medBank,99);c.turretStock=n(s.turretStock??(s.unlocked?.[11]?1:0),999);c.selected=n(s.selected,weapons.length-1);if(!c.unlocked[c.selected])c.selected=0;}}catch{storageAvailable=false;}return c;}
const career=loadCareer();
function saveCareer(){try{localStorage.setItem(CAREER_KEY,JSON.stringify(career));storageAvailable=true;}catch{storageAvailable=false;}}
function missionActive(){return !!g&&(['playing','paused'].includes(mode)||(mode==='inventory'&&shopReturn==='playing'));}
function bindCareer(){if(g.stage==='training'){g.unlocked=weapons.map((w,i)=>i===0);g.levels=weapons.map(()=>1);g.weapon=0;return;}Object.defineProperty(g,'coins',{get:()=>career.coins,set:v=>{career.coins=Math.max(0,Math.floor(v));saveCareer();}});g.unlocked=career.unlocked;g.levels=career.levels;g.weapon=career.selected;}
function spend(cost){if(career.coins<cost){toast('Not enough coins');return false;}career.coins-=cost;return true;}
function buyWeapon(i){if(weapons[i]?.turret){if(!spend(weapons[i].cost))return false;career.unlocked[i]=true;career.turretStock++;saveCareer();return true;}if(!weapons[i]||career.unlocked[i]||!spend(weapons[i].cost))return false;if(missionActive())toast(acquireWeapon(i));else{career.unlocked[i]=true;career.selected=i;}saveCareer();return true;}
function upgradeWeapon(i){if(!career.unlocked[i]||career.levels[i]>=5||!spend(40*career.levels[i]))return false;career.levels[i]++;saveCareer();return true;}
function selectWeapon(i){if(!career.unlocked[i])return;career.selected=i;if(missionActive())equipWeapon(i);saveCareer();}
function buyAmmo(i){if(!weapons[i]||weapons[i].melee||!career.unlocked[i]||!spend(weapons[i].ammoCost))return false;if(missionActive())g.reserve[i]+=weapons[i].pack;else career.ammoBank[i]+=weapons[i].pack;saveCareer();return true;}
function buyMedkit(){if(!spend(30))return false;if(missionActive())g.med++;else career.medBank++;saveCareer();return true;}
function shopInventory(){if(g?.stage==='training'&&mode!=='menu'){toast('Mari: Finish training, then open the shop from the main menu.');return;}if(mode==='inventory'){closeShop();return;}if(!['menu','playing','paused','ended'].includes(mode))return;if(['playing','paused'].includes(mode)&&vexaLocation()){if(!vexaOpen()){toast('Vexa opens after the round is cleared.');return;}if(!nearVexa()){toast('Visit Vexa’s SHOP on the map, then press E or I.');return;}}shopReturn=['playing','paused'].includes(mode)?'playing':'menu';shopSelected=career.selected;mode='inventory';mouse.down=false;keys.clear();renderShop();}
function closeShop(){if(shopReturn==='playing'&&g)resume();else menu();}
function renderShop(){
 const active=missionActive(),i=shopSelected,w=weapons[i],level=career.levels[i],owned=career.unlocked[i];
 const order=[1,3,2,6,7,8,9,0,4,10,5,11];
 const visible=order.filter(k=>shopCategory==='melee'?weapons[k].melee:shopCategory==='ammo'?!weapons[k].melee:shopFilter==='all'||weapons[k].group===shopFilter);
 const cards=visible.map(k=>{const v=weapons[k];return `<article class="armory-card ${i===k?'selected':''}"><button class="inspect" data-inspect="${k}"><strong>${v.name.toUpperCase()}</strong>${weaponIcon(k)}<small>${v.melee?'CLOSE COMBAT':v.turret?'DEPLOYABLE':v.group.toUpperCase()} · LV ${career.levels[k]}</small></button><div class="card-bottom"><span>◈ ${shopCategory==='ammo'?v.ammoCost:v.turret?v.cost:career.unlocked[k]?'OWNED':v.cost}</span>${shopCategory==='ammo'?`<button data-ammo="${k}" ${career.unlocked[k]?'':'disabled'}>+${v.pack} BUY</button>`:v.turret?`<button data-unlock="${k}">BUY 1</button><button data-equip="${k}" ${career.unlocked[k]?'':'disabled'}>EQUIP</button>`:career.unlocked[k]?`<button data-equip="${k}">${career.selected===k?'EQUIPPED':'EQUIP'}</button>`:`<button data-unlock="${k}">BUY</button>`}</div></article>`;}).join('');
 panel(`<div class="armory foundry"><div class="armory-banner"><div class="shop-sign">⚒ SHOP<small>RED NEXUS / ARMORY</small></div><div class="merchant-greeting"><b>${active&&vexaLocation()?'VEXA / WELCOME BACK':'WELCOME, ENGINEER'}</b><span>EQUIP · UPGRADE · SURVIVE</span></div><div class="shop-account"><span>◈ ${career.coins.toLocaleString()} <small>COINS</small></span><button data-action="shop-close">${active?'RESUME':'MAIN MENU'} / I</button></div></div><div class="armory-layout"><nav>${[['weapons','⚔ WEAPONS'],['ammo','▥ AMMO'],['melee','✧ MELEE'],['supplies','✚ SUPPLIES']].map(([c,label])=>`<button data-category="${c}" class="${shopCategory===c?'active':''}">${label}</button>`).join('')}<div class="nav-detail">12 WEAPONS<br>5 UPGRADE LEVELS<br><br>Q / T<br>CYCLE EQUIPMENT</div></nav><div class="catalog"><div class="section-title">${shopCategory.toUpperCase()}</div>${shopCategory==='weapons'?`<div class="weapon-filters">${['all','rifle','shotgun','pistol','heavy','melee','special'].map(c=>`<button data-filter="${c}" class="${shopFilter===c?'active':''}">${c.toUpperCase()}</button>`).join('')}</div>`:''}${shopCategory==='supplies'?`<div class="supply-card"><div class="med-icon">✚</div><h2>Emergency medkit</h2><p>Restores 45 health. Press H to heal.</p><p>${active?g.med:career.medBank} ${active?'in inventory':'packed for next mission'}</p><button data-action="med">BUY · 30 ◈</button>${active?'<button data-action="heal">USE</button>':''}</div>`:`<div class="weapon-grid">${cards}</div>`}</div><aside class="upgrade-panel"><div class="section-title">UPGRADE</div><h2>${w.name.toUpperCase()}</h2><div class="weapon-preview">${weaponIcon(i)}</div><div class="level">LV. ${level} <span>→ ${level<5?'LV. '+(level+1):'MAX'}</span></div><p>${w.description}</p>${[['DAMAGE',Math.round(w.damage*(1+(level-1)*.3)),Math.min(100,w.damage/2)],[w.melee?'REACH':w.turret?'CHARGES':'MAGAZINE',w.melee?w.range+' px':w.mag,w.melee?70:Math.min(100,w.mag*2)],[w.melee?'SWING':'RELOAD',(w.melee?w.rate:w.reload)+' s',60],['FIRE RATE',(1/w.rate).toFixed(1)+'/s',Math.min(100,8/w.rate)]].map(([label,value,width])=>`<div class="stat"><span>${label}</span><b>${value}</b><div><i style="width:${width}%"></i></div></div>`).join('')}<div class="upgrade-cost"><small>PERMANENT DAMAGE UPGRADE</small><strong>${level>=5?'MAX LEVEL':'◈ '+40*level}</strong></div>${owned?`<button class="primary" data-upgrade="${i}" ${level>=5?'disabled':''}>⬆ UPGRADE</button>`:`<button class="primary" data-unlock="${i}">UNLOCK · ${w.cost} ◈</button>`}${w.turret?`<p>Stock: ${career.turretStock} robots · Buy one per purchase. F repairs; G loads reserve ammo.</p>`:''}<div class="equipment-status">${owned?(career.selected===i?'● EQUIPPED':'● OWNED'):'○ LOCKED'} · ${w.melee?'NO AMMO REQUIRED':active?g.magazines[i]+' / '+g.reserve[i]+' AMMO':'FULL MAGAZINE ON MISSION START'}</div></aside></div><div class="armory-foot">${storageAvailable?'● Coins, unlocks and upgrades save automatically.':'Storage unavailable — progress lasts only while this page is open.'} ${active?'Q / T — Cycle all owned weapons · R — Reload':'Purchased ammunition is packed for your next mission.'}</div></div>`);
}


// --- simulation.js ---
function update(dt){if(g.stage==='training'){updateTraining(dt);return;}
 if(dt<=0)return;g.time+=dt;g.fire-=dt;g.p.inv-=dt;g.shake=Math.max(0,g.shake-dt*30);
 const difficulty=settings.difficulty==='easy'?.75:settings.difficulty==='hard'?1.3:1;
 let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
 const length=Math.hypot(dx,dy)||1,old={x:g.p.x,y:g.p.y};moveActor(g.p,dx/length*235*dt,dy/length*235*dt,20);g.p.vx=(g.p.x-old.x)/dt;g.p.vy=(g.p.y-old.y)/dt;g.p.moving=!!(dx||dy);
 camera.x=Math.max(0,Math.min(WORLD.w-W,g.p.x-W/2));camera.y=Math.max(0,Math.min(WORLD.h-H,g.p.y-H/2));if(mouse.sx!==undefined){mouse.x=mouse.sx+camera.x;mouse.y=mouse.sy+camera.y;}updateCombat(dt);
 updateVexa(dt);if(mode!=='playing')return;
 if(g.stage==='survival')updateSurvival(dt);
 if(g.stage!=='survival'&&g.stage!=='planet'&&!g.remaining&&!g.enemies.length){g.next-=dt;if(g.next<=0){if(g.wave<5){g.wave++;g.remaining=4+g.wave*2;g.spawn=0;toast('WAVE '+g.wave);}else if(!g.bossSpawned&&g.systems.every(s=>s.progress>=100)){g.wave=6;g.bossSpawned=true;spawn(true);toast('ARCHON HAS ARRIVED');}}}
 if(g.stage!=='survival'&&g.stage!=='planet'&&g.remaining>0){g.spawn-=dt;if(g.spawn<=0){spawn();g.remaining--;g.spawn=1.2;}}
 for(const e of g.enemies){if(e.hp<=0)continue;updateHostile(e,dt,difficulty);if(g.stage!=='planet'&&g.stage!=='survival')g.ship-=dt*(e.boss?.05:.02);}
 for(let i=0;i<g.enemies.length;i++)for(let j=i+1;j<g.enemies.length;j++){const a=g.enemies[i],b=g.enemies[j],d=dist(a,b),overlap=a.r+b.r-d;if(overlap>0&&d>0){const push=Math.min(overlap/2,45*dt),x=(a.x-b.x)/d*push,y=(a.y-b.y)/d*push;moveActor(a,x,y);moveActor(b,-x,-y);}}
 updateProjectiles(dt,difficulty);g.bullets=g.bullets.filter(b=>b.life>0);
 let won=false;g.enemies=g.enemies.filter(e=>{if(e.hp>0)return true;burst(e.x,e.y,'#ff795e',20);if(e.boss){g.coins+=250;if(g.stage!=='survival')won=true;}else{g.drops.push({x:e.x,y:e.y,type:'coin',value:8+g.wave*2},{x:e.x+20,y:e.y,type:'scrap',value:2});}g.next=4;return false;});
 collectDrops(dt);if(g.stage==='planet')updatePlanet(dt);for(const s of g.systems)if(keys.has('e')&&dist(g.p,s)<80&&s.progress<100&&g.scrap>=4){s.progress=Math.min(100,s.progress+22*dt);if(s.progress===100){g.scrap-=4;g.coins+=25;g.ship=Math.min(100,g.ship+22);toast(s.name+' repaired');}}
 for(const p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}g.particles=g.particles.filter(p=>p.life>0);
 hud.innerHTML=`<div class="hudbox">HEALTH ${Math.max(0,Math.ceil(g.p.hp))}<div class="bar"><i style="width:${Math.max(0,g.p.hp)}%"></i></div>${g.stage==='survival'?'SURVIVAL · ROUND '+g.wave+' · BEST '+progress.bestRound:g.stage==='planet'?'CHAPTER II · PLANET SURVIVAL':'HULL '+Math.ceil(g.ship)+'% · WAVE '+g.wave+'/6'}<br>◈ ${g.coins} · ${g.scrap} BOLTS · ${g.med} MEDKITS</div><div class="hudbox">${weapons[g.weapon].name}<br><span class="ammo-readout">${weapons[g.weapon].turret?'ROBOTS '+career.turretStock+' · AMMO '+g.reserve[g.weapon]:weapons[g.weapon].melee?'MELEE · ∞':g.magazines[g.weapon]+' / '+g.reserve[g.weapon]}</span><br>${g.reload?'RELOADING…':'R — Reload · I — Shop · M — Map'}</div>`;
 if(won)beginLanding();else if(g.p.hp<=0||g.ship<=0){if(g.stage==='survival')survivalDefeat();else end(false);}
}


// --- scene.js ---
'use strict';
// Hand-drawn articulated 2D models, inspired by the supplied character sheets.
function box(x,y,w,h,c,stroke){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);}}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,xx,yy,c,width=3){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
function poly(points,c,stroke){ctx.fillStyle=c;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function updateEngineerMotion(dt){const p=g.p;if(!p.motion)p.motion={x:p.x,y:p.y,phase:0,blend:0,lean:0};const m=p.motion,dx=p.x-m.x,dy=p.y-m.y,distance=Math.hypot(dx,dy),moving=distance>.01&&distance<235*dt+5;m.x=p.x;m.y=p.y;if(moving)m.phase+=distance*.055;const ease=1-Math.exp(-dt*14);m.blend+=((moving?Math.min(1,distance/(235*dt||1)):0)-m.blend)*ease;m.lean+=((moving?dx/(235*dt||1)*.075:0)-m.lean)*ease;p.moving=moving;}
function engineer(x,y,name,phase,angle){
 ctx.save();ctx.translate(x,y);const red=name==='engineer-red',accent=red?'#b84343':'#ed8b32',suit=red?'#a4333d':'#252d36',hair=red?'#39251f':'#c69b50',motion=g.p.motion||{phase:0,blend:0,lean:0},step=Math.sin(motion.phase)*6*motion.blend,bob=-Math.abs(Math.cos(motion.phase))*2*motion.blend;
 ellipse(0,35,23,8,'#0008');
 for(const side of [-1,1]){const stride=side*step;line(side*9,12,side*11+stride*.35,27+stride*.35,suit,13);line(side*11+stride*.35,27+stride*.35,side*11+stride*.5,39+stride,suit,11);box(side*11-7+stride*.5,35+stride,17,10,'#111923');}
 ctx.save();ctx.translate(0,bob);ctx.rotate(motion.lean);const aim=angle-motion.lean,back=Math.sin(angle)<-.3;
 if(back)drawHeldWeapon(aim,red,suit);
 box(-18,-18,36,37,'#121a21','#63717c');box(-21,-14,5,29,accent);box(16,-14,5,29,accent);
 poly([[-15,-22],[15,-22],[17,9],[-17,9]],red?'#dfe1df':'#30363b','#131d26');line(-11,-20,-7,8,accent,5);line(10,-20,8,8,accent,5);box(-19,8,38,8,'#151c23');box(-3,9,7,6,'#d9ab55');box(-20,17,8,11,accent);
 if(back){box(-12,-18,24,27,'#24313b',accent);ellipse(0,-6,6,6,'#98a1a5');}else if(red){ellipse(0,-6,7,7,'#5387b3');ellipse(-6,-8,4,5,'#5387b3');ellipse(6,-8,4,5,'#5387b3');}else box(-5,-7,10,10,'#ef9442');
 ctx.save();ctx.translate(Math.cos(angle)*2,0);ellipse(0,-30,16,20,hair);
 if(!back){ellipse(Math.cos(angle)*2,-30,11,15,'#e1b497');ellipse(-4+Math.cos(angle)*3,-31,1.4,1.7,'#1b2631');ellipse(4+Math.cos(angle)*3,-31,1.4,1.7,'#1b2631');line(-3,-23,3,-23,'#985c52',1.4);}
 poly([[-15,-43],[0,-49],[15,-39],[9,-36],[0,-41],[-12,-30]],hair);if(!red)ellipse(5,-49,11,8,hair);else{poly([[-14,-37],[-20,-5],[-13,0],[-10,-29]],hair);poly([[12,-36],[19,-6],[12,0],[9,-27]],hair);}ctx.restore();
 if(!back)drawHeldWeapon(aim,red,suit);ctx.restore();ctx.restore();
}
function robotModel(e){ctx.save();ctx.translate(e.x,e.y);if(e.ranged&&e.winding>0){ctx.save();ctx.rotate(Math.atan2(g.p.y-e.y,g.p.x-e.x));const t=traceWall(e.x,e.y,g.p.x,g.p.y,2),length=dist(e,g.p)*Math.min(1,t);ctx.globalAlpha=.45;line(25,0,length,0,'#ff8099',2);ctx.restore();}if(e.ranged){box(-34,-35,68,12,'#25364a','#70d6ff');ellipse(-23,-29,4,4,'#8de8ff');ellipse(23,-29,4,4,'#8de8ff');ctx.save();ctx.rotate(Math.atan2(g.p.y-e.y,g.p.x-e.x));box(12,-5,43,10,'#263447','#8ee5ff');box(46,-7,14,14,'#50778a');ctx.restore();}let step=Math.sin(g.time*7+e.x*.02)*6;ellipse(0,30,e.boss?65:27,10,'#0008');if(e.boss){ctx.scale(2.1,2.1);for(let side of [-1,1]){for(let i=0;i<3;i++){ctx.save();ctx.translate(side*(15+i*8),-36);ctx.rotate(side*(.3+i*.15));box(-5,-20,10,28,'#49242e','#ad5861');box(-3,-18,6,13,'#ff9847');ctx.restore();}line(side*17,-12,side*38,14,'#3d3242',19);poly([[side*28,-6],[side*44,8],[side*40,24],[side*24,9]],'#dd6b36','#6d3c44');}}for(const side of [-1,1]){line(side*12,7,side*14,28+side*step,'#3a4148',13);box(side*14-8,18+side*step,16,12,'#1b2631','#677584');box(side*14-11,33+side*step,24,10,'#29333c','#687280');poly([[side*14-9,43+side*step],[side*14-6,48+side*step],[side*14-3,43+side*step]],'#abb2b7');}poly([[-28,-29],[28,-29],[30,9],[-30,9]],e.boss?'#302c3e':'#3e454a','#79828c');box(-28,-13,56,5,'#202a33','#596670');for(const side of [-1,1]){poly([[side*15,-9],[side*23,-1],[side*15,7],[side*7,-1]],'#7f283b','#df5960');for(let i=0;i<3;i++)poly([[side*(10+i*7),-29],[side*(13+i*7),-43-i*3],[side*(16+i*7),-29]],'#657078','#242c36');}ellipse(0,-29,13,13,'#1b222a');ellipse(0,-29,9,9,'#a63248');line(-7,-29,7,-29,'#ff7582',1);line(0,-36,0,-22,'#ff7582',1);ellipse(-21,-23,4,4,'#ff5267');ellipse(21,-23,4,4,'#ff5267');ctx.restore();}
function consoleUnit(x,y,color){box(x-38,y-25,76,50,'#172b3a','#566978');box(x-30,y-18,60,28,'#071b2a',color);for(let i=0;i<4;i++)line(x-24,y-12+i*6,x+8+i*4,y-12+i*6,color,2);for(let i=0;i<5;i++)box(x-25+i*12,y+16,5,3,i%2?'#f6af58':color);}


// --- ship-art.js ---
function metalPanel(x,y,w,h,color='#794852'){poly([[x+9,y],[x+w-9,y],[x+w,y+9],[x+w,y+h-9],[x+w-9,y+h],[x+9,y+h],[x,y+h-9],[x,y+9]],'#29282f',color);for(const xx of [x+6,x+w-6])for(const yy of [y+6,y+h-6])ellipse(xx,yy,2,2,'#b19a8e');}
function lightStrip(x,y,w,h,c='#ff405b'){ctx.save();ctx.shadowColor=c;ctx.shadowBlur=10;box(x,y,w,h,c);ctx.restore();}
function redCore(x,y,size){ellipse(x,y,size*1.5,size*.85,'#141018');for(let n=0;n<8;n++){const a=n*Math.PI/4;line(x+Math.cos(a)*size,y+Math.sin(a)*size*.6,x+Math.cos(a)*size*1.6,y+Math.sin(a)*size,'#76616b',10);}ctx.save();ctx.shadowColor='#ff2851';ctx.shadowBlur=25;poly([[x,y-size],[x+size*.7,y],[x,y+size],[x-size*.7,y]],'#7d1534','#ff6482');poly([[x,y-size*.8],[x+size*.5,y],[x,y+size*.8],[x,y]],'#db2855','#ff8fa3');ctx.restore();}
function engineBank(x,y){metalPanel(x-70,y-55,140,110);for(let i=0;i<4;i++)for(let j=0;j<5;j++){box(x-55+i*30,y-40+j*18,20,12,'#693b2c');lightStrip(x-52+i*30,y-37+j*18,14,4,'#ff8a42');}}
function roomProps(r){const x=r.x+r.w/2,y=r.y+r.h/2;text(r.name,x,r.y+42,r.color,18);if(r.kind==='reactor')redCore(x,y-20,85);else if(r.kind==='engine'||r.kind==='drive'){engineBank(x-190,y+30);engineBank(x+190,y+30);if(r.kind==='drive')redCore(x,y,50);}else if(r.kind==='bridge'){for(let i=0;i<4;i++)consoleUnit(r.x+140+i*160,r.y+115,'#67b4cf');metalPanel(x-70,y+50,140,80);redCore(x,y+85,25);}else if(r.kind==='armory'&&g){return;}else if(r.kind==='armory'){for(let i=0;i<4;i++){const xx=r.x+115+i*155;metalPanel(xx-55,y-80,110,145);ctx.save();ctx.translate(xx-25,y-10);weaponModel(i);ctx.restore();lightStrip(xx-40,y+50,80,3,weapons[i].color);}}else if(r.kind==='medical'){for(let i=0;i<3;i++){const xx=r.x+140+i*205;metalPanel(xx-45,y-100,90,190,'#54838d');box(xx-32,y-80,64,40,'#73949f');line(xx-20,y+15,xx+20,y+15,'#65e1e7',7);line(xx,y-5,xx,y+35,'#65e1e7',7);}}else{for(let i=0;i<6;i++){const xx=r.x+85+i%3*210,yy=r.y+100+Math.floor(i/3)*210;metalPanel(xx,yy,100,75);line(xx+10,yy+10,xx+90,yy+65,'#9c784e',5);}}}
function drawShip(){
 for(const r of rooms)if(r.x<500||r.x>2000){const x=r.x<500?r.x-70:r.x+r.w+70;for(const y of [r.y+80,r.y+r.h-80]){metalPanel(x-55,y-35,110,70);lightStrip(x-40,y-20,80,6);lightStrip(x-40,y+15,80,6);}}
 for(const r of floorAreas){box(r.x-8,r.y-8,r.w+16,r.h+16,'#191019','#6f3549');box(r.x,r.y,r.w,r.h,'#2b2931');for(let x=r.x+8;x<r.x+r.w-12;x+=60)for(let y=r.y+8;y<r.y+r.h-12;y+=60){box(x,y,Math.min(52,r.x+r.w-x-4),Math.min(52,r.y+r.h-y-4),'#303037','#414047');box(x+4,y+4,2,2,'#807078');}}
 for(const r of rooms)roomProps(r);drawWalls();for(const d of doors)if(d.w>d.h){for(let x=d.x+10;x<d.x+d.w-15;x+=25)line(x,d.y+2,x+8,d.y+12,'#b38b57',3);}else for(let y=d.y+10;y<d.y+d.h-15;y+=25)line(d.x+2,y,d.x+12,y+8,'#b38b57',3);
}
function toggleMap(){if(mode==='map'){resume();return;}if(mode==='playing'){mode='map';hud.hidden=true;mouse.down=false;keys.clear();}}
function draw(){if(g?.stage==='survival'&&mode!=='menu'){drawSurvival();return;}if(g?.stage==='training'&&mode!=='menu'){drawTraining();return;}if(mode==='landing'||mode==='departing'){drawFlight();return;}if(g?.stage==='planet'&&mode!=='menu'){drawPlanet();return;}
 box(0,0,W,H,'#090610');for(let i=0;i<130;i++)ellipse((i*137.7)%W,(i*83.3)%H,i%9===0?1.5:.7,i%9===0?1.5:.7,i%3?'#837d9d':'#cd94c6');ellipse(75,70,65,65,'#392840');ellipse(92,59,58,59,'#17101f');
 const overview=!g||mode==='menu'||mode==='map',zoom=overview?.37:1;ctx.save();if(overview){ctx.translate((W-WORLD.w*zoom)/2,(H-WORLD.h*zoom)/2);ctx.scale(zoom,zoom);}else ctx.translate(-camera.x,-camera.y);drawShip();
 if(g){drawVexaShop();drawBossTelegraphs();for(const s of g.systems){const c=s.progress>=100?'#77e3b2':'#ff9a63';consoleUnit(s.x,s.y,c);text(s.name+' '+Math.floor(s.progress)+'%',s.x,s.y-40,c,14);if(dist(s,g.p)<80&&s.progress<100)text('HOLD E / 4 BOLTS',s.x,s.y+45,c,12);}drawTurrets();g.drops.forEach(drawDrop);for(const e of g.enemies){robotModel(e);box(e.x-e.r,e.y-e.r-35,e.r*2,4,'#412432');box(e.x-e.r,e.y-e.r-35,e.r*2*Math.max(0,e.hp)/e.max,4,'#ff607c');}engineer(g.p.x,g.p.y,character,g.p.moving?g.time*13:0,Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x));for(const b of g.bullets)ellipse(b.x,b.y,b.enemy?5:3,b.enemy?5:3,b.enemy?'#ff6b89':b.color||'#9defff');for(const p of g.particles)box(p.x,p.y,3,3,p.color);drawPickupFeedback();if(!overview){ctx.strokeStyle='#ffadc1';ctx.beginPath();ctx.arc(mouse.x,mouse.y,9,0,Math.PI*2);ctx.stroke();}}ctx.restore();
 if(g&&!overview){drawMiniMap();drawBossHealth();}if(mode==='map'){box(16,16,350,55,'#160d20','#93465b');text('ARK / TACTICAL DECK',191,40,'#ff9bb3',18);text('M or ESC — Return to mission',191,59,'#cfb5be',12);}
}
function drawMiniMap(){const x=22,y=H-135,w=210,h=120;box(x-6,y-22,w+12,h+28,'#110c19ed','#8e425a');text('DECK MAP / M',x+w/2,y-7,'#de9db4',11);for(const r of floorAreas)box(x+r.x/3000*w,y+r.y/1800*h,r.w/3000*w,r.h/1800*h,'#3b2a3d','#764057');for(const s of g.systems)ellipse(x+s.x/3000*w,y+s.y/1800*h,3,3,s.progress>=100?'#75e8b3':'#ff9f65');const shop=vexaLocation();if(shop){box(x+(shop.x+shop.w/2)/3000*w-3,y+(shop.y+180)/1800*h-3,6,6,vexaOpen()?'#71dfba':'#e05a75');}for(const e of g.enemies)ellipse(x+e.x/3000*w,y+e.y/1800*h,2,2,'#ff5377');ellipse(x+g.p.x/3000*w,y+g.p.y/1800*h,3,3,'white');}


// --- weapon-art.js ---
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

function armJoint(shoulder,hand,bend,sleeve,skin){const dx=hand.x-shoulder.x,dy=hand.y-shoulder.y,d=Math.hypot(dx,dy)||1,bow=Math.min(14,Math.sqrt(Math.max(0,31*31-d*d/4)))*bend,elbow={x:(shoulder.x+hand.x)/2-dy/d*bow,y:(shoulder.y+hand.y)/2+dx/d*bow};line(shoulder.x,shoulder.y,elbow.x,elbow.y,sleeve,10);line(elbow.x,elbow.y,hand.x,hand.y,skin,7);}
function drawHeldWeapon(angle,red,suit){
 const w=weapons[g.weapon],progress=g.reload?Math.min(1,g.reload.elapsed/g.reload.duration):0,reloadPose=g.reload?Math.sin(progress*Math.PI):0,equipPose=Math.max(0,Math.min(1,(g.equipTime||0)/.45)),pickupPose=!g.reload&&g.flash<=0?Math.sin((g.pickupTime||0)/.45*Math.PI):0,recoil=Math.max(0,Math.min(1,(g.flash||0)/.065)),flip=Math.cos(angle)<0?-1:1;
 const rotation=angle+flip*(reloadPose*.3+equipPose*.45)+(g.swing?(1-g.swing.time/g.swing.duration)*2.2-1.1:0),gunX=21-recoil*4,gunY=reloadPose*6+equipPose*8,reach=reloadPose*16+pickupPose*8;
 const grip=(x,y)=>({x:x*Math.cos(rotation)-y*flip*Math.sin(rotation),y:x*Math.sin(rotation)+y*flip*Math.cos(rotation)}),rear=grip(gunX-1,gunY+9),front=grip(gunX+(w.melee?12:g.weapon===0?3:22)-reloadPose*8,gunY+8+reach),sleeve=red?'#d8dddd':suit,skin=red?'#dbaf94':'#deb394';
 // Shoulder anchors stay on the torso; only the gun and hand targets rotate.
 armJoint({x:-14,y:-15},flip>0?front:rear,-1,sleeve,skin);armJoint({x:14,y:-15},flip>0?rear:front,1,sleeve,skin);
 ctx.save();ctx.rotate(rotation);ctx.scale(1,flip);ctx.save();ctx.translate(gunX,gunY);weaponModel(g.weapon,reach);ctx.restore();
 if(g.flash>0&&!g.reload&&!w.melee){const muzzle=w.muzzle-recoil*4;poly([[muzzle,-7],[muzzle+12,-3],[muzzle+22,0],[muzzle+9,5],[muzzle,8]],'#ffdf98');}
 if(g.swing){ctx.strokeStyle=w.color;ctx.lineWidth=5;ctx.globalAlpha=g.swing.time/g.swing.duration;ctx.beginPath();ctx.arc(0,0,w.range,-.7,.7);ctx.stroke();ctx.globalAlpha=1;}ctx.restore();
 ellipse(rear.x,rear.y,4,4,'#263a43');ellipse(front.x,front.y,4,4,'#263a43');
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


// --- planet.js ---
const shipGeometry={floors:floorAreas.slice(),walls:walls.slice()};
const materials=[{name:'Alloy',need:5,color:'#8dbfff'},{name:'Crystal',need:3,color:'#ff427c'},{name:'Gears',need:2,color:'#d4c4aa'},{name:'Chips',need:4,color:'#c482ff'}];
function restoreShipWorld(){WORLD.w=3000;WORLD.h=1800;NAV_COLS=75;NAV_ROWS=45;floorAreas.splice(0,floorAreas.length,...shipGeometry.floors);walls.splice(0,walls.length,...shipGeometry.walls);navGrids.clear();navFields.clear();}
function beginLanding(){unlockChapterTwo();g.stage='landing';g.flight=0;mode='landing';g.enemies=[];g.bullets=[];g.reload=null;g.swing=null;mouse.down=false;keys.clear();hud.hidden=true;overlay.innerHTML='';saveCareer();}
function updateFlight(dt){g.flight+=dt;if(g.flight>=7){if(mode==='landing')startPlanet();else{g.stage='home';end(true);}}}
function startPlanet(){
 floorAreas.splice(0,floorAreas.length,{x:60,y:60,w:2880,h:1680});walls.splice(0,walls.length,{x:40,y:40,w:2920,h:20},{x:40,y:1740,w:2920,h:20},{x:40,y:40,w:20,h:1720},{x:2940,y:40,w:20,h:1720});
 g.rocks=[{x:650,y:330,w:170,h:120},{x:1250,y:400,w:200,h:120},{x:2040,y:650,w:160,h:200},{x:900,y:1150,w:180,h:130},{x:1820,y:1350,w:220,h:130}];walls.push(...g.rocks);navGrids.clear();navFields.clear();
 g.turrets=[];g.stage='planet';g.p.x=1500;g.p.y=1030;g.p.hp=100;g.p.inv=2;g.ship=100;g.systems=[];g.enemies=[];g.bullets=[];g.drops=[];g.particles=[];g.pickupFx=[];g.remaining=0;camera.x=860;camera.y=670;g.materials=[0,0,0,0];g.planetRepair=0;g.planetSpawn=8;g.planetTime=0;
 g.nodes=[];const spots=[[350,370],[2450,360],[450,1350],[2500,1370]];spots.forEach(([x,y],kind)=>{for(let n=0;n<materials[kind].need+2;n++)g.nodes.push({x:x+(n%3)*110,y:y+Math.floor(n/3)*100,kind,progress:0});});
 // A free emergency blade prevents an empty-ammunition soft lock.
 if(!g.unlocked[4])acquireWeapon(4);g.reserve=g.reserve.map((v,i)=>v+(weapons[i].melee||weapons[i].turret?0:weapons[i].pack));g.med=Math.max(2,g.med);mode='playing';hud.hidden=false;resume();toast('CHAPTER II — Gather materials with E. Return to ARK to repair.');
}
function updatePlanet(dt){
 g.planetTime+=dt;g.planetSpawn-=dt;if(g.planetSpawn<=0&&g.enemies.length<8){const spots=[{x:160,y:180},{x:2820,y:180},{x:160,y:1620},{x:2820,y:1620}],p=spots.filter(p=>dist(p,g.p)>450)[Math.floor(Math.random()*3)]||spots[0];const hp=80+Math.min(80,g.planetTime*.3);g.enemies.push({...p,hp,max:hp,r:24,speed:65+Math.min(30,g.planetTime*.1),ranged:Math.random()<.4,cooldown:1.5,winding:0});g.planetSpawn=Math.max(4,10-g.planetTime/50);}
 const node=g.nodes.find(n=>!n.done&&dist(n,g.p)<85&&clearLine(n,g.p,2));
 if(keys.has('e')&&node){node.progress+=dt/1.2;if(node.progress>=1){node.done=true;g.materials[node.kind]++;burst(node.x,node.y,materials[node.kind].color,12);toast('+1 '+materials[node.kind].name);}}
 const near=dist(g.p,{x:1500,y:1000})<125;
 if(near&&keys.has('e')&&materials.every((m,i)=>g.materials[i]>=m.need)){g.planetRepair=Math.min(100,g.planetRepair+dt*20);if(g.planetRepair>=100){materials.forEach((m,i)=>g.materials[i]-=m.need);g.coins+=150;g.flight=0;mode='departing';hud.hidden=true;keys.clear();mouse.down=false;g.bullets=[];saveCareer();}}
}
function materialModel(kind,x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const c=materials[kind].color;ellipse(0,10,25,10,'#0006');if(kind===0){metalPanel(-25,-14,50,28,c);box(-17,-8,34,16,'#627086','#c7d7ef');line(-15,-4,12,-4,'#a2d3ff',3);}else if(kind===1){poly([[0,-30],[20,-5],[8,24],[-19,10]],'#b5194c',c);poly([[0,-30],[3,5],[-19,10]],'#ff517d','#ffabc3');line(3,5,8,24,'#ffa0c6',2);}else if(kind===2){for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);box(-5,-26,10,16,c,'#786d67');ctx.restore();}ellipse(0,0,19,19,c);ellipse(0,0,10,10,'#32384b');}else{for(let n=-2;n<=2;n++){line(n*8,-27,n*8,27,'#bba267',3);line(-27,n*8,27,n*8,'#bba267',3);}box(-21,-21,42,42,'#32213f',c);poly([[0,-14],[14,0],[0,14],[-14,0]],'#a637da','#f0c4ff');}ctx.restore();}
function shuttle(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ellipse(0,40,150,50,'#0006');poly([[0,-140],[60,-65],[140,70],[65,90],[0,65],[-65,90],[-140,70],[-60,-65]],'#373b4c','#c58d9d');poly([[0,-100],[35,-30],[25,45],[-25,45],[-35,-30]],'#1d273c','#ff657c');box(-18,-45,36,35,'#6bc8e3','#bde9ff');for(const xx of [-70,70]){box(xx-17,25,34,65,'#4f3542','#be788b');lightStrip(xx-12,75,24,9,'#ffa45f');}line(0,0,0,60,'#f45678',4);ctx.restore();}
function drawFlight(){const t=Math.min(1,g.flight/7),landing=mode==='landing';box(0,0,W,H,'#090e20');for(let i=0;i<100;i++)ellipse(i*137%W,i*73%H,1,1,'#b6c1df');ellipse(W*.5,H+180,700,480,landing?'#644d64':'#234d69');ellipse(W*.5,H+180,680,460,landing?'#3b354a':'#336f79');const p=landing?t:1-t;shuttle(W/2+Math.sin(t*3)*40,100+p*370,.35+p*.55);if(t>.65&&landing){ctx.globalAlpha=(t-.65)*1.5;for(let i=0;i<5;i++)ellipse(W/2+(i-2)*55,550,70+t*25,12,'#b3909b');ctx.globalAlpha=1;}box(0,0,W,72,'#050812cc');box(0,H-90,W,90,'#050812cc');text(landing?'CHAPTER II / EMERGENCY LANDING':'JOURNEY HOME',W/2,43,'#ffc4d0',24);text(landing?'Archon is defeated. ARK must land for repairs.':'Repairs complete. ARK is returning home.',W/2,H-48,'#e2d4e1',20);}
function drawPlanet(){
 const overview=mode==='map',zoom=overview?.37:1;box(0,0,W,H,'#181725');ctx.save();if(overview){ctx.translate((W-3000*zoom)/2,(H-1800*zoom)/2);ctx.scale(zoom,zoom);}else ctx.translate(-camera.x,-camera.y);box(60,60,2880,1680,'#443645','#8c667c');for(let i=0;i<260;i++){const x=90+(i*157)%2790,y=90+(i*271)%1590;ellipse(x,y,7+i%13,3+i%5,i%3?'#584451':'#322f40');}for(const r of g.rocks){poly([[r.x,r.y+30],[r.x+r.w*.4,r.y],[r.x+r.w,r.y+20],[r.x+r.w-15,r.y+r.h],[r.x+20,r.y+r.h]],'#252938','#8c6d85');line(r.x+30,r.y+45,r.x+r.w-30,r.y+35,'#5f6277',5);}shuttle(1500,800,1.2);consoleUnit(1500,1000,'#80def1');text('ARK / REPAIR '+Math.floor(g.planetRepair)+'%',1500,1080,'#b7e4fa',18);
 for(const n of g.nodes)if(!n.done){materialModel(n.kind,n.x,n.y);if(dist(n,g.p)<100){text('HOLD E — '+materials[n.kind].name,n.x,n.y-45,'#fff',13);box(n.x-25,n.y+38,50*n.progress,4,materials[n.kind].color);}}
 drawTurrets();g.drops.forEach(drawDrop);for(const e of g.enemies)robotModel(e);engineer(g.p.x,g.p.y,character,g.p.moving?g.time*13:0,Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x));for(const b of g.bullets)ellipse(b.x,b.y,4,4,b.enemy?'#ff647d':b.color||'#8ff0ff');for(const p of g.particles)box(p.x,p.y,3,3,p.color);drawPickupFeedback();ctx.restore();
 box(245,H-92,790,80,'#110e20ed','#755970');materials.forEach((m,i)=>{const x=285+i*190;materialModel(i,x,H-53,.65);text(m.name+' '+g.materials[i]+' / '+m.need,x+80,H-48,g.materials[i]>=m.need?'#8ee8af':m.color,14);});text(overview?'M / ESC — Return | ARK is at the center':'Hold E to gather · Bring materials to ARK and hold E to repair',W/2,H-104,'#ffe0e7',14);
}



// --- training.js ---
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



// --- modes.js ---
const forestBackdrop=new Image();forestBackdrop.src='assets/survival-forest.png';
const PROGRESS_KEY='ark-chapters-v1';
function readProgress(){try{const p=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null');return{chapter2:p?.chapter2===true,bestRound:Number.isFinite(p?.bestRound)?Math.max(0,Math.floor(p.bestRound)):0};}catch{return{chapter2:false,bestRound:0};}}
const progress=readProgress();
function saveProgress(){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));return true;}catch{toast('Storage unavailable — keep this page open to retain chapter access.');return false;}}
function unlockChapterTwo(){progress.chapter2=true;if(saveProgress())toast('CHAPTER II SAVED — launch it directly from the main menu.');}
function launchChapterTwo(){if(!progress.chapter2){toast('Defeat Archon in Chapter I to unlock this chapter.');return false;}start();startPlanet();return true;}
function survivalGates(){return [{x:400,y:400},{x:4100,y:400},{x:400,y:2300},{x:4100,y:2300}];}
function spawnRoundBoss(){const e=spawn(true),p=survivalGates().sort((a,b)=>dist(b,g.p)-dist(a,g.p))[0];e.x=p.x;e.y=p.y;e.max=e.hp=2200*Math.pow(1.4,g.wave/5-1);e.damage=35+g.wave*2;e.bossStrength=1+g.wave*.035;e.speed=100+Math.min(45,g.wave*2);return e;}
function startSurvival(){
 start();g.stage='survival';g.wave=0;g.remaining=0;g.next=4;g.roundCleared=0;g.systems=[];g.enemies=[];g.drops=[];g.particles=[];g.ship=100;g.p.x=1500;g.p.y=900;g.p.inv=2;
 floorAreas.splice(0,floorAreas.length,{x:160,y:160,w:2680,h:1480});walls.splice(0,walls.length,{x:140,y:140,w:2720,h:20},{x:140,y:1640,w:2720,h:20},{x:140,y:140,w:20,h:1520},{x:2840,y:140,w:20,h:1520});
 g.cover=[{x:700,y:450,w:180,h:260},{x:2100,y:450,w:180,h:260},{x:700,y:1100,w:180,h:220},{x:2100,y:1100,w:180,h:220},{x:1280,y:400,w:440,h:80},{x:1280,y:1320,w:440,h:80}];g.cover.push({x:1150,y:760,w:300,h:70},{x:1650,y:980,w:300,h:70},{x:420,y:820,w:250,h:80},{x:2370,y:820,w:250,h:80},{x:1050,y:220,w:80,h:200},{x:1850,y:1380,w:80,h:180},{x:1200,y:1100,w:80,h:160},{x:1820,y:530,w:80,h:160});
 WORLD.w=4500;WORLD.h=2700;NAV_COLS=113;NAV_ROWS=68;for(const r of [...floorAreas,...walls,...g.cover]){r.x*=1.5;r.y*=1.5;r.w*=1.5;r.h*=1.5;}g.p.x=2250;g.p.y=1350;walls.push(...g.cover);navGrids.clear();navFields.clear();camera.x=860;camera.y=540;setupVexa();toast('THE CRUCIBLE — survive endless rounds. Shop with I between battles.');
}
function spawnSurvivor(){const spots=survivalGates(),p=spots.sort((a,b)=>dist(b,g.p)-dist(a,g.p))[Math.floor(Math.random()*2)],r=g.wave,hp=Math.round(55*Math.pow(1.18,r-1)),ranged=r>=2&&Math.random()<Math.min(.65,.2+r*.025);g.enemies.push({...p,hp,max:hp,r:24,speed:Math.min(150,65+r*4),ranged,cooldown:1.2,winding:0,damage:10+r*2,shotDamage:12+r*2,shotSpeed:Math.min(550,300+r*8),shotDelay:Math.max(.65,1.8-r*.035)});}
function updateSurvival(dt){
 if(!g.remaining&&!g.enemies.length){if(g.wave>g.roundCleared){g.roundCleared=g.wave;progress.bestRound=Math.max(progress.bestRound,g.roundCleared);saveProgress();g.coins+=20+g.wave*5;g.p.hp=Math.min(100,g.p.hp+15);g.reserve=g.reserve.map((v,i)=>v+(g.unlocked[i]&&!weapons[i].melee&&!weapons[i].turret?weapons[i].pack:0));g.next=(g.wave+1)%5===0?60:35;toast('ROUND '+g.wave+' CLEAR · +15 health · ammo resupplied');}g.next-=dt;if(g.next<=0){g.wave++;g.remaining=Math.min(40,4+g.wave*2);g.spawn=0;if(g.wave%5===0){spawnRoundBoss();g.remaining+=4;}toast('ROUND '+g.wave+' — stronger robots incoming');}}
 if(g.remaining>0){g.spawn-=dt;if(g.spawn<=0&&g.enemies.length<18){spawnSurvivor();g.remaining--;g.spawn=Math.max(.35,1.2-g.wave*.04);}}
}
function survivalDefeat(){progress.bestRound=Math.max(progress.bestRound,g.roundCleared);saveProgress();saveCareer();mode='ended';menuCanResume=false;mouse.down=false;panel(`<div class="eyebrow">THE CRUCIBLE / RUN OVER</div><h1>Round ${g.wave}</h1><p>Rounds cleared: ${g.roundCleared} · Best: ${progress.bestRound}<br>Your ${career.coins} coins and weapon upgrades are saved.</p><div class="row"><button class="primary" data-action="survival">Try Again</button><button data-action="shop">Armory</button><button data-action="menu">Main Menu</button></div>`);}
function drawSurvival(){const overview=mode==='map',z=overview?.25:1;box(0,0,W,H,'#080e18');ctx.save();if(overview){ctx.translate((W-WORLD.w*z)/2,(H-WORLD.h*z)/2);ctx.scale(z,z);}else ctx.translate(-camera.x,-camera.y);if(forestBackdrop.complete&&forestBackdrop.naturalWidth){ctx.drawImage(forestBackdrop,0,0,WORLD.w,WORLD.h);}else{box(240,240,4020,2220,'#344831');for(const r of g.cover)box(r.x,r.y,r.w,r.h,'#656255','#aea58a');for(const w of walls)box(w.x,w.y,w.w,w.h,'#626359');}text('THE CRUCIBLE / FOREST OUTPOST',2250,330,'#ece5bd',28);for(const p of survivalGates()){ellipse(p.x,p.y,65,35,'#592238');text('HOSTILE GATE',p.x,p.y+60,'#ef7d93',13);}drawVexaShop();drawBossTelegraphs();drawTurrets();g.drops.forEach(drawDrop);for(const e of g.enemies){robotModel(e);box(e.x-24,e.y-65,48*Math.max(0,e.hp)/e.max,4,'#ff7189');}engineer(g.p.x,g.p.y,character,g.p.moving?g.time*13:0,Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x));for(const b of g.bullets)ellipse(b.x,b.y,b.enemy?5:3,b.enemy?5:3,b.enemy?'#ff6789':b.color||'#a3efff');for(const p of g.particles)box(p.x,p.y,3,3,p.color);drawPickupFeedback();ctx.restore();drawBossHealth();box(390,H-60,500,40,'#0d1628e8','#85606b');text(!g.enemies.length&&!g.remaining?((g.wave+1)%5===0?'BOSS ROUND IN ':'NEXT ROUND IN ')+Math.max(0,Math.ceil(g.next))+'s · I — SHOP':'ROUND '+g.wave+' · '+(g.enemies.length+g.remaining)+' HOSTILES REMAINING',640,H-34,'#ffd3aa',16);}


// --- mobile.js ---
const mobileUI=document.createElement('div');mobileUI.id='mobile-controls';mobileUI.innerHTML=`<div class="mobile-vitals"></div><button class="touch-pause" data-mobile="p" aria-label="Pause">Ⅱ</button><div class="touch-pad" id="move-pad" aria-label="Move"><b class="directions">✥</b><i></i></div><div class="touch-actions"><button data-mobile="r" aria-label="Reload">⟳</button><button data-mobile="t" aria-label="Switch weapon"><svg viewBox="0 0 80 40"><path d="M8 12H60V8H73V20H44L35 34H25L28 20H8Z" fill="#cfb79a" stroke="#191719" stroke-width="4"/><path d="M15 11H58" stroke="#e25a59" stroke-width="5"/></svg></button><button data-mobile="h" aria-label="Heal">✚</button><button data-mobile="e" aria-label="Use or repair">⚒</button><button data-mobile="f" aria-label="Repair robot">⚙</button><button data-mobile="g" aria-label="Refill robot">▥</button></div><div class="touch-pad" id="aim-pad" aria-label="Aim and fire"><span class="aim-label">AIM / FIRE</span><b class="crosshair">⌖</b><i></i></div>`;document.querySelector('.stage').append(mobileUI);
const touchState={aim:null,fire:false};
function resetTouch(){touchState.fire=false;touchState.aim=null;mouse.down=false;for(const k of ['w','a','s','d','e','f','g'])keys.delete(k);mobileUI.querySelectorAll('i').forEach(i=>i.style.transform='');}
function updateMobile(){const active=mode==='playing';document.querySelector('#aim-pad').classList.toggle('auto-fire',!!settings.autoAim);document.querySelector('#aim-pad').setAttribute('aria-label',settings.autoAim?'Fire':'Aim and fire joystick');mobileUI.hidden=!active;document.body.classList.toggle('touch-playing',active);if(!active){resetTouch();return;}const w=weapons[g.weapon];mobileUI.querySelector('.mobile-vitals').innerHTML='<span>♥ '+Math.max(0,Math.ceil(g.p.hp))+'</span><span>'+ (g.reload?'⟳':w.melee?'∞':w.turret?career.turretStock:g.magazines[g.weapon]+' / '+g.reserve[g.weapon])+'</span>';mobileUI.querySelector('[data-mobile="h"]').hidden=g.p.hp>=100||g.med<1;const robot=(g.turrets||[]).some(t=>Math.hypot(t.x-g.p.x,t.y-g.p.y)<110);for(const key of ['f','g'])mobileUI.querySelector('[data-mobile="'+key+'"]').hidden=!robot;mobileUI.querySelector('[data-mobile="e"]').hidden=!((typeof nearVexa==='function'&&nearVexa()&&vexaOpen())||g.stage==='planet'||g.stage==='training'||(g.systems||[]).some(t=>Math.hypot(t.x-g.p.x,t.y-g.p.y)<110));}

function mobileAim(){if(!g)return;if(settings.autoAim&&touchState.fire){const candidates=g.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-g.p.x,e.y-g.p.y)<900&&e.x>=camera.x&&e.x<=camera.x+W&&e.y>=camera.y&&e.y<=camera.y+H&&clearLine(g.p,e,3));candidates.sort((a,b)=>Math.hypot(a.x-g.p.x,a.y-g.p.y)-Math.hypot(b.x-g.p.x,b.y-g.p.y));mouse.sx=undefined;if(candidates.length){mouse.x=candidates[0].x;mouse.y=candidates[0].y;}mouse.down=true;return;}if(!touchState.aim)return;mouse.sx=undefined;mouse.x=g.p.x+touchState.aim.x*600;mouse.y=g.p.y+touchState.aim.y*600;mouse.down=true;}
for(const kind of ['move','aim']){const pad=document.querySelector('#'+kind+'-pad');let pointer=null;function apply(e){if(kind==='aim'&&settings.autoAim){touchState.fire=true;touchState.aim=null;mouse.down=true;return;}const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,40/(len||1));pad.querySelector('i').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;if(kind==='move'){for(const k of ['w','a','s','d'])keys.delete(k);if(dx>12)keys.add('d');if(dx< -12)keys.add('a');if(dy>12)keys.add('s');if(dy< -12)keys.add('w');}else{touchState.aim=len>12?{x:dx/len,y:dy/len}:null;mouse.down=!!touchState.aim;}}
pad.addEventListener('pointerdown',e=>{if(mode!=='playing'||pointer!==null)return;e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(pointer);apply(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)apply(e);});function release(e){if(e.pointerId!==pointer)return;pointer=null;pad.querySelector('i').style.transform='';if(kind==='move')for(const k of ['w','a','s','d'])keys.delete(k);else{touchState.fire=false;touchState.aim=null;mouse.down=false;}}for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,release);}
mobileUI.querySelectorAll('button').forEach(button=>{const k=button.dataset.mobile;button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);if(k==='p')pause();else if(k==='r')reloadWeapon();else if(k==='t')cycleWeapon(1);else if(k==='h')heal();else keys.add(k);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(k));});
window.addEventListener('blur',resetTouch);document.addEventListener('visibilitychange',()=>{if(document.hidden){resetTouch();if(mode==='playing')pause();}});


// --- vexa.js ---
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

bootGame();
})();
