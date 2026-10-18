import bpy, math, random, os
from mathutils import Vector
random.seed(42)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
grass=mat('Meadow moss',(0.19,.29,.14)); dirt=mat('Warm gravel',(.43,.34,.22)); stone=mat('Grey stone',(.39,.43,.38)); wood=mat('Timber',(.28,.16,.085)); roof=mat('Copper roofs',(.42,.19,.09)); metal=mat('Roof ridges',(.19,.26,.25)); glass=mat('Skylights',(.23,.55,.65)); leaf=[mat('Pine '+str(i),c) for i,c in enumerate([(.12,.25,.12),(.19,.36,.16),(.27,.42,.19)])]
def cube(name,x,y,z,w,h,d,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x/100,-y/100,z));o=bpy.context.object;o.name=name;o.dimensions=(w/100,h/100,d);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
def tree(x,y,r):
 cube('Tree trunk',x,y,.45,12,12,.9,wood)
 for k in range(3):
  bpy.ops.mesh.primitive_cone_add(vertices=9,radius1=r/100*(1-k*.22),radius2=0,depth=1.2,location=(x/100,-y/100,1+k*.55));bpy.context.object.name='Pine canopy';bpy.context.object.data.materials.append(leaf[k])
cube('Forest floor',2250,1350,-.2,4500,2700,.3,grass)
for y in [400,900,1350,1800,2300]:cube('East west trail',2250,y,-.035,4000,85,.02,dirt)
for x in [400,950,2250,3450,4100]:cube('North south trail',x,1350,-.03,80,2200,.02,dirt)
blocks=[(700,450,180,260),(2100,450,180,260),(700,1100,180,220),(2100,1100,180,220),(1280,400,440,80),(1280,1320,440,80),(1150,760,300,70),(1650,980,300,70),(420,820,250,80),(2370,820,250,80),(1050,220,80,200),(1850,1380,80,180),(1200,1100,80,160),(1820,530,80,160)]
for i,b in enumerate(blocks):
 x,y,w,h=[v*1.5 for v in b]
 cube('Collision footprint '+str(i),x+w/2,y+h/2,.07,w,h,.16,stone)
 if i<6:
  cube('Cabin walls',x+w/2,y+h/2,.65,w-12,h-12,1.15,wood)
  # Roof stays inside the exact gameplay collision rectangle.
  cube('Metal roof',x+w/2,y+h/2,1.3,w-6,h-6,.18,roof if i%2==0 else metal)
  for yy in range(int(y+15),int(y+h-10),20):cube('Standing seam',x+w/2,yy,1.42,w-8,3,.035,metal)
  cube('Roof skylight',x+w*.48,y+h*.42,1.47,min(65,w*.35),min(60,h*.35),.06,glass)
  cube('Chimney',x+w*.8,y+h*.75,1.65,24,25,.6,stone)
 else:
  cube('Garden soil',x+w/2,y+h/2,.18,w-10,h-10,.06,dirt)
  for xx in range(int(x+40),int(x+w-30),65):
   for yy in range(int(y+38),int(y+h-28),65):tree(xx,yy,30)
  for xx in [x+5,x+w-5]:cube('Grove border',xx,y+h/2,.3,10,h,.5,wood)
  for yy in [y+5,y+h-5]:cube('Grove border',x+w/2,yy,.3,w,10,.5,wood)
# Visible outer stone perimeter matches the shared physics boundaries.
for x,y,w,h in [(210,210,4080,30),(210,2460,4080,30),(210,210,30,2280),(4260,210,30,2280)]:cube('Arena boundary',x+w/2,y+h/2,.3,w,h,.65,stone)
for i in range(180):
 x=random.uniform(20,4480);y=random.choice([random.uniform(20,170),random.uniform(2520,2680)])
 tree(x,y,random.uniform(35,65))
for i in range(900):
 x=random.uniform(250,4240);y=random.uniform(250,2440)
 if any(abs(y-v)<65 for v in [400,900,1350,1800,2300]) or any(abs(x-v)<65 for v in [400,950,2250,3450,4100]):continue
 cube('Low grass',x,y,.015,random.uniform(3,12),random.uniform(3,12),.025,random.choice(leaf))
for x,y in [(400,400),(4100,400),(400,2300),(4100,2300)]:
 cube('Arrival pad',x,y,.05,160,160,.12,stone)
 for dx in [-65,65]:cube('Pad light',x+dx,y,.14,8,130,.06,glass)
bpy.ops.object.camera_add(location=(22.5,-13.5,60));cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=45;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=4500;scene.render.resolution_y=2700;scene.render.resolution_percentage=100
sh=scene.display.shading;sh.light='STUDIO';sh.color_type='MATERIAL';sh.show_shadows=True;sh.show_cavity=True;sh.cavity_type='BOTH';sh.curvature_ridge_factor=1.4;sh.curvature_valley_factor=1.2;sh.background_type='WORLD';scene.world.color=(.08,.1,.07)
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(root,'assets','survival-forest.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','survival-forest.blend'));bpy.ops.render.render(write_still=True)
