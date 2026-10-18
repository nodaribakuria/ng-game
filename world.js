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
