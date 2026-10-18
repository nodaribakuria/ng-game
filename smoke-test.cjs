const fs = require('fs'), vm = require('vm'), assert = require('assert');
const elements = new Map();
const context2d = new Proxy({}, {get:()=>()=>{}});
function element(id){if(!elements.has(id))elements.set(id,{innerHTML:'',hidden:false,style:{},value:'normal',addEventListener(){},getContext(){return context2d;}});return elements.get(id);}
const sandbox = {document:{querySelector:element},window:{addEventListener(){}},Image:class{},localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},console};
vm.createContext(sandbox);for(const file of ['game.js','combat.js','world.js','boss.js','melee-ranged.js','arsenal.js','career.js','simulation.js','scene.js','ship-art.js','weapon-art.js','planet.js','training.js','modes.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
vm.runInContext(`
start();
if(mode!=='playing'||g.med!==2)throw Error('Start failed');
g.p.hp=30;heal();if(g.p.hp!==75||g.med!==1)throw Error('Healing failed');
g.p.x=g.systems[0].x;g.p.y=g.systems[0].y;keys.add('e');g.scrap=12;g.next=999;
for(let i=0;i<150;i++)update(.04);
if(g.systems[0].progress!==100||g.scrap!==8||g.coins!==25)throw Error('Repair failed');
keys.clear();g.drops=[{x:g.p.x,y:g.p.y,type:'coin',value:20}];update(.01);
if(g.coins!==45||g.drops.length)throw Error('Pickup failed');
g.wave=5;g.systems.forEach(s=>s.progress=100);g.next=0;update(.01);
if(!g.bossSpawned||!g.enemies[0].boss)throw Error('Boss gate failed');
g.enemies[0].hp=0;update(.01);if(mode!=='landing')throw Error('Landing failed');
start();g.p.hp=0;update(.01);if(mode!=='ended')throw Error('Defeat failed');
start();inventory();if(mode!=='inventory')throw Error('Inventory failed');inventory();if(mode!=='playing')throw Error('Resume failed');
draw();
const traveler={x:400,y:400},goal={x:2500,y:400};for(let k=0;k<7000;k++){let t=chaseTarget(traveler,goal),a=Math.atan2(t.y-traveler.y,t.x-traveler.x),nx=traveler.x+Math.cos(a)*2,ny=traveler.y+Math.sin(a)*2;if(walkable(nx,ny)){traveler.x=nx;traveler.y=ny;}else if(walkable(nx,traveler.y))traveler.x=nx;else if(walkable(traveler.x,ny))traveler.y=ny;}if(dist(traveler,goal)>50)throw Error('Navigation failed '+JSON.stringify(traveler));
console.log('PASS: rendering, navigation, start, healing, repair, pickup, boss gate, victory, defeat, inventory');
`,sandbox);
