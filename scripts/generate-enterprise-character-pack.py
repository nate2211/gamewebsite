#!/usr/bin/env python3
"""Generate original stylized voxel/RuneScape-inspired character source assets.

The generated 2K maps are source-quality assets. The browser runtime keeps using
compact procedural materials so loading remains fast, while artists can bake or
compress these atlases into future GLB/texture releases.
"""
from __future__ import annotations

import base64
import json
import math
import os
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets-source" / "enterprise-character-pack"
PUBLIC = ROOT / "public" / "assets" / "enterprise-character-pack"
MAPS = PACK / "maps-2k"
MODELS = PACK / "models-gltf"
PREVIEWS = PUBLIC / "previews"

SUBJECTS = {
    "frontier_player": ((62, 123, 82), (199, 138, 99), (59, 70, 86)),
    "colony_guard": ((125, 50, 48), (202, 158, 112), (146, 153, 160)),
    "colony_worker": ((102, 122, 61), (213, 174, 126), (91, 69, 47)),
    "dire_wolf": ((91, 103, 111), (175, 185, 190), (53, 61, 66)),
    "iron_golem": ((149, 148, 132), (77, 126, 83), (93, 91, 82)),
    "undead_raider": ((47, 91, 70), (74, 95, 132), (102, 66, 48)),
    "frontier_livestock": ((139, 91, 61), (231, 218, 192), (79, 53, 38)),
}

MODEL_PARTS = {
    "frontier_player": "biped",
    "colony_guard": "biped",
    "colony_worker": "biped",
    "dire_wolf": "quadruped",
    "iron_golem": "golem",
    "undead_raider": "biped",
    "frontier_livestock": "quadruped",
}


