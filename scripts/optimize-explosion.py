"""Compact the supplied Sparks/explosion GLB, retaining its authored spark cards."""
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image, ImageEnhance

data = Path(sys.argv[1]).read_bytes()
size = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20 + size])
source = data[28 + size:]
chunks, views, accessors = [], [], []
length = 0


def append(payload, original=None):
    global length
    padding = (-length) % 4
    chunks.append(b'\0' * padding)
    length += padding
    view = dict(original or {})
    view.update(buffer=0, byteOffset=length, byteLength=len(payload))
    views.append(view)
    chunks.append(payload)
    length += len(payload)
    return len(views) - 1


def compact_accessor(index):
    accessor = dict(doc['accessors'][index])
    view = doc['bufferViews'][accessor['bufferView']]
    start = view.get('byteOffset', 0)
    accessor['bufferView'] = append(source[start:start + view['byteLength']], view)
    accessors.append(accessor)
    return len(accessors) - 1


for mesh in doc['meshes']:
    for primitive in mesh['primitives']:
        primitive['attributes'] = {
            key: compact_accessor(index)
            for key, index in primitive['attributes'].items()
            if key in ('POSITION', 'TEXCOORD_0', 'COLOR_0')
        }
        primitive['indices'] = compact_accessor(primitive['indices'])

view = doc['bufferViews'][doc['images'][0]['bufferView']]
start = view.get('byteOffset', 0)
image = Image.open(io.BytesIO(source[start:start + view['byteLength']]))
# Bake the source emissive channel into the unlit texture before removing it.
emission_view = doc['bufferViews'][doc['images'][1]['bufferView']]
emission_start = emission_view.get('byteOffset', 0)
emission = Image.open(io.BytesIO(source[emission_start:emission_start + emission_view['byteLength']]))
emission = ImageEnhance.Brightness(emission.convert('RGB')).enhance(2.4).convert('RGBA')
emission.putalpha(image.getchannel('A'))
image = emission
image.thumbnail((512, 512), Image.Resampling.LANCZOS)
encoded = io.BytesIO()
image.save(encoded, format='PNG', optimize=True)
doc['images'] = [{'bufferView': append(encoded.getvalue()), 'mimeType': 'image/png'}]
doc['textures'] = [dict(doc['textures'][0], source=0)]
for material in doc['materials']:
    material.pop('emissiveTexture', None)
    material.pop('emissiveFactor', None)
    material['extensions'] = {'KHR_materials_unlit': {}}
doc['extensionsUsed'] = ['KHR_materials_unlit']
doc.pop('extensionsRequired', None)
doc['accessors'], doc['bufferViews'] = accessors, views
doc['buffers'] = [{'byteLength': length}]
binary = b''.join(chunks) + b'\0' * ((-length) % 4)
encoded_json = json.dumps(doc, separators=(',', ':')).encode()
encoded_json += b' ' * ((-len(encoded_json)) % 4)
result = (struct.pack('<5I', 0x46546c67, 2, 28 + len(encoded_json) + len(binary),
                      len(encoded_json), 0x4e4f534a) + encoded_json
          + struct.pack('<2I', len(binary), 0x004e4942) + binary)
Path(sys.argv[2]).write_bytes(result)
print(f'{len(data)} -> {len(result)} bytes')
