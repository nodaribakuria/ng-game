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
function start(training=false){restoreShipWorld();g={p:{x:1500,y:1160,hp:100,inv:0},ship:65,coins:0,scrap:8,med:2,unlocked:[true,false,false,false],levels:[1,1,1,1],weapon:0,enemies:[],bullets:[],drops:[{x:430,y:1370,type:'scrap',value:4},{x:2490,y:1380,type:'med',value:1},{x:2490,y:610,type:'weapon',value:1}],particles:[],wave:0,spawn:0,remaining:0,next:2,fire:0,time:0,bossSpawned:false,shake:0,systems:[{x:510,y:510,name:'Engine',progress:0},{x:1500,y:1010,name:'Reactor',progress:0},{x:1500,y:280,name:'Navigation',progress:0}]};if(training)g.stage='training';initCombat();setupVexa();mode='playing';overlay.innerHTML='';hud.hidden=false;mouse.down=false;focusGame();ensureGameLoop();toast('Space — Dash · R — Reload · I — Shop');}
function pause(){if(mode==='landing'||mode==='departing')return;if(mode==='map'){resume();return;}if(mode==='inventory'){closeShop();return;}if(mode==='settings'&&settingsReturn==='menu'){menu();return;}if(!g||mode==='menu')return;if(mode==='playing'){mode='paused';mouse.down=false;panel('<div class="eyebrow">MISSION PAUSED</div><h1>Pause</h1><div class="row"><button class="primary" data-action="resume">Resume</button><button data-action="restart">Restart</button><button data-action="settings">Settings</button><button data-action="menu">Main Menu</button></div>');}else if(['paused','inventory','settings'].includes(mode))resume();}
function resume(){mode='playing';hud.hidden=false;overlay.innerHTML='';keys.clear();mouse.down=false;focusGame();ensureGameLoop();}
let settingsReturn='menu';function showSettings(){settingsReturn=mode;mode='settings';panel(`<h2>Settings</h2><label>Volume <input id="volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label><label>Difficulty <select id="difficulty"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label><label><input id="shake" type="checkbox" ${settings.shake?'checked':''}> Screen Shake</label><label><input id="auto-aim" type="checkbox" ${settings.autoAim?'checked':''}> Auto aim / Fire button</label><p>Auto aim selects the nearest visible enemy. Hold Fire to shoot.</p><button class="primary" data-action="save">Save and Return</button>`);document.querySelector('#difficulty').value=settings.difficulty;}
function inventory(){shopInventory();}
function refreshInventory(){renderShop();}
function heal(){if(g.med>0&&g.p.hp<100){g.med--;g.p.hp=Math.min(100,g.p.hp+45);sound(500);toast('Health restored.');}else toast('No medkits available, or health is already full.');}
overlay.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.char){character=b.dataset.char;menu();}if(b.dataset.inspect!==undefined){shopSelected=+b.dataset.inspect;renderShop();return;}if(b.dataset.filter){shopFilter=b.dataset.filter;renderShop();return;}if(b.dataset.category){shopCategory=b.dataset.category;if(shopCategory==='melee')shopSelected=4;else if(shopCategory!=='supplies'&&weapons[shopSelected].melee)shopSelected=0;renderShop();return;}let i;if(b.dataset.unlock!==undefined){i=+b.dataset.unlock;buyWeapon(i);refreshInventory();}if(b.dataset.equip!==undefined){selectWeapon(+b.dataset.equip);refreshInventory();}if(b.dataset.upgrade!==undefined){i=+b.dataset.upgrade;upgradeWeapon(i);refreshInventory();}if(b.dataset.ammo!==undefined){buyAmmo(+b.dataset.ammo);refreshInventory();}switch(b.dataset.action){case'chapter2':launchChapterTwo();break;case'survival':startSurvival();break;case'crew':chooseCrew();break;case'continue':if(menuCanResume&&g)resume();break;case'exit':panel('<div class="eyebrow">SEE YOU SOON, COMMANDER</div><h1>Exit game</h1><p>You can now close this browser tab. Coins and weapon upgrades are saved. Current mission progress is kept only while this page stays open.</p><button data-action="menu">Back to menu</button>');break;case'training':startTraining();break;case'start':start();break;case'restart':if(g?.stage==='training')startTraining();else if(g?.stage==='survival')startSurvival();else if(g?.stage==='planet')launchChapterTwo();else start();break;case'shop':shopInventory();break;case'shop-close':closeShop();break;case'resume':resume();break;case'menu':menu();break;case'settings':showSettings();break;case'save':settings.volume=+document.querySelector('#volume').value;settings.difficulty=document.querySelector('#difficulty').value;settings.shake=document.querySelector('#shake').checked;settings.autoAim=document.querySelector('#auto-aim').checked;try{localStorage.setItem('ark-settings',JSON.stringify(settings));}catch{}if(settingsReturn==='menu')menu();else{mode='playing';pause();}break;case'heal':heal();refreshInventory();break;case'med':buyMedkit();refreshInventory();}});
document.querySelector('#pause').onclick=pause;document.querySelector('#map').onclick=()=>toggleMap();
function inputKey(e){return e.code?.startsWith('Key')?e.code.slice(3).toLowerCase():e.code?.startsWith('Digit')?e.code.slice(5):e.key.toLowerCase();}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const k=inputKey(e);if(!e.repeat){if(k==='escape')pause();if(k==='i')inventory();if(k==='m')toggleMap();if(mode==='playing'&&e.code==='Space')dash();if(mode==='playing'&&k==='q')cycleWeapon(-1);if(mode==='playing'&&k==='t')cycleWeapon(1);if(mode==='playing'&&k==='h')heal();if(mode==='playing'&&k==='r')reloadWeapon();if(mode==='playing'&&['1','2','3','4','5','6'].includes(k))equipWeapon(+k-1);}keys.add(k);});window.addEventListener('keyup',e=>keys.delete(inputKey(e)));window.addEventListener('blur',()=>{keys.clear();mouse.down=false;if(mode==='playing')pause();});
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
      if(b.enemy){victim.hp-=(b.damage||12)*difficulty;victim.inv=.45;g.shake=6;}else hitEnemy(victim,b.damage);
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
    const options=rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2})).filter(p=>walkable(p.x,p.y,radius));
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
  if(e.hp>0&&dist(e,g.p)<=w.range+e.r&&Math.abs(delta)<=w.arc/2&&clearLine(g.p,e,2)){hitEnemy(e,w.damage*(1+(g.levels[g.weapon]-1)*.3));burst(e.x,e.y,w.color,8);if(g.weapon===5&&!e.boss){e.cooldown=Math.max(e.cooldown||0,.8);moveActor(e,Math.cos(angle)*30,Math.sin(angle)*30,e.r);}}
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
function explodeRocket(b){burst(b.x,b.y,'#ff9955',30);g.shake=9;for(const e of g.enemies)if(e.hp>0&&dist(e,b)<b.blast&&clearLine(b,e,0))hitEnemy(e,b.damage*.55*(1-dist(e,b)/b.blast));}
function deployTurret(w){g.turrets??=[];if(!career.turretStock){toast('Buy one support robot from the shop first.');g.fire=.5;return false;}if(g.turrets.length>=4){toast('Maximum four active robots.');g.fire=.5;return false;}const a=Math.atan2(mouse.y-g.p.y,mouse.x-g.p.x),x=g.p.x+Math.cos(a)*85,y=g.p.y+Math.sin(a)*85;if(!walkable(x,y,24)||!clearLine(g.p,{x,y},20)||g.turrets.some(t=>dist(t,{x,y})<50)){toast('Find a clear position to deploy.');g.fire=.5;return false;}career.turretStock--;saveCareer();g.turrets.push({x,y,r:22,hp:240,max:240,ammo:60,capacity:120,fire:0,inv:0,service:0,angle:a,damage:w.damage*(1+(g.levels[11]-1)*.3)});return true;}
function updateHostile(e,dt,difficulty){const player=g.p;const targets=[player,...(g.turrets||[]).filter(t=>t.hp>0)];const target=targets.sort((a,b)=>dist(e,a)-dist(e,b))[0];try{g.p=target;if(e.hound)updateForestHound(e,dt,difficulty);else if(e.boss)updateBoss(e,dt,difficulty*(e.bossStrength||1));else if(e.ranged)updateRanged(e,dt,difficulty);else moveEnemy(e,dt,difficulty);if(dist(e,target)<e.r+(target.r||20))hitPlayer((e.damage||(e.boss?24:10))*difficulty);}finally{g.p=player;}}
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
function shopInventory(){if(g?.stage==='planet'){toast('No shop on this planet. Search crates and fallen explorers for supplies.');return;}if(g?.stage==='training'&&mode!=='menu'){toast('Mari: Finish training, then open the shop from the main menu.');return;}if(mode==='inventory'){closeShop();return;}if(!['menu','playing','paused','ended'].includes(mode))return;if(['playing','paused'].includes(mode)&&vexaLocation()){if(!vexaOpen()){toast('Vexa opens after the round is cleared.');return;}if(!nearVexa()){toast('Visit Vexa’s SHOP on the map, then press E or I.');return;}}shopReturn=['playing','paused'].includes(mode)?'playing':'menu';shopSelected=career.selected;mode='inventory';mouse.down=false;keys.clear();renderShop();}
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
function robotModel(e){ctx.save();if(e.hitUntil>g.time){ctx.filter="brightness(2)";}ctx.translate(e.x,e.y);if(e.ranged&&e.winding>0){ctx.save();ctx.rotate(Math.atan2(g.p.y-e.y,g.p.x-e.x));const t=traceWall(e.x,e.y,g.p.x,g.p.y,2),length=dist(e,g.p)*Math.min(1,t);ctx.globalAlpha=.45;line(25,0,length,0,'#ff8099',2);ctx.restore();}if(e.ranged){box(-34,-35,68,12,'#25364a','#70d6ff');ellipse(-23,-29,4,4,'#8de8ff');ellipse(23,-29,4,4,'#8de8ff');ctx.save();ctx.rotate(Math.atan2(g.p.y-e.y,g.p.x-e.x));box(12,-5,43,10,'#263447','#8ee5ff');box(46,-7,14,14,'#50778a');ctx.restore();}let step=Math.sin(g.time*7+e.x*.02)*6;ellipse(0,30,e.boss?65:27,10,'#0008');if(e.boss){ctx.scale(2.1,2.1);for(let side of [-1,1]){for(let i=0;i<3;i++){ctx.save();ctx.translate(side*(15+i*8),-36);ctx.rotate(side*(.3+i*.15));box(-5,-20,10,28,'#49242e','#ad5861');box(-3,-18,6,13,'#ff9847');ctx.restore();}line(side*17,-12,side*38,14,'#3d3242',19);poly([[side*28,-6],[side*44,8],[side*40,24],[side*24,9]],'#dd6b36','#6d3c44');}}for(const side of [-1,1]){line(side*12,7,side*14,28+side*step,'#3a4148',13);box(side*14-8,18+side*step,16,12,'#1b2631','#677584');box(side*14-11,33+side*step,24,10,'#29333c','#687280');poly([[side*14-9,43+side*step],[side*14-6,48+side*step],[side*14-3,43+side*step]],'#abb2b7');}poly([[-28,-29],[28,-29],[30,9],[-30,9]],e.boss?'#302c3e':'#3e454a','#79828c');box(-28,-13,56,5,'#202a33','#596670');for(const side of [-1,1]){poly([[side*15,-9],[side*23,-1],[side*15,7],[side*7,-1]],'#7f283b','#df5960');for(let i=0;i<3;i++)poly([[side*(10+i*7),-29],[side*(13+i*7),-43-i*3],[side*(16+i*7),-29]],'#657078','#242c36');}ellipse(0,-29,13,13,'#1b222a');ellipse(0,-29,9,9,'#a63248');line(-7,-29,7,-29,'#ff7582',1);line(0,-36,0,-22,'#ff7582',1);ellipse(-21,-23,4,4,'#ff5267');ellipse(21,-23,4,4,'#ff5267');ctx.restore();}
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
function materialModel(kind,x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const c=materials[kind].color;ellipse(0,10,25,10,'#0006');if(kind===0){metalPanel(-25,-14,50,28,c);box(-17,-8,34,16,'#627086','#c7d7ef');line(-15,-4,12,-4,'#a2d3ff',3);}else if(kind===1){poly([[0,-30],[20,-5],[8,24],[-19,10]],'#b5194c',c);poly([[0,-30],[3,5],[-19,10]],'#ff517d','#ffabc3');line(3,5,8,24,'#ffa0c6',2);}else if(kind===2){for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);box(-5,-26,10,16,c,'#786d67');ctx.restore();}ellipse(0,0,19,19,c);ellipse(0,0,10,10,'#32384b');}else{for(let n=-2;n<=2;n++){line(n*8,-27,n*8,27,'#bba267',3);line(-27,n*8,27,n*8,'#bba267',3);}box(-21,-21,42,42,'#32213f',c);poly([[0,-14],[14,0],[0,14],[-14,0]],'#a637da','#f0c4ff');}ctx.restore();}
function shuttle(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ellipse(0,40,150,50,'#0006');poly([[0,-140],[60,-65],[140,70],[65,90],[0,65],[-65,90],[-140,70],[-60,-65]],'#373b4c','#c58d9d');poly([[0,-100],[35,-30],[25,45],[-25,45],[-35,-30]],'#1d273c','#ff657c');box(-18,-45,36,35,'#6bc8e3','#bde9ff');for(const xx of [-70,70]){box(xx-17,25,34,65,'#4f3542','#be788b');lightStrip(xx-12,75,24,9,'#ffa45f');}line(0,0,0,60,'#f45678',4);ctx.restore();}
function drawFlight(){const t=Math.min(1,g.flight/7),landing=mode==='landing';box(0,0,W,H,'#090e20');for(let i=0;i<100;i++)ellipse(i*137%W,i*73%H,1,1,'#b6c1df');ellipse(W*.5,H+180,700,480,landing?'#644d64':'#234d69');ellipse(W*.5,H+180,680,460,landing?'#3b354a':'#336f79');const p=landing?t:1-t;shuttle(W/2+Math.sin(t*3)*40,100+p*370,.35+p*.55);if(t>.65&&landing){ctx.globalAlpha=(t-.65)*1.5;for(let i=0;i<5;i++)ellipse(W/2+(i-2)*55,550,70+t*25,12,'#b3909b');ctx.globalAlpha=1;}box(0,0,W,72,'#050812cc');box(0,H-90,W,90,'#050812cc');text(landing?'CHAPTER II / EMERGENCY LANDING':'JOURNEY HOME',W/2,43,'#ffc4d0',24);text(landing?'Archon is defeated. ARK must land for repairs.':'Repairs complete. ARK is returning home.',W/2,H-48,'#e2d4e1',20);}


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
const mobileUI=document.createElement('div');mobileUI.id='mobile-controls';mobileUI.innerHTML=`<div class="mobile-vitals"></div><button class="touch-pause" data-mobile="p" aria-label="Pause">Ⅱ</button><div class="touch-pad" id="move-pad" aria-label="Move"><b class="directions">✥</b><i></i></div><div class="touch-actions"><button data-mobile="dash" aria-label="Dash">»</button><button data-mobile="r" aria-label="Reload">⟳</button><button data-mobile="t" aria-label="Switch weapon"><svg viewBox="0 0 80 40"><path d="M8 12H60V8H73V20H44L35 34H25L28 20H8Z" fill="#cfb79a" stroke="#191719" stroke-width="4"/><path d="M15 11H58" stroke="#e25a59" stroke-width="5"/></svg></button><button data-mobile="h" aria-label="Heal">✚</button><button data-mobile="e" aria-label="Use or repair">⚒</button><button data-mobile="f" aria-label="Repair robot">⚙</button><button data-mobile="g" aria-label="Refill robot">▥</button></div><div class="touch-pad" id="aim-pad" aria-label="Aim and fire"><span class="aim-label">AIM / FIRE</span><b class="crosshair">⌖</b><i></i></div>`;document.querySelector('.stage').append(mobileUI);
const touchState={aim:null,fire:false};
function resetTouch(){touchState.fire=false;touchState.aim=null;mouse.down=false;for(const k of ['w','a','s','d','e','f','g'])keys.delete(k);mobileUI.querySelectorAll('i').forEach(i=>i.style.transform='');}
function updateMobile(){const active=mode==='playing';document.querySelector('#aim-pad').classList.toggle('auto-fire',!!settings.autoAim);document.querySelector('#aim-pad').setAttribute('aria-label',settings.autoAim?'Fire':'Aim and fire joystick');mobileUI.hidden=!active;document.body.classList.toggle('touch-playing',active);if(!active){resetTouch();return;}const dashButton=mobileUI.querySelector('[data-mobile="dash"]');dashButton.hidden=g.stage==='training';dashButton.disabled=(g.p.dashCooldown||0)>0;dashButton.textContent=g.p.dashCooldown>0?g.p.dashCooldown.toFixed(1):'»';const w=weapons[g.weapon];mobileUI.querySelector('.mobile-vitals').innerHTML='<span>♥ '+Math.max(0,Math.ceil(g.p.hp))+'</span><span>'+ (g.reload?'⟳':w.melee?'∞':w.turret?career.turretStock:g.magazines[g.weapon]+' / '+g.reserve[g.weapon])+'</span>';mobileUI.querySelector('[data-mobile="h"]').hidden=g.p.hp>=100||g.med<1;const robot=(g.turrets||[]).some(t=>Math.hypot(t.x-g.p.x,t.y-g.p.y)<110);for(const key of ['f','g'])mobileUI.querySelector('[data-mobile="'+key+'"]').hidden=!robot;mobileUI.querySelector('[data-mobile="e"]').hidden=!((typeof nearVexa==='function'&&nearVexa()&&vexaOpen())||g.stage==='planet'||g.stage==='training'||(g.systems||[]).some(t=>Math.hypot(t.x-g.p.x,t.y-g.p.y)<110));}