def noise_field(seed: int, size: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    fine = rng.random((size, size), dtype=np.float32)
    coarse_size = max(8, size // 32)
    coarse = rng.random((coarse_size, coarse_size), dtype=np.float32)
    coarse_img = Image.fromarray(np.uint8(coarse * 255), "L").resize((size, size), Image.Resampling.BICUBIC)
    coarse_arr = np.asarray(coarse_img, dtype=np.float32) / 255.0
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    weave = (np.sin(x * 0.23) + np.cos(y * 0.19) + np.sin((x + y) * 0.075)) / 6.0 + 0.5
    return np.clip(fine * 0.47 + coarse_arr * 0.38 + weave * 0.15, 0, 1)


def make_diffuse(subject: str, palette: tuple[tuple[int, int, int], ...], size: int = 2048) -> np.ndarray:
    seed = int.from_bytes(subject.encode("utf-8"), "little") % (2**32)
    n = noise_field(seed, size)
    y, x = np.mgrid[0:size, 0:size]
    tile = ((x // 128) + (y // 128)) % len(palette)
    arr = np.zeros((size, size, 3), dtype=np.float32)
    for idx, color in enumerate(palette):
        mask = tile == idx
        base = np.array(color, dtype=np.float32)
        variation = (n[mask, None] - 0.5) * 72
        arr[mask] = np.clip(base + variation, 0, 255)
    seams = ((x % 128) < 4) | ((y % 128) < 4)
    arr[seams] *= 0.56
    highlights = (((x + y) % 257) < 3) & (n > 0.65)
    arr[highlights] = np.clip(arr[highlights] + 48, 0, 255)
    # High-frequency fibers and chipped edges preserve source detail and make the
    # maps useful for downsampling, normal generation, and material baking.
    rng = np.random.default_rng(seed + 99)
    scratches = rng.random((size, size)) > 0.994
    arr[scratches] = np.clip(arr[scratches] * 0.45 + 20, 0, 255)
    return np.uint8(arr)


def make_normal(subject: str, size: int = 2048) -> np.ndarray:
    seed = (int.from_bytes(subject.encode("utf-8"), "little") + 1337) % (2**32)
    h = noise_field(seed, size)
    dy, dx = np.gradient(h)
    strength = 6.5
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(h)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack((nx / length, ny / length, nz / length), axis=-1)
    return np.uint8(np.clip(normal * 0.5 + 0.5, 0, 1) * 255)


def make_orm(subject: str, size: int = 2048) -> np.ndarray:
    seed = (int.from_bytes(subject.encode("utf-8"), "little") + 7777) % (2**32)
    a = noise_field(seed, size)
    b = noise_field(seed + 1, size)
    c = noise_field(seed + 2, size)
    occlusion = np.uint8(np.clip(0.55 + a * 0.45, 0, 1) * 255)
    roughness = np.uint8(np.clip(0.34 + b * 0.58, 0, 1) * 255)
    metallic = np.uint8(np.where(c > 0.91, 150 + c * 105, c * 22))
    return np.stack((occlusion, roughness, metallic), axis=-1)


def save_png(array: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(array, "RGB").save(path, format="PNG", compress_level=1, optimize=False)


def make_preview(subject: str, diffuse: np.ndarray, normal: np.ndarray, orm: np.ndarray) -> None:
    canvas = Image.new("RGB", (1024, 640), (16, 24, 23))
    for index, array in enumerate((diffuse, normal, orm)):
        image = Image.fromarray(array, "RGB").resize((320, 512), Image.Resampling.LANCZOS)
        canvas.paste(image, (16 + index * 336, 76))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1024, 62), fill=(8, 14, 13))
    draw.text((24, 18), subject.replace("_", " ").upper(), fill=(236, 241, 221))
    draw.text((24, 600), "DIFFUSE                     NORMAL                       ORM", fill=(178, 196, 174))
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    canvas.save(PREVIEWS / f"{subject}-material-preview.jpg", quality=90, subsampling=0)


def align4(buffer: bytearray) -> None:
    while len(buffer) % 4:
        buffer.append(0)


def append_data(buffer: bytearray, views: list[dict], raw: bytes, target: int | None = None) -> int:
    align4(buffer)
    offset = len(buffer)
    buffer.extend(raw)
    view = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw)}
    if target is not None:
        view["target"] = target
    views.append(view)
    return len(views) - 1


def cube_geometry() -> tuple[list[float], list[float], list[int]]:
    # 24 vertices so each face has stable hard normals.
    faces = [
        ((0, 0, -1), [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, .5, -.5), (-.5, .5, -.5)]),
        ((0, 0, 1), [(.5, -.5, .5), (-.5, -.5, .5), (-.5, .5, .5), (.5, .5, .5)]),
        ((-1, 0, 0), [(-.5, -.5, .5), (-.5, -.5, -.5), (-.5, .5, -.5), (-.5, .5, .5)]),
        ((1, 0, 0), [(.5, -.5, -.5), (.5, -.5, .5), (.5, .5, .5), (.5, .5, -.5)]),
        ((0, -1, 0), [(-.5, -.5, .5), (.5, -.5, .5), (.5, -.5, -.5), (-.5, -.5, -.5)]),
        ((0, 1, 0), [(-.5, .5, -.5), (.5, .5, -.5), (.5, .5, .5), (-.5, .5, .5)]),
    ]
    positions: list[float] = []
    normals: list[float] = []
    indices: list[int] = []
    for face_index, (normal, verts) in enumerate(faces):
        base = face_index * 4
        for vertex in verts:
            positions.extend(vertex)
            normals.extend(normal)
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])
    return positions, normals, indices


def quaternion_x(angle: float) -> tuple[float, float, float, float]:
    return (math.sin(angle / 2), 0.0, 0.0, math.cos(angle / 2))


