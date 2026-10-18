const fs=require('fs'),vm=require('vm'),assert=require('assert');
const windows=new Map(),elements=new Map(),frames=new Map();
let sequence=0,time=0,drawCalls=0;
const context=new Proxy({}, {get(target,key){
  if(key in target)return target[key];
  return(...args)=>{
    drawCalls++;
    if(['ellipse','arc'].includes(key)){
      const count=key==='ellipse'?7:5;
      assert.ok(args.length>=count,`${key} requires ${count} arguments, received ${args.length}`);
      assert.ok(args.slice(0,count).every(Number.isFinite),key+' requires finite coordinates');
      assert.ok(args[2]>=0,key+' requires a positive radius');
      if(key==='ellipse')assert.ok(args[3]>=0,'ellipse requires a positive Y radius');
    }
  };
}});
function element(id){
  if(!elements.has(id))elements.set(id,{events:new Map(),style:{},innerHTML:'',hidden:false,
    addEventListener(name,fn){this.events.set(name,fn);},
    getContext(){return context;},
    getBoundingClientRect(){return{left:0,top:0,width:1280,height:720};},
    focus(){this.focused=true;}
  });
  return elements.get(id);
}
const env={console,document:{querySelector:element},window:{addEventListener(name,fn){windows.set(name,fn);}},
  Image:class{},localStorage:{getItem(){return null;}},setTimeout(){},clearTimeout(){},
  requestAnimationFrame(fn){const id=++sequence;frames.set(id,fn);return id;}
};
vm.createContext(env);
const code=fs.readFileSync('app.js','utf8').replace('bootGame();\n})();',
  'globalThis.testState={get game(){return g;},get mode(){return mode;}};bootGame();\n})();');
vm.runInContext(code,env);
assert.equal(frames.size,1,'starts without waiting for DOMContentLoaded');
function nextFrame(){
  assert.equal(frames.size,1,'exactly one animation loop is scheduled');
  const [id,fn]=frames.entries().next().value;frames.delete(id);time+=1000/60;fn(time);
  assert.notEqual(env.testState.mode,'error',elements.get('#runtime-error')?.textContent);
}
function key(code,key,type='keydown'){windows.get(type)({code,key,repeat:false,preventDefault(){}});}
nextFrame();assert.ok(drawCalls>0);
element('#overlay').events.get('click')({target:{closest(){return{dataset:{action:'start'}};}}});
assert.equal(env.testState.mode,'playing');assert.ok(element('#game').focused);
const state=env.testState.game;
for(const [code,value,axis,sign] of [['KeyW','წ','y',-1],['KeyA','ა','x',-1],['KeyS','ს','y',1],['KeyD','დ','x',1]]){
  const before=state.p[axis];key(code,value);
  for(let i=0;i<8;i++)nextFrame();key(code,value,'keyup');
  assert.ok((state.p[axis]-before)*sign>20,code+' moves through scheduled frames');
}
assert.ok(state.scrap>8,'automatic bolt pickup and its animation do not stop the frame loop');
const mag=state.magazines[0];
element('#game').events.get('mousedown')({button:0,clientX:1000,clientY:360,preventDefault(){}});
nextFrame();assert.equal(state.magazines[0],mag-1);assert.ok(state.bullets.length>0);
const bulletX=state.bullets[0].x;nextFrame();assert.ok(state.bullets[0].x>bulletX,'projectile advances');
windows.get('mouseup')();
for(let i=0;i<160;i++)nextFrame();
assert.ok(state.enemies.length>0,'waves spawn through scheduled frames');
const enemy=state.enemies[0],ex=enemy.x,ey=enemy.y;
for(let i=0;i<20;i++)nextFrame();assert.ok(Math.hypot(enemy.x-ex,enemy.y-ey)>5,'robots move');
key('KeyR','რ');assert.ok(state.reload);
for(let i=0;i<80;i++)nextFrame();assert.equal(state.reload,null);assert.equal(state.magazines[0],12);
key('KeyI','ი');const gameTime=state.time;for(let i=0;i<10;i++)nextFrame();assert.equal(state.time,gameTime,'inventory pauses simulation');
key('KeyI','ი');nextFrame();assert.ok(state.time>gameTime,'resuming restarts simulation');
assert.equal(frames.size,1);
console.log('PASS: built browser app starts directly, menu click, WASD, click-to-fire, moving bullets, robot waves, reload, pause/resume, one continuous frame loop.');
