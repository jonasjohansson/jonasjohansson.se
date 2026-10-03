"""Build the walk's metro carriage from downloaded scans.

    python3 scripts/walk_scene.py SCANS_DIR

SCANS_DIR holds the Sketchfab downloads (metro.glb, man.glb, aya.glb) and
kana_posed.glb, Kana posed on her animation by scripts/walk_pose.py. Writes
walk/carriage-1.pts and -2.pts (one segment of carriage, repeated by the
page), walk/people-1.pts and -2.pts (the passengers, in place), and
walk/scene.json (where the segment repeats, where each stop's screen is
held, and which way it faces). Phones load only the -1 files.

Sources, all CC BY on Sketchfab, credited on the page:
  Moscow metro 81-714 car interior, trolleway
  Free 018 Kana Sitting, endonoriko
  Free 091 Aya, endonoriko
  A man sitting, 1056878
"""
import glob
import hashlib
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from walk_points import break_up, sample, write  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'walk')
FLOOR = 0.0
SEGMENT = 6.6  # metres of carriage the scan covers well
COPIES = 3


def carriage(scans):
    """The scan levelled (it was captured on a 7 degree slope), scaled to
    metres (one unit is 8.6 cm, from the 2.18 m floor to ceiling), the aisle
    on x = 0, the floor at y = 0, cut to the stretch the scan covers well
    and running from z = 0 toward -z."""
    p, c = sample(os.path.join(scans, 'metro.glb'), 2400000, seed=5, max_edge=2.5)
    theta = np.arctan(0.124)
    p[:, 0] -= -14.9
    y, z = p[:, 1].copy(), p[:, 2].copy()
    p[:, 1] = y * np.cos(theta) - z * np.sin(theta)
    p[:, 2] = y * np.sin(theta) + z * np.cos(theta)
    p *= 0.086
    p[:, 1] -= -0.288
    keep = (p[:, 2] > -5.6) & (p[:, 2] < 1.0) & (p[:, 1] > -0.4) & (p[:, 1] < 2.6) & (np.abs(p[:, 0]) < 2.2)
    p, c = p[keep], c[keep]
    p[:, 2] -= 1.0
    return p, c


# Each passenger: the scan, its scale to metres, which bench, how far along,
# what it holds, and how much to lift a dark scan's exposure.
PEOPLE = [
    {'stop': 'about', 'file': 'kana_posed.glb', 'scale': 0.01, 'side': -1, 'z': -3.4, 'pose': 'paper', 'exposure': 1.0},
    {'stop': 'cv', 'file': 'man.glb', 'scale': 0.52, 'side': 1, 'z': -10.2, 'pose': 'laptop', 'exposure': 1.8},
    {'stop': 'contact', 'file': 'aya.glb', 'scale': 0.001, 'side': -1, 'z': -16.4, 'pose': 'phone', 'exposure': 1.0},
]


def own_facing(p):
    """Which way a seated scan faces in its own file: its knees reach
    forward of its hips."""
    low, high = p[:, 1].min(), p[:, 1].max()
    span = high - low
    legs = p[(p[:, 1] > low + span * 0.15) & (p[:, 1] < low + span * 0.4)]
    torso = p[(p[:, 1] > low + span * 0.55) & (p[:, 1] < low + span * 0.8)]
    d = legs.mean(axis=0) - torso.mean(axis=0)
    return np.arctan2(d[0], d[2])
BENCH = {-1: -0.92, 1: 1.06}  # where a sitter's hips are, across the aisle
SIZES = {'paper': [0.56, 0.4], 'laptop': [0.34, 0.22], 'phone': [0.075, 0.155]}
TILT = {'paper': 0.35, 'laptop': 0.25, 'phone': 0.5}