def part_layout(kind: str) -> list[dict]:
    if kind == "quadruped":
        return [
            {"name": "body", "t": [0, 0.8, 0], "s": [1.3, 0.7, 1.8], "m": 0},
            {"name": "head", "t": [0, 1.05, -1.2], "s": [0.72, 0.72, 0.82], "m": 1},
            {"name": "leg_fl", "t": [-0.44, 0.24, -0.62], "s": [0.22, 0.72, 0.22], "m": 2},
            {"name": "leg_fr", "t": [0.44, 0.24, -0.62], "s": [0.22, 0.72, 0.22], "m": 2},
            {"name": "leg_bl", "t": [-0.44, 0.24, 0.62], "s": [0.22, 0.72, 0.22], "m": 2},
            {"name": "leg_br", "t": [0.44, 0.24, 0.62], "s": [0.22, 0.72, 0.22], "m": 2},
            {"name": "tail", "t": [0, 0.92, 1.18], "s": [0.18, 0.18, 0.9], "m": 1},
        ]
    scale = 1.28 if kind == "golem" else 1.0
    return [
        {"name": "torso", "t": [0, 1.35 * scale, 0], "s": [0.9 * scale, 1.05 * scale, 0.48 * scale], "m": 0},
        {"name": "head", "t": [0, 2.35 * scale, 0], "s": [0.72 * scale, 0.72 * scale, 0.68 * scale], "m": 1},
        {"name": "arm_l", "t": [-0.65 * scale, 1.42 * scale, 0], "s": [0.28 * scale, 1.02 * scale, 0.32 * scale], "m": 2},
        {"name": "arm_r", "t": [0.65 * scale, 1.42 * scale, 0], "s": [0.28 * scale, 1.02 * scale, 0.32 * scale], "m": 2},
        {"name": "leg_l", "t": [-0.25 * scale, 0.52 * scale, 0], "s": [0.34 * scale, 0.98 * scale, 0.38 * scale], "m": 2},
        {"name": "leg_r", "t": [0.25 * scale, 0.52 * scale, 0], "s": [0.34 * scale, 0.98 * scale, 0.38 * scale], "m": 2},
        {"name": "belt", "t": [0, 0.93 * scale, 0], "s": [0.98 * scale, 0.16 * scale, 0.52 * scale], "m": 2},
    ]