function mobileAim(){if(!g)return;if(settings.autoAim&&touchState.fire){const candidates=g.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-g.p.x,e.y-g.p.y)<900&&e.x>=camera.x&&e.x<=camera.x+W&&e.y>=camera.y&&e.y<=camera.y+H&&clearLine(g.p,e,3));candidates.sort((a,b)=>Math.hypot(a.x-g.p.x,a.y-g.p.y)-Math.hypot(b.x-g.p.x,b.y-g.p.y));mouse.sx=undefined;if(candidates.length){mouse.x=candidates[0].x;mouse.y=candidates[0].y;}mouse.down=true;return;}if(!touchState.aim)return;mouse.sx=undefined;mouse.x=g.p.x+touchState.aim.x*600;mouse.y=g.p.y+touchState.aim.y*600;mouse.down=true;}
for(const kind of ['move','aim']){const pad=document.querySelector('#'+kind+'-pad');let pointer=null;function apply(e){if(kind==='aim'&&settings.autoAim){touchState.fire=true;touchState.aim=null;mouse.down=true;return;}const r=pad.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),scale=Math.min(1,40/(len||1));pad.querySelector('i').style.transform=`translate(${dx*scale}px,${dy*scale}px)`;if(kind==='move'){for(const k of ['w','a','s','d'])keys.delete(k);if(dx>12)keys.add('d');if(dx< -12)keys.add('a');if(dy>12)keys.add('s');if(dy< -12)keys.add('w');}else{touchState.aim=len>12?{x:dx/len,y:dy/len}:null;mouse.down=!!touchState.aim;}}
pad.addEventListener('pointerdown',e=>{if(mode!=='playing'||pointer!==null)return;e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(pointer);apply(e);});pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)apply(e);});function release(e){if(e.pointerId!==pointer)return;pointer=null;pad.querySelector('i').style.transform='';if(kind==='move')for(const k of ['w','a','s','d'])keys.delete(k);else{touchState.fire=false;touchState.aim=null;mouse.down=false;}}for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,release);}
mobileUI.querySelectorAll('button').forEach(button=>{const k=button.dataset.mobile;button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);if(k==='p')pause();else if(k==='dash')dash();else if(k==='r')reloadWeapon();else if(k==='t')cycleWeapon(1);else if(k==='h')heal();else keys.add(k);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(k));});
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


