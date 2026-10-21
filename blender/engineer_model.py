"""Editable 3D engineer and weapon assets; renders directional game sprite atlases.
Run with Blender --background --python engineer_model.py [-- --preview].
"""
import bpy, math, os, sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'blender','engineer-frames')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);return m
skin=mat('Warm skin',(.69,.39,.25));hair=mat('Chestnut hair',(.095,.035,.018))
cloth=mat('Ivory fitted shirt',(.8,.83,.78));pants=mat('Crimson work trousers',(.48,.025,.055))
dark=mat('Graphite rubber',(.025,.035,.047));metal=mat('Brushed steel',(.25,.33,.39))
trim=mat('Crimson harness',(.62,.045,.05));blue=mat('Blue chest insignia',(.035,.3,.48))
eye=mat('Eyes',(.015,.025,.035));white=mat('Eye whites',(.8,.8,.72));glow=mat('Weapon power cells',(.05,.8,.9))
root=bpy.data.objects.new('Engineer rotation',None);bpy.context.collection.objects.link(root)
body=[];weapons=[];legs=[]
def uv(name,loc,scale,m,parent=root):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 o.parent=parent;body.append(o);return o
def cube(name,loc,scale,m,parent=root):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
 o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(m);o.parent=parent
 bevel=o.modifiers.new('Soft manufactured edges','BEVEL');bevel.width=.025;bevel.segments=2
 o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');body.append(o);return o
def limb(name,a,b,r,m,parent=root):
 o=uv(name,(Vector(a)+Vector(b))/2,(r,r,(Vector(b)-Vector(a)).length/2+r*.35),m,parent)
 o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
# Rounded anatomy, layered workwear, knee pads, boot soles, straps and backpack.
uv('Hips',(0,0,.88),(.25,.15,.2),pants)
uv('Shirt torso',(0,0,1.18),(.26,.16,.3),cloth)
uv('Neck',(0,0,1.48),(.08,.08,.12),skin)
uv('Head',(0,-.015,1.7),(.155,.135,.205),skin)
uv('Hair cap',(0,.025,1.78),(.17,.145,.16),hair)
uv('Back hair',(0,.105,1.57),(.17,.075,.25),hair)
for side in [-1,1]:
 uv('Side hair',(side*.14,.015,1.63),(.045,.11,.22),hair)
 uv('Ear',(side*.153,-.01,1.69),(.028,.025,.05),skin)
 uv('Eye white',(side*.059,-.137,1.735),(.032,.012,.018),white)
 uv('Pupil',(side*.058,-.147,1.735),(.012,.006,.013),eye)
 limb('Eyebrow',(side*.03,-.143,1.77),(side*.09,-.13,1.775),.012,hair)
 cube('Harness',(side*.18,-.144,1.22),(.045,.035,.41),trim)
 cube('Belt pouch',(side*.22,-.12,.94),(.105,.09,.13),dark)
uv('Nose',(0,-.157,1.69),(.026,.04,.04),skin)
limb('Mouth',(-.035,-.142,1.625),(.035,-.142,1.625),.009,trim)
cube('Utility belt',(0,0,.99),(.49,.32,.065),dark)
cube('Belt buckle',(0,-.174,.99),(.07,.025,.055),metal)
cube('Backpack',(0,.19,1.23),(.36,.17,.39),dark)
cube('Backpack panel',(0,.285,1.23),(.26,.03,.28),trim)
uv('Chest insignia',(0,-.16,1.22),(.075,.012,.065),blue)
for side in [-1,1]:
 pivot=bpy.data.objects.new('Leg L' if side<0 else 'Leg R',None);bpy.context.collection.objects.link(pivot);pivot.parent=root;pivot.location=(side*.13,0,.88);legs.append(pivot)
 limb('Trouser thigh',(0,0,-.02),(0,0,-.35),.115,pants,pivot)
 limb('Trouser shin',(0,0,-.36),(0,0,-.69),.09,pants,pivot)
 cube('Knee armor',(0,-.092,-.36),(.16,.075,.16),dark,pivot)
 uv('Boot',(0,-.055,-.75),(.105,.18,.105),dark,pivot)
 cube('Boot sole',(0,-.055,-.82),(.22,.34,.045),metal,pivot)
 for z in [-.68,-.73,-.78]:cube('Boot laces',(0,-.2,z),(.1,.025,.018),metal,pivot)
