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