def person(scans, spec):
    p, c = sample(os.path.join(scans, spec['file']), 160000, seed=9)
    p *= spec['scale']
    c = np.clip(c.astype(np.float32) * spec['exposure'], 0, 255).astype(np.uint8)
    # Turn to face across the aisle, then a little down the carriage, so
    # the camera can come up behind them from the aisle.
    across = -spec['side']
    facing = np.arctan2(across * 0.6, -0.8)
    yaw = facing - own_facing(p)
    rot = np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]])
    centre = np.array([np.median(p[:, 0]), p[:, 1].min(), np.median(p[:, 2])])
    p = (p - centre) @ rot.T
    p += [BENCH[spec['side']], FLOOR, spec['z']]
    forward = np.array([np.sin(facing), 0, np.cos(facing)])

    # The hands: skin a reach in front of the body, below the head.
    skin = (c[:, 0].astype(int) > 120) & (c[:, 0].astype(int) > c[:, 2].astype(int) + 15)
    height = p[:, 1].max()
    reach = (p - [BENCH[spec['side']], 0, spec['z']]) @ forward
    body = skin & (p[:, 1] < height - 0.25) & (p[:, 1] > 0.45)
    front = body & (reach > np.percentile(reach[body], 80))
    hands = p[front].mean(axis=0) if front.any() else p[body].mean(axis=0)
    if spec['pose'] == 'paper':
        # A paper is held open between both hands: the middle of the two.
        right_axis = np.array([np.cos(facing), 0, -np.sin(facing)])
        across_body = (p - [BENCH[spec['side']], 0, spec['z']]) @ right_axis
        left_hand = p[front & (across_body < np.median(across_body[front]))].mean(axis=0)
        right_hand = p[front & (across_body >= np.median(across_body[front]))].mean(axis=0)
        hands = (left_hand + right_hand) / 2
    if spec['pose'] == 'phone':
        # Aya's raised hand: the highest skin below her head.
        raised = body & (p[:, 1] > np.percentile(p[body][:, 1], 85))
        hands = p[raised].mean(axis=0)
    lift = {'paper': 0.06, 'laptop': 0.13, 'phone': 0.04}[spec['pose']]
    ahead = {'paper': 0.06, 'laptop': 0.1, 'phone': 0.05}[spec['pose']]
    screen = hands + [0, lift, 0] + forward * ahead
    # Over the shoulder on the aisle side, up and back from the hands.
    right = np.array([np.cos(facing), 0, -np.sin(facing)])
    side = 1 if np.sign(right[0]) == -spec['side'] else -1
    over = right * side * 0.55 + np.array([0, 0.32, 0]) - forward * 0.7
    over /= np.linalg.norm(over)
    anchor = {
        'stop': spec['stop'], 'pose': spec['pose'],
        'position': [round(float(v), 4) for v in screen],
        'facing': round(float(facing), 4), 'tilt': TILT[spec['pose']], 'size': SIZES[spec['pose']],
        'over': [round(float(v), 4) for v in over],
    }
    return p, c, anchor


def write_split(name, p, c, seed, share=0.4):
    """Two files: a random share of the points, which phones stop at, and
    the rest, which larger screens add. Each name carries a fingerprint of
    its contents, so a browser holding an older bake cannot mix it in."""
    for old in glob.glob(os.path.join(OUT, f'{name}-*.pts')):
        os.remove(old)
    first = np.random.default_rng(seed).random(len(p)) < share
    names = []
    for part, keep in enumerate([first, ~first], start=1):
        path = os.path.join(OUT, f'{name}-{part}.pts')
        write(path, p[keep], c[keep])
        with open(path, 'rb') as baked:
            fingerprint = hashlib.sha1(baked.read()).hexdigest()[:10]
        named = f'{name}-{part}.{fingerprint}.pts'
        os.replace(path, os.path.join(OUT, named))
        names.append(named)
    return names


def main(scans):
    os.makedirs(OUT, exist_ok=True)
    # The scanner stood in the aisle every couple of metres.
    scanners = [[0, 1.3, z] for z in np.arange(0, -SEGMENT - 0.1, -1.6)]
    p, c = carriage(scans)
    # The scan is torn already; a light touch adds to it without hiding the
    # carriage itself.
    p, c = break_up(p, c, scanners, seed=3, amount=0.45)
    files = {'carriage': write_split('carriage', p, c, 1)}
    print('carriage', len(p))

    people, colours, anchors = [], [], []
    for spec in PEOPLE:
        q, d, anchor = person(scans, spec)
        # People are broken up less than the carriage, so they stay people.
        q, d = break_up(q, d, [[0, 1.3, spec['z'] + 1.5]], seed=7, amount=0.35)
        people.append(q); colours.append(d); anchors.append(anchor)
    files['people'] = write_split('people', np.concatenate(people), np.concatenate(colours), 2)
    print('people', sum(len(q) for q in people))

    length = SEGMENT * COPIES
    scene = {
        'files': files,
        'segment': SEGMENT,
        'copies': [{'z': -SEGMENT * i, 'mirror': i % 2 == 1} for i in range(COPIES)],
        'path': {'start': 0.4, 'end': -length + 0.8, 'eye': 1.6},
        'stops': anchors,
    }
    for anchor in anchors:
        anchor['at'] = round((scene['path']['start'] - anchor['position'][2] - 1.2) / (scene['path']['start'] - scene['path']['end']), 4)
    with open(os.path.join(OUT, 'scene.json'), 'w') as out:
        json.dump(scene, out, indent=2)
    print(json.dumps(anchors, indent=1))


if __name__ == '__main__':
    main(sys.argv[1])
