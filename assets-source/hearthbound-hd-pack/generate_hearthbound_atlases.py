#!/usr/bin/env python3
"""Generate original editable 4K voxel material atlases for Hearthbound Bosses."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
SIZE = 4096
TILE = 512
ATLAS_SPECS = [
    ("character-voxel-materials-4096.png", 1201, [(194,124,91),(63,112,83),(61,75,96),(122,82,53),(177,184,187),(216,190,120)], "PLAYER + BODY MATERIALS"),
    ("colonist-professions-4096.png", 2303, [(93,132,62),(63,101,139),(143,57,54),(105,83,62),(201,180,117),(82,111,122)], "COLONIST PROFESSIONS"),
    ("enemy-creature-voxel-materials-4096.png", 3407, [(54,71,57),(112,55,48),(52,42,78),(103,91,70),(42,91,102),(116,69,87)], "ENEMIES + CREATURES"),
    ("boss-rune-materials-4096.png", 4513, [(105,101,91),(218,166,70),(139,46,39),(239,105,55),(53,38,79),(174,116,225)], "BOSS RUNES + TROPHIES"),
    ("housing-furniture-materials-4096.png", 5623, [(150,95,51),(111,70,41),(137,58,69),(215,196,159),(79,48,31),(202,143,79)], "HOUSING + FURNITURE"),
    ("advanced-weapon-materials-4096.png", 6731, [(157,166,171),(74,83,88),(195,151,62),(120,64,45),(75,55,91),(210,102,58)], "WEAPONS + BOSS LOOT"),
]

def atlas_array(seed, colors):
    rng = np.random.default_rng(seed)
    image = np.zeros((SIZE, SIZE, 3), dtype=np.uint8)
    yy, xx = np.indices((TILE, TILE), dtype=np.int32)
    for ty in range(8):
        for tx in range(8):
            base = np.array(colors[(tx + ty * 3) % len(colors)], dtype=np.int16)
            local_seed = seed + tx * 97 + ty * 193
            local_rng = np.random.default_rng(local_seed)
            coarse = local_rng.integers(-18, 19, size=(64,64,1), dtype=np.int16)
            coarse = np.repeat(np.repeat(coarse, 8, axis=0), 8, axis=1)
            fine = local_rng.integers(-8, 9, size=(TILE,TILE,1), dtype=np.int16)
            checker = (((xx // (8 + (tx % 3) * 4)) + (yy // (8 + (ty % 3) * 4))) % 2)[...,None] * 7 - 3
            grain = coarse + fine + checker
            tile = np.clip(base.reshape(1,1,3) + grain, 0, 255)
            # Pixel seams, edge wear and authored stripe motifs.
            tile[(xx % 64) < 2] = np.clip(tile[(xx % 64) < 2] - 22, 0, 255)
            tile[(yy % 64) < 2] = np.clip(tile[(yy % 64) < 2] - 22, 0, 255)
            diagonal = ((xx + yy + tx * 13 + ty * 19) % (96 + (tx % 4) * 16)) < 3
            tile[diagonal] = np.clip(tile[diagonal] + 28, 0, 255)
            # Small rune/rivet pixels.
            for _ in range(120):
                rx = int(local_rng.integers(8, TILE-12)); ry = int(local_rng.integers(8, TILE-12))
                rw = int(local_rng.choice([2,3,4,6,8])); rh = int(local_rng.choice([2,3,4,6]))
                delta = int(local_rng.choice([-34,-22,22,36]))
                tile[ry:ry+rh, rx:rx+rw] = np.clip(tile[ry:ry+rh, rx:rx+rw] + delta, 0, 255)
            image[ty*TILE:(ty+1)*TILE, tx*TILE:(tx+1)*TILE] = tile.astype(np.uint8)
    return image

manifest = {"pack":"Voxel Frontier Hearthbound HD","version":"20.0.0","resolution":4096,"tileSize":512,"atlases":[]}
font = ImageFont.load_default()
for filename, seed, colors, title in ATLAS_SPECS:
    array = atlas_array(seed, colors)
    image = Image.fromarray(array, "RGB")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0,0,SIZE-1,SIZE-1), outline=(236,220,177), width=8)
    for n in range(1,8):
        draw.line((n*TILE,0,n*TILE,SIZE), fill=(20,20,22), width=4)
        draw.line((0,n*TILE,SIZE,n*TILE), fill=(20,20,22), width=4)
    draw.rectangle((24,24,1030,86), fill=(12,12,16))
    draw.text((42,45), f"{title} · ORIGINAL 4K SOURCE ATLAS", font=font, fill=(255,241,200))
    output = OUT / filename
    image.save(output, format="PNG", compress_level=3)
    manifest["atlases"].append({"file":filename,"seed":seed,"title":title,"tiles":64,"bytes":output.stat().st_size})
    del image, array

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(OUT / "README.txt").write_text(
    "Voxel Frontier Hearthbound HD source pack\n"
    "Six original editable 4096x4096 voxel atlases for player/colonist/enemy/boss/furniture/weapon materials.\n"
    "Generated deterministically by generate_hearthbound_atlases.py. These are source assets and are not copied from another game.\n"
)
print(json.dumps(manifest, indent=2))