# Both hands hold the same 3D grip positions as the rendered weapon layer.
arms=[]
for side in [-1,1]:
 shoulder=(side*.235,0,1.37);elbow=(side*.29,-.19,1.13);hand=(side*.075,-.41 if side<0 else -.27,1.19)
 before=len(body)
 limb('Sleeve',shoulder,elbow,.082,cloth);limb('Forearm',elbow,hand,.058,skin)
 uv('Gloved hand',hand,(.066,.07,.06),dark)
 arms.extend(body[before:])
character_objects=list(body)
# Each weapon is an actual mesh, sharing the engineer's grip and rotation pivot.
def weapon(i):
 before=len(body)
 colors=[(.08,.65,.78),(.08,.8,.4),(.95,.5,.1),(.55,.25,.9),(.95,.03,.2),(.6,.3,.85),(.9,.08,.25),(.9,.35,.05),(.9,.65,.1),(.15,.6,.85),(.8,.15,.8),(.8,.07,.15)]
 power=mat('Weapon cell '+str(i),colors[i])
 if i in [4,5,10]:
  cube('Melee handle',(0,-.37,1.21),(.075,.42,.075),dark)
  if i==4:
   cube('Energy blade',(0,-.88,1.24),(.09,.7,.045),power);cube('Blade guard',(0,-.51,1.23),(.28,.05,.09),metal)
  else:
   cube('Heavy head',(0,-.79,1.24),(.46,.24,.22),metal)
   cube('Powered edge',(.24,-.79,1.24),(.055,.25,.25),power)
 else:
  length=[.36,.64,.68,.85,0,0,.46,.7,.75,.95,0,.48][i]
  cube('Receiver',(0,-.39,1.24),(.13,.28,.15),metal)
  cube('Power strip',(.073,-.39,1.255),(.018,.2,.045),power)
  cube('Grip',(0,-.29,1.13),(.075,.09,.2),dark)
  cube('Barrel',(0,-.43-length/2,1.26),(.07,length,.07),dark)
  if i in [7,8]:
   for dx in [-.07,.07]:cube('Heavy barrel',(dx,-.7,1.27),(.085,.55,.085),metal)
  if i in [3,9]:cube('Scope',(0,-.43,1.37),(.08,.28,.07),dark)
  if i!=0:cube('Magazine',(0,-.42,1.1),(.09,.13,.18),dark)
  cube('Muzzle',(0,-.44-length,1.26),(.11,.08,.11),metal)
 objs=body[before:]
 for o in objs:o.hide_render=True
 return objs
for i in range(12):weapons.append(weapon(i))
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=160;scene.render.resolution_y=160;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.4
scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH'
scene.display.shading.curvature_ridge_factor=1.3;scene.display.shading.curvature_valley_factor=1.1
scene.display.shading.show_specular_highlight=True
scene.world.color=(.18,.18,.18)
bpy.ops.object.camera_add(location=(0,-6,4.6));cam=bpy.context.object
cam.rotation_euler=(Vector((0,0,.95))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=2.65;scene.camera=cam
scene.view_settings.view_transform='Standard'
def render(name):
 scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
preview='--preview' in sys.argv
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'blender','engineer-3d.blend'))
for char in range(2):
 pants.diffuse_color=((.48,.025,.055,1) if char==0 else (.045,.065,.08,1))
 cloth.diffuse_color=((.8,.83,.78,1) if char==0 else (.07,.085,.095,1))
 trim.diffuse_color=((.62,.045,.05,1) if char==0 else (.95,.32,.045,1))
 hair.diffuse_color=((.095,.035,.018,1) if char==0 else (.46,.25,.075,1))
 for direction in range(16):
  root.rotation_euler.z=math.pi/2-direction*math.tau/16
  for frame in range(8):
   stride=0 if frame in [0,7] else math.sin((frame-1)*math.tau/6)*.48
   for k,leg in enumerate(legs):leg.rotation_euler.x=stride*(1 if k==0 else -1)
   # Reload pose draws the hands down to the magazine.
   for o in arms:o.location.z-=.13 if frame==7 else 0
   render('body-%d-%02d-%d'%(char,direction,frame))
   for o in arms:o.location.z+=.13 if frame==7 else 0
   if preview:break
  if preview:break
 if preview:break
for o in character_objects:o.hide_render=True
for i,objs in enumerate(weapons):
 for o in objs:o.hide_render=False
 for direction in range(16):
  root.rotation_euler.z=math.pi/2-direction*math.tau/16
  render('weapon-%02d-%02d'%(i,direction))
  if preview:break
 for o in objs:o.hide_render=True
 if preview:break
print('ENGINEER_RENDER_COMPLETE',flush=True)
