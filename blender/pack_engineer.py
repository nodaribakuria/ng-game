from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent.parent
frames=root/'blender'/'engineer-frames'
out=root/'assets'
for char,name in enumerate(['red','orange']):
 atlas=Image.new('RGBA',(160*16,160*8))
 for direction in range(16):
  for frame in range(8):
   im=Image.open(frames/f'body-{char}-{direction:02d}-{frame}.png').convert('RGBA')
   assert im.getbbox(), 'Empty character frame'
   atlas.paste(im,(direction*160,frame*160))
 atlas.save(out/f'engineer-3d-{name}.png',optimize=True)
atlas=Image.new('RGBA',(160*16,160*12))
for weapon in range(12):
 for direction in range(16):
  im=Image.open(frames/f'weapon-{weapon:02d}-{direction:02d}.png').convert('RGBA')
  assert im.getbbox(), 'Empty weapon frame'
  atlas.paste(im,(direction*160,weapon*160))
atlas.save(out/'weapons-3d.png',optimize=True)
print('Packed 448 Blender renders into three game atlases')