def generate_gltf(subject: str, kind: str, palette: tuple[tuple[int, int, int], ...]) -> None:
    positions, normals, indices = cube_geometry()
    buffer = bytearray()
    views: list[dict] = []
    accessors: list[dict] = []

    pos_view = append_data(buffer, views, struct.pack(f"<{len(positions)}f", *positions), 34962)
    norm_view = append_data(buffer, views, struct.pack(f"<{len(normals)}f", *normals), 34962)
    idx_view = append_data(buffer, views, struct.pack(f"<{len(indices)}H", *indices), 34963)
    accessors.extend([
        {"bufferView": pos_view, "componentType": 5126, "count": len(positions) // 3, "type": "VEC3", "min": [-.5, -.5, -.5], "max": [.5, .5, .5]},
        {"bufferView": norm_view, "componentType": 5126, "count": len(normals) // 3, "type": "VEC3"},
        {"bufferView": idx_view, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
    ])

    materials = []
    meshes = []
    for idx, rgb in enumerate(palette):
        materials.append({
            "name": f"{subject}_material_{idx}",
            "pbrMetallicRoughness": {
                "baseColorFactor": [c / 255 for c in rgb] + [1],
                "metallicFactor": 0.08 if "golem" not in subject else 0.34,
                "roughnessFactor": 0.72,
            },
        })
        meshes.append({"name": f"cube_palette_{idx}", "primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": idx}]})

    parts = part_layout(kind)
    nodes = [{"name": f"{subject}_root", "children": list(range(1, len(parts) + 1))}]
    part_node_indices = {}
    for index, part in enumerate(parts, start=1):
        nodes.append({"name": part["name"], "mesh": part["m"], "translation": part["t"], "scale": part["s"]})
        part_node_indices[part["name"]] = index

    animations = []
    times = [0.0, 0.25, 0.5, 0.75, 1.0]
    clips = {
        "idle": 0.08,
        "walk": 0.72,
        "run": 1.12,
        "attack": 1.55,
        "mine": 1.28,
        "build": 0.95,
        "hurt": 0.42,
        "death": 1.48,
    }
    limb_names = [name for name in part_node_indices if name.startswith("arm_") or name.startswith("leg_")]
    if not limb_names:
        limb_names = [name for name in part_node_indices if name.startswith("leg_")]
    for clip_name, amplitude in clips.items():
        time_view = append_data(buffer, views, struct.pack(f"<{len(times)}f", *times))
        time_accessor = len(accessors)
        accessors.append({"bufferView": time_view, "componentType": 5126, "count": len(times), "type": "SCALAR", "min": [0], "max": [1]})
        samplers = []
        channels = []
        for limb_index, limb in enumerate(limb_names):
            rotations = []
            for step, t in enumerate(times):
                phase = math.sin(t * math.pi * 2 + (limb_index % 2) * math.pi)
                angle = phase * amplitude
                if clip_name == "death":
                    angle = t * amplitude * (1 if limb_index % 2 == 0 else -0.55)
                elif clip_name in {"attack", "mine", "build"} and ("arm_r" in limb or limb_index == 1):
                    angle = -math.sin(t * math.pi) * amplitude
                rotations.extend(quaternion_x(angle))
            rotation_view = append_data(buffer, views, struct.pack(f"<{len(rotations)}f", *rotations))
            rotation_accessor = len(accessors)
            accessors.append({"bufferView": rotation_view, "componentType": 5126, "count": len(times), "type": "VEC4"})
            sampler_index = len(samplers)
            samplers.append({"input": time_accessor, "output": rotation_accessor, "interpolation": "LINEAR"})
            channels.append({"sampler": sampler_index, "target": {"node": part_node_indices[limb], "path": "rotation"}})
        animations.append({"name": clip_name, "samplers": samplers, "channels": channels})

    encoded = base64.b64encode(bytes(buffer)).decode("ascii")
    gltf = {
        "asset": {"version": "2.0", "generator": "Voxel Frontier Enterprise Character Pack Generator"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "animations": animations,
        "buffers": [{"uri": f"data:application/octet-stream;base64,{encoded}", "byteLength": len(buffer)}],
        "bufferViews": views,
        "accessors": accessors,
        "extras": {
            "style": "original block-sculpted low-poly frontier fantasy",
            "runtimeTarget": "Three.js / React Three Fiber",
            "animationClips": list(clips),
        },
    }
    MODELS.mkdir(parents=True, exist_ok=True)
    (MODELS / f"{subject}.gltf").write_text(json.dumps(gltf, separators=(",", ":")))


def main() -> None:
    MAPS.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    manifest = {
        "name": "Voxel Frontier Enterprise Character Pack",
        "version": 1,
        "license": "Original project assets generated for this release",
        "maps": {},
        "models": {},
        "notes": [
            "2K source maps are intentionally not loaded by default in the browser build.",
            "Runtime procedural models use the same palettes and animation vocabulary.",
            "Downsample/compress maps before shipping them to constrained devices.",
        ],
    }
    for index, (subject, palette) in enumerate(SUBJECTS.items()):
        print(f"[{index + 1}/{len(SUBJECTS)}] generating {subject}", flush=True)
        diffuse = make_diffuse(subject, palette)
        normal = make_normal(subject)
        orm = make_orm(subject)
        paths = {
            "diffuse": MAPS / f"{subject}_diffuse_2k.png",
            "normal": MAPS / f"{subject}_normal_2k.png",
            "orm": MAPS / f"{subject}_orm_2k.png",
        }
        save_png(diffuse, paths["diffuse"])
        save_png(normal, paths["normal"])
        save_png(orm, paths["orm"])
        make_preview(subject, diffuse, normal, orm)
        generate_gltf(subject, MODEL_PARTS[subject], palette)
        manifest["maps"][subject] = {kind: str(path.relative_to(PACK)).replace(os.sep, "/") for kind, path in paths.items()}
        manifest["models"][subject] = f"models-gltf/{subject}.gltf"
    (PACK / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (PACK / "README.md").write_text(
        "# Enterprise Character Source Pack\n\n"
        "Original 2K diffuse, tangent-space normal, and ORM maps plus valid glTF 2.0 block-sculpted models. "
        "Each model contains idle, walk, run, attack, mine, build, hurt, and death clips. The shipped browser runtime "
        "uses compact procedural versions for performance, while these files are retained for art iteration and future GLB baking.\n"
    )
    print("Generated", PACK)


if __name__ == "__main__":
    main()
