"""Bake a textured scan (glTF/GLB/OBJ) into the walk's point file.

Samples the surface by area, takes each point's colour from the texture, and
packs the result small: positions as 16-bit fractions of the bounding box,
colours as bytes.

    python3 scripts/walk_points.py in.glb out.bin --count 400000

File layout, little-endian:
    b"PTS1", uint32 count, float32 min[3], float32 max[3],
    uint16 positions[count * 3], uint8 colours[count * 3]
"""
import argparse
import struct

import numpy as np
import trimesh


def colours_for(mesh, faces, points):
    """The colour under each sampled point: texture, then vertex colour,
    then the material's flat colour, then grey."""
    visual = mesh.visual
    if visual.kind == 'texture' and visual.uv is not None:
        material = visual.material
        image = getattr(material, 'baseColorTexture', None) or getattr(material, 'image', None)
        if image is not None:
            bary = trimesh.triangles.points_to_barycentric(mesh.triangles[faces], points)
            uv = (visual.uv[mesh.faces[faces]] * bary[:, :, None]).sum(axis=1)
            pixels = np.asarray(image.convert('RGB'))
            h, w = pixels.shape[:2]
            x = (np.mod(uv[:, 0], 1) * (w - 1)).astype(int)
            y = ((1 - np.mod(uv[:, 1], 1)) * (h - 1)).astype(int)
            colours = pixels[y, x].astype(np.float32)
            factor = getattr(material, 'baseColorFactor', None)
            if factor is not None:
                colours *= np.asarray(factor[:3], dtype=np.float32) / (255.0 if max(factor[:3]) > 1 else 1.0)
            return np.clip(colours, 0, 255).astype(np.uint8)
    if visual.kind == 'vertex':
        bary = trimesh.triangles.points_to_barycentric(mesh.triangles[faces], points)
        vertex = visual.vertex_colors[:, :3].astype(np.float32)
        return np.clip((vertex[mesh.faces[faces]] * bary[:, :, None]).sum(axis=1), 0, 255).astype(np.uint8)
    main = getattr(getattr(visual, 'material', None), 'main_color', None)
    grey = np.asarray(main[:3] if main is not None else (128, 128, 128), dtype=np.uint8)
    return np.tile(grey, (len(points), 1))


def sample(path, count, seed=1):
    loaded = trimesh.load(path, force='scene')
    meshes = [m for m in loaded.dump() if isinstance(m, trimesh.Trimesh) and len(m.faces)]
    areas = np.array([m.area for m in meshes])
    shares = np.maximum(1, np.round(areas / areas.sum() * count)).astype(int)
    positions, colours = [], []
    for index, (mesh, n) in enumerate(zip(meshes, shares)):
        points, faces = trimesh.sample.sample_surface(mesh, int(n), seed=seed + index)
        positions.append(points)
        colours.append(colours_for(mesh, faces, points))
    return np.concatenate(positions).astype(np.float32), np.concatenate(colours)


def noise(points, scale, seed):
    """Smooth 3D value noise in 0..1, so dropouts and ghosts come in
    patches the way a scanner's misses do, not as even static."""
    p = points / scale
    cell = np.floor(p).astype(np.int64)
    f = p - cell
    f = f * f * (3 - 2 * f)

    def corner(dx, dy, dz):
        h = (cell[:, 0] + dx) * 73856093 ^ (cell[:, 1] + dy) * 19349663 ^ (cell[:, 2] + dz) * 83492791 ^ seed * 2654435761
        h = (h ^ (h >> 13)) * 1274126177
        return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0

    x0 = corner(0, 0, 0) * (1 - f[:, 0]) + corner(1, 0, 0) * f[:, 0]
    x1 = corner(0, 1, 0) * (1 - f[:, 0]) + corner(1, 1, 0) * f[:, 0]
    x2 = corner(0, 0, 1) * (1 - f[:, 0]) + corner(1, 0, 1) * f[:, 0]
    x3 = corner(0, 1, 1) * (1 - f[:, 0]) + corner(1, 1, 1) * f[:, 0]
    y0 = x0 * (1 - f[:, 1]) + x1 * f[:, 1]
    y1 = x2 * (1 - f[:, 1]) + x3 * f[:, 1]
    return y0 * (1 - f[:, 2]) + y1 * f[:, 2]


def break_up(positions, colours, scanners, seed=1, amount=1.0):
    """Make a clean sample read like a real capture with its faults:
    patches the scanner never saw, thin patches, depth error growing with
    distance from the nearest scan position, stray points flung along the
    line of sight, a second pass registered a few centimetres off, and
    exposure that shifts from patch to patch."""
    rng = np.random.default_rng(seed)
    n = len(positions)
    keep = noise(positions, 0.45, seed) > 0.28 * amount
    sparse = noise(positions, 1.3, seed + 1) < 0.35
    keep &= ~(sparse & (rng.random(n) < 0.6 * amount))
    positions, colours = positions[keep], colours[keep].astype(np.float32)
    n = len(positions)

    scanners = np.asarray(scanners, dtype=np.float32)
    nearest = scanners[np.argmin(((positions[:, None, :] - scanners[None]) ** 2).sum(-1), axis=1)]
    ray = positions - nearest
    distance = np.linalg.norm(ray, axis=1, keepdims=True)
    ray /= np.maximum(distance, 1e-6)
    depth = rng.normal(0, 0.004 + 0.006 * distance, (n, 1)) * amount
    flyers = rng.random((n, 1)) < 0.012 * amount
    depth += flyers * rng.uniform(0.05, 0.6, (n, 1)) * np.sign(rng.normal(size=(n, 1)))
    positions = positions + ray * depth

    exposure = 0.82 + 0.36 * noise(positions, 2.0, seed + 2)
    colours *= exposure[:, None]

    ghosted = (noise(positions, 1.6, seed + 3) > 0.62) & (rng.random(n) < 0.5 * amount)
    shift = np.array([0.025, 0.012, 0.04], dtype=np.float32) * amount
    ghosts = positions[ghosted] + shift
    ghost_colours = colours[ghosted] * 0.8
    positions = np.concatenate([positions, ghosts])
    colours = np.concatenate([colours, ghost_colours])
    return positions.astype(np.float32), np.clip(colours, 0, 255).astype(np.uint8)


def write(path, positions, colours):
    low, high = positions.min(axis=0), positions.max(axis=0)
    span = np.where(high - low > 0, high - low, 1)
    quantised = np.round((positions - low) / span * 65535).astype('<u2')
    with open(path, 'wb') as out:
        out.write(b'PTS1')
        out.write(struct.pack('<I6f', len(positions), *low, *high))
        out.write(quantised.tobytes())
        out.write(colours.astype(np.uint8).tobytes())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('target')
    parser.add_argument('--count', type=int, default=400000)
    parser.add_argument('--seed', type=int, default=1)
    args = parser.parse_args()
    positions, colours = sample(args.source, args.count, args.seed)
    write(args.target, positions, colours)
    low, high = positions.min(axis=0), positions.max(axis=0)
    print(f'{len(positions)} points, bounds {np.round(low, 2)} to {np.round(high, 2)}')