// --- dash.js ---
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


// --- forest-layout.js ---
const forestLayout={"walls": [{"x": 220, "y": 230, "w": 420, "h": 24}, {"x": 220, "y": 230, "w": 24, "h": 330}, {"x": 616, "y": 230, "w": 24, "h": 330}, {"x": 220, "y": 536, "w": 126.0, "h": 24}, {"x": 514.0, "y": 536, "w": 126.0, "h": 24}, {"x": 2180, "y": 220, "w": 470, "h": 24}, {"x": 2180, "y": 220, "w": 24, "h": 350}, {"x": 2626, "y": 220, "w": 24, "h": 350}, {"x": 2180, "y": 546, "w": 141.0, "h": 24}, {"x": 2509.0, "y": 546, "w": 141.0, "h": 24}, {"x": 250, "y": 1190, "w": 450, "h": 24}, {"x": 250, "y": 1190, "w": 24, "h": 350}, {"x": 676, "y": 1190, "w": 24, "h": 350}, {"x": 250, "y": 1516, "w": 135.0, "h": 24}, {"x": 565.0, "y": 1516, "w": 135.0, "h": 24}, {"x": 2130, "y": 1180, "w": 490, "h": 24}, {"x": 2130, "y": 1180, "w": 24, "h": 370}, {"x": 2596, "y": 1180, "w": 24, "h": 370}, {"x": 2130, "y": 1526, "w": 147.0, "h": 24}, {"x": 2473.0, "y": 1526, "w": 147.0, "h": 24}, {"x": 1080, "y": 190, "w": 400, "h": 24}, {"x": 1080, "y": 190, "w": 24, "h": 300}, {"x": 1456, "y": 190, "w": 24, "h": 300}, {"x": 1080, "y": 466, "w": 120.0, "h": 24}, {"x": 1360.0, "y": 466, "w": 120.0, "h": 24}, {"x": 1060, "y": 1320, "w": 450, "h": 24}, {"x": 1060, "y": 1320, "w": 24, "h": 270}, {"x": 1486, "y": 1320, "w": 24, "h": 270}, {"x": 1060, "y": 1566, "w": 135.0, "h": 24}, {"x": 1375.0, "y": 1566, "w": 135.0, "h": 24}, {"x": 869.6062561900555, "y": 1579.3708656321523, "w": 55.489166391280506, "h": 55.489166391280506}, {"x": 973.2276651164173, "y": 540.5209496688196, "w": 56.152208677968545, "h": 56.152208677968545}, {"x": 1092.5111784147603, "y": 719.0592962276179, "w": 59.23856782484581, "h": 59.23856782484581}, {"x": 1830.1527683893723, "y": 1611.9910937577604, "w": 45.63783135360582, "h": 45.63783135360582}, {"x": 2845.138719832841, "y": 1210.615868063041, "w": 56.90287350698247, "h": 56.90287350698247}, {"x": 2846.510727093368, "y": 1239.3128496905342, "w": 54.72608394351742, "h": 54.72608394351742}, {"x": 258.9037376158529, "y": 645.4083830739393, "w": 52.75937339191287, "h": 52.75937339191287}, {"x": 2766.6932524841254, "y": 1399.9708215593434, "w": 48.91881295671109, "h": 48.91881295671109}, {"x": 2797.1243431023304, "y": 409.4111220512274, "w": 48.233374909841075, "h": 48.233374909841075}, {"x": 747.3706371240187, "y": 1498.0872178798668, "w": 48.69312235091101, "h": 48.69312235091101}, {"x": 945.9535548895353, "y": 1607.2138619829705, "w": 41.438981110715204, "h": 41.438981110715204}, {"x": 2651.190359788282, "y": 1015.4329625264787, "w": 57.12588372431246, "h": 57.12588372431246}, {"x": 927.1789983852639, "y": 255.7458171668704, "w": 43.24153221363547, "h": 43.24153221363547}, {"x": 2574.448592343122, "y": 1646.8213701674833, "w": 49.945557294076345, "h": 49.945557294076345}, {"x": 2059.627392511694, "y": 1067.1839991023282, "w": 52.89671751167749, "h": 52.89671751167749}, {"x": 2622.229691203406, "y": 681.5848750319913, "w": 51.68459136775169, "h": 51.68459136775169}, {"x": 2085.949574757781, "y": 725.8872926245358, "w": 35.261928825826395, "h": 35.261928825826395}, {"x": 2857.6113955105566, "y": 1017.8253455458872, "w": 38.83436147467071, "h": 38.83436147467071}, {"x": 724.3298926450984, "y": 430.69467766639235, "w": 51.31454520394689, "h": 51.31454520394689}, {"x": 698.2635518192413, "y": 180.1500716437696, "w": 56.379809772263194, "h": 56.379809772263194}, {"x": 745.8254611681386, "y": 313.8494702457015, "w": 56.92534353677768, "h": 56.92534353677768}, {"x": 2529.720037250525, "y": 724.6675396087062, "w": 55.92924465777607, "h": 55.92924465777607}, {"x": 285.3490696554813, "y": 660.7250843552296, "w": 40.31797266623463, "h": 40.31797266623463}, {"x": 2730.4795198995166, "y": 1456.3466772463516, "w": 58.93462188367744, "h": 58.93462188367744}, {"x": 2093.308862600146, "y": 987.827737420018, "w": 50.796506465242686, "h": 50.796506465242686}, {"x": 2263.9663745032303, "y": 1055.3531093072343, "w": 49.1711529374096, "h": 49.1711529374096}, {"x": 1138.3074380881985, "y": 1084.8936970618295, "w": 60.34656626923715, "h": 60.34656626923715}, {"x": 2250.895299341931, "y": 1012.1901938686887, "w": 52.9719772195106, "h": 52.9719772195106}, {"x": 2594.263211604974, "y": 730.0022290330918, "w": 46.62660910442773, "h": 46.62660910442773}, {"x": 2142.0891029712693, "y": 753.1772541305886, "w": 37.063374679549355, "h": 37.063374679549355}, {"x": 154.78178209682332, "y": 1617.7632867139412, "w": 41.437314464509264, "h": 41.437314464509264}, {"x": 2131.3641517861315, "y": 91.64474636260248, "w": 55.64300309922274, "h": 55.64300309922274}, {"x": 1683.323910886237, "y": 441.0758588973551, "w": 55.069577108145644, "h": 55.069577108145644}, {"x": 2056.2119345666315, "y": 79.65871471885953, "w": 59.77392238505087, "h": 59.77392238505087}, {"x": 79.98877863369086, "y": 449.1441123059155, "w": 54.97983556813695, "h": 54.97983556813695}, {"x": 1783.6274264311942, "y": 1635.1341544086472, "w": 36.333572121804075, "h": 36.333572121804075}, {"x": 928.2105774452308, "y": 1479.0888229369573, "w": 52.72152192651745, "h": 52.72152192651745}, {"x": 372.98104880985807, "y": 1677.1023256701355, "w": 43.50834555862265, "h": 43.50834555862265}, {"x": 919.4820677409024, "y": 1331.9566160409995, "w": 59.13136770259208, "h": 59.13136770259208}, {"x": 1861.7136675566153, "y": 1299.5895224938654, "w": 56.774021974711616, "h": 56.774021974711616}, {"x": 352.8552302038775, "y": 697.8362272392238, "w": 60.423105566941295, "h": 60.423105566941295}, {"x": 1782.285501785193, "y": 302.15971483935067, "w": 53.243041849579775, "h": 53.243041849579775}, {"x": 2196.0623019186796, "y": 1672.7930035746203, "w": 36.59055062042428, "h": 36.59055062042428}, {"x": 841.0691437334932, "y": 568.7487595455682, "w": 59.29981345716173, "h": 59.29981345716173}, {"x": 1890.880270899494, "y": 1396.0448271910182, "w": 45.066717297585264, "h": 45.066717297585264}, {"x": 2744.7777965058303, "y": 659.4624359552772, "w": 56.89871153070046, "h": 56.89871153070046}, {"x": 752.5731258470091, "y": 1609.5800178955894, "w": 59.072240155134985, "h": 59.072240155134985}, {"x": 2718.616586050008, "y": 593.32738301354, "w": 44.331243134335764, "h": 44.331243134335764}, {"x": 2738.065560351667, "y": 712.9809480119916, "w": 55.067383415968465, "h": 55.067383415968465}, {"x": 1036.9522014050283, "y": 628.0922766343289, "w": 50.97242369762923, "h": 50.97242369762923}, {"x": 2051.4975402300192, "y": 642.0167368067313, "w": 36.6026809243565, "h": 36.6026809243565}, {"x": 769.6578385209928, "y": 1072.0938291736, "w": 52.5554170913797, "h": 52.5554170913797}, {"x": 2673.2131606305675, "y": 1034.2047402320516, "w": 61.01475948681488, "h": 61.01475948681488}, {"x": 1892.7419529638566, "y": 753.0753286012483, "w": 45.37614030400415, "h": 45.37614030400415}, {"x": 2782.7252987981374, "y": 1251.5182737848988, "w": 57.360206181312535, "h": 57.360206181312535}, {"x": 2853.7113018949512, "y": 1183.3054087538276, "w": 39.11306306485561, "h": 39.11306306485561}, {"x": 891.4302645552126, "y": 1323.4348913974015, "w": 57.972590384776666, "h": 57.972590384776666}, {"x": 2779.79961263959, "y": 372.42786501073317, "w": 47.236070603255754, "h": 47.236070603255754}, {"x": 2710.3325132388236, "y": 737.9829097806602, "w": 39.06351934200116, "h": 39.06351934200116}, {"x": 1049.0877406919708, "y": 83.73200884005824, "w": 48.352538818203165, "h": 48.352538818203165}, {"x": 2728.023697268751, "y": 713.6203026358845, "w": 61.26384955794469, "h": 61.26384955794469}, {"x": 1800.8637889054394, "y": 557.1619394368831, "w": 53.57630154719172, "h": 53.57630154719172}, {"x": 2772.0994367918324, "y": 419.034422762038, "w": 58.109927811289644, "h": 58.109927811289644}, {"x": 219.94678454543438, "y": 647.2229704172539, "w": 58.17454993147212, "h": 58.17454993147212}, {"x": 297.89015761619817, "y": 697.1559610208656, "w": 53.92391086896962, "h": 53.92391086896962}, {"x": 903.6688985356188, "y": 312.0642179662297, "w": 37.66027721095442, "h": 37.66027721095442}, {"x": 742.8954768515752, "y": 673.6439800979156, "w": 38.849029524500374, "h": 38.849029524500374}, {"x": 1991.8503763840038, "y": 361.082308088008, "w": 47.17792770474478, "h": 47.17792770474478}, {"x": 1765.1187927341957, "y": 1415.5603842997846, "w": 58.56965227479058, "h": 58.56965227479058}, {"x": 2624.7422280936075, "y": 739.9095337623129, "w": 51.23168306705405, "h": 51.23168306705405}, {"x": 1160.6022270561837, "y": 691.8018586237706, "w": 55.32158797587152, "h": 55.32158797587152}, {"x": 836.6371461701616, "y": 464.6135882317593, "w": 43.48833074055369, "h": 43.48833074055369}, {"x": 115.7393629568143, "y": 1511.0678273199767, "w": 51.88403585115745, "h": 51.88403585115745}, {"x": 2865.5930215606313, "y": 1315.4346456352428, "w": 38.75058521142176, "h": 38.75058521142176}, {"x": 83.89358266065426, "y": 1273.1300227454303, "w": 58.71295075559392, "h": 58.71295075559392}, {"x": 978.0158445067821, "y": 578.8401910168238, "w": 37.811222576565044, "h": 37.811222576565044}, {"x": 1672.8943148826347, "y": 1126.0968314781494, "w": 61.368861613118014, "h": 61.368861613118014}, {"x": 1853.0368079566815, "y": 224.08173863160593, "w": 40.805913976377646, "h": 40.805913976377646}, {"x": 1215.679938242368, "y": 1053.3427337433172, "w": 61.02615460263076, "h": 61.02615460263076}, {"x": 801.0003981069361, "y": 1163.874039630096, "w": 53.6291734491947, "h": 53.6291734491947}, {"x": 168.18038158955486, "y": 1660.2071156165919, "w": 44.52175037593103, "h": 44.52175037593103}, {"x": 1974.4025509745588, "y": 340.950426315979, "w": 51.09972864989904, "h": 51.09972864989904}, {"x": 1039.7467573837503, "y": 605.7161474554522, "w": 54.520583731574426, "h": 54.520583731574426}, {"x": 2744.1089129615984, "y": 703.17682950983, "w": 42.285522913082794, "h": 42.285522913082794}, {"x": 2019.732430057741, "y": 1245.412895058224, "w": 42.480698995200555, "h": 42.480698995200555}, {"x": 1246.8275698513141, "y": 1188.5265137783053, "w": 51.79693070998492, "h": 51.79693070998492}, {"x": 813.7595972602115, "y": 84.19347744081972, "w": 46.08973294812363, "h": 46.08973294812363}, {"x": 2101.495351875355, "y": 98.3040177130906, "w": 41.355670915288606, "h": 41.355670915288606}, {"x": 1821.9947521143017, "y": 511.6722039202417, "w": 60.77504049956568, "h": 60.77504049956568}, {"x": 1960.665713858498, "y": 1431.982521771903, "w": 39.4064001655029, "h": 39.4064001655029}, {"x": 374.62871868308713, "y": 80.65431194812533, "w": 55.60849835007241, "h": 55.60849835007241}], "buildings": [{"x": 220, "y": 230, "w": 420, "h": 330}, {"x": 2180, "y": 220, "w": 470, "h": 350}, {"x": 250, "y": 1190, "w": 450, "h": 350}, {"x": 2130, "y": 1180, "w": 490, "h": 370}, {"x": 1080, "y": 190, "w": 400, "h": 300}, {"x": 1060, "y": 1320, "w": 450, "h": 270}], "trees": [{"x": 897.3508393856958, "y": 1607.1154488277925, "r": 47.835488268345266}, {"x": 1001.3037694554015, "y": 568.5970540078039, "r": 48.40707644652461}, {"x": 1122.130462327183, "y": 748.6785801400408, "r": 51.06773088348777}, {"x": 1852.9716840661752, "y": 1634.8100094345632, "r": 39.342958063453295}, {"x": 2873.5901565863323, "y": 1239.0673048165322, "r": 49.05420129912282}, {"x": 2873.873769065127, "y": 1266.675891662293, "r": 47.17765857199778}, {"x": 285.2834243118093, "y": 671.7880697698957, "r": 45.4822184413042}, {"x": 2791.152658962481, "y": 1424.430228037699, "r": 42.17139047992336}, {"x": 2821.2410305572507, "y": 433.52780950614795, "r": 41.580495611931966}, {"x": 771.7171982994741, "y": 1522.4337790553222, "r": 41.976829612854324}, {"x": 966.673045444893, "y": 1627.933352538328, "r": 35.723259578202764}, {"x": 2679.753301650438, "y": 1043.995904388635, "r": 49.24645148647626}, {"x": 948.7997644920816, "y": 277.36658327368815, "r": 37.2771829427892}, {"x": 2599.42137099016, "y": 1671.7941488145216, "r": 43.05651490868651}, {"x": 2086.0757512675327, "y": 1093.632357858167, "r": 45.60061854454956}, {"x": 2648.071986887282, "y": 707.4271707158671, "r": 44.55568221357905}, {"x": 2103.5805391706945, "y": 743.518257037449, "r": 30.398214505022757}, {"x": 2877.028576247892, "y": 1037.2425262832226, "r": 33.47789782299199}, {"x": 749.9871652470719, "y": 456.3519502683658, "r": 44.23667689995422}, {"x": 726.4534567053729, "y": 208.33997652990118, "r": 48.60328428643379}, {"x": 774.2881329365275, "y": 342.31214201409034, "r": 49.07357201446352}, {"x": 2557.684659579413, "y": 752.6321619375942, "r": 48.21486608428972}, {"x": 305.5080559885986, "y": 680.8840706883469, "r": 34.7568729881333}, {"x": 2759.946830841355, "y": 1485.8139881881905, "r": 50.805708520411585}, {"x": 2118.707115832767, "y": 1013.2259906526393, "r": 43.79009178038163}, {"x": 2288.551950971935, "y": 1079.9386857759391, "r": 42.38892494604276}, {"x": 1168.480721222817, "y": 1115.066980196448, "r": 52.022901956238925}, {"x": 2277.3812879516863, "y": 1038.676182478444, "r": 45.66549760302638}, {"x": 2617.576516157188, "y": 753.3155335853056, "r": 40.195352676230804}, {"x": 2160.620790311044, "y": 771.7089414703632, "r": 31.951185068577033}, {"x": 175.50043932907795, "y": 1638.4819439461958, "r": 35.72182281423213}, {"x": 2159.1856533357427, "y": 119.46624791221384, "r": 47.968106120019605}, {"x": 1710.8586994403097, "y": 468.6106474514279, "r": 47.47377336909108}, {"x": 2086.098895759157, "y": 109.54567591138496, "r": 51.52924343538868}, {"x": 107.47869641775934, "y": 476.634030089984, "r": 47.396409972531856}, {"x": 1801.7942124920962, "y": 1653.3009404695492, "r": 31.32204493258972}, {"x": 954.5713384084895, "y": 1505.449583900216, "r": 45.449587867687455}, {"x": 394.7352215891694, "y": 1698.856498449447, "r": 37.507194447088494}, {"x": 949.0477515921984, "y": 1361.5222998922955, "r": 50.97531698499318}, {"x": 1890.100678543971, "y": 1327.9765334812212, "r": 48.94312239199277}, {"x": 383.0667829873482, "y": 728.0477800226945, "r": 52.08888410943216}, {"x": 1808.9070227099828, "y": 328.78123576414055, "r": 45.89917400825843}, {"x": 2214.357577228892, "y": 1691.0882788848326, "r": 31.54357812105542}, {"x": 870.719050462074, "y": 598.398666274149, "r": 51.12052884238081}, {"x": 1913.4136295482867, "y": 1418.5781858398109, "r": 38.8506183599873}, {"x": 2773.227152271181, "y": 687.9117917206274, "r": 49.050613388534885}, {"x": 782.1092459245766, "y": 1639.116137973157, "r": 50.924344961323264}, {"x": 2740.782207617176, "y": 615.493004580708, "r": 38.21658890891015}, {"x": 2765.5992520596515, "y": 740.5146397199758, "r": 47.47188225514523}, {"x": 1062.438413253843, "y": 653.5784884831435, "r": 43.941744566921756}, {"x": 2069.7988806921976, "y": 660.3180772689095, "r": 31.554035279617672}, {"x": 795.9355470666826, "y": 1098.3715377192898, "r": 45.30639404429285}, {"x": 2703.720540373975, "y": 1064.712119975459, "r": 52.5989305920818}, {"x": 1915.4300231158588, "y": 775.7633987532504, "r": 39.117362331038066}, {"x": 2811.4054018887937, "y": 1280.1983768755551, "r": 49.448453604579775}, {"x": 2873.267833427379, "y": 1202.8619402862553, "r": 33.7181578145307}, {"x": 920.4165597476009, "y": 1352.4211865897898, "r": 49.9763710213592}, {"x": 2803.417647941218, "y": 396.045900312361, "r": 40.720750520048064}, {"x": 2729.864272909824, "y": 757.5146694516608, "r": 33.67544770862169}, {"x": 1073.2640101010725, "y": 107.90827824915982, "r": 41.68322311914066}, {"x": 2758.6556220477237, "y": 744.2522274148569, "r": 52.813663412021285}, {"x": 1827.6519396790352, "y": 583.950090210479, "r": 46.18646685102735}, {"x": 2801.1544006974773, "y": 448.0893866676828, "r": 50.09476535456004}, {"x": 249.03405951117045, "y": 676.3102453829899, "r": 50.15047407885528}, {"x": 324.852113050683, "y": 724.1179164553504, "r": 46.48613005945657}, {"x": 922.4990371410961, "y": 330.8943565717069, "r": 32.46575621634002}, {"x": 762.3199916138253, "y": 693.0684948601657, "r": 33.490542693534806}, {"x": 2015.4393402363762, "y": 384.6712719403804, "r": 40.67062733167654}, {"x": 1794.403618871591, "y": 1444.84521043718, "r": 50.49107954723326}, {"x": 2650.3580696271347, "y": 765.5253752958399, "r": 44.16524402332246}, {"x": 1188.2630210441193, "y": 719.4626526117064, "r": 47.691024117130624}, {"x": 858.3813115404384, "y": 486.35775360203615, "r": 37.48994029358077}, {"x": 141.68138088239303, "y": 1537.0098452455554, "r": 44.72761711306677}, {"x": 2884.968314166342, "y": 1334.8099382409537, "r": 33.40567690639807}, {"x": 113.25005803845123, "y": 1302.4864981232272, "r": 50.61461272033959}, {"x": 996.9214557950646, "y": 597.7458023051064, "r": 32.59588153152159}, {"x": 1703.5787456891937, "y": 1156.7812622847084, "r": 52.90419104579139}, {"x": 1873.4397649448704, "y": 244.48469561979476, "r": 35.17751204860142}, {"x": 1246.1930155436835, "y": 1083.8558110446327, "r": 52.60875396778514}, {"x": 827.8149848315335, "y": 1190.6886263546933, "r": 46.23204607689199}, {"x": 190.44125677752038, "y": 1682.4679908045573, "r": 38.38081928959571}, {"x": 1999.9524152995084, "y": 366.5002906409285, "r": 44.05149021543021}, {"x": 1067.0070492495374, "y": 632.9764393212394, "r": 47.000503216874506}, {"x": 2765.25167441814, "y": 724.3195909663714, "r": 36.45303699403689}, {"x": 2040.9727795553415, "y": 1266.6532445558244, "r": 36.62129223724186}, {"x": 1272.7260352063065, "y": 1214.4249791332977, "r": 44.65252647412493}, {"x": 836.8044637342733, "y": 107.23834391488154, "r": 39.73252840355486}, {"x": 2122.1731873329995, "y": 118.98185317073491, "r": 35.651440444214316}, {"x": 1852.3822723640847, "y": 542.0597241700245, "r": 52.392276292729036}, {"x": 1980.3689139412495, "y": 1451.6857218546545, "r": 33.97103462543354}, {"x": 402.43296785812333, "y": 108.45856112316153, "r": 47.93836064661415}]};


// --- forest.js ---
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



bootGame();
})();
