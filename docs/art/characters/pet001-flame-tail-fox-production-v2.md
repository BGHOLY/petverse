# PET001 Flame-tail Fox - 3D production specification V2

## Identity lock

- Species: `PET001`
- Chinese name: 炎尾狐
- Role: fast fire burst attacker
- Authoritative reference: `docs/art/characters/pet001-flame-tail-fox-turnaround-v2.png`
- Runtime prefab: `pet-starter-01/pets/PET001/PET001_Battle`

The V2 reference matches the current in-game 2D pet: orange-red fur, warm amber eyes,
cream chest and muzzle, one large flame-shaped tail, and no necklace. The earlier V1
moon-themed concept is retained only as history and must not be used for production.

## Silhouette and colour

1. Keep the large ears, compact four-legged body and one oversized flame tail.
2. Use orange-red as the dominant colour, cream for chest/muzzle, and gold-red for flame accents.
3. Keep amber/brown eyes. Do not use violet eyes or moonstone jewellery.
4. The forehead marking is a small flame motif, not a crescent moon.
5. Do not add a second tail, wings, weapons, armour or large costume pieces.
6. The pet must remain readable at the normal 720x1280 battle camera distance.

## Runtime budget

| Item | Budget |
|---|---|
| Triangles | 8,000 target; 12,000 hard maximum |
| Materials | 1 target; 2 maximum |
| Base colour texture | 512x512 |
| Bones | 24 target; 30 maximum |
| Root | footprint centre at `Y=0` |
| Facing | Cocos `-Z` |
| Export scale | `1,1,1` |

No real-time shadow is embedded in the prefab. The battle stage supplies the shared
foot shadow. No Camera, Light, UI, gameplay component or persistent particle emitter
may be included in the model prefab.

## Skeleton contract

```text
Root
└─ Hips
   ├─ Spine_01 / Spine_02 / Neck / Head
   ├─ Ear_L / Ear_R / Jaw
   ├─ FrontLeg_L / FrontLeg_R
   ├─ BackLeg_L / BackLeg_R
   └─ Tail_01 / Tail_02 / Tail_03 / Tail_04 / Tail_05
```

Root Motion must be disabled. Battle displacement is controlled by `Battle3DStage`.

## Required clips

| Clip | Length | Loop | Readability requirement |
|---|---:|---|---|
| `enter` | 0.80s | No | light landing, tail catches up |
| `idle` | 2.40s | Yes | offset ear motion and restrained tail breathing |
| `basic_attack` | 0.65s | No | crouch and quick pounce; `impact` near 0.34s |
| `active_skill` | 1.25s | No | tail flame contracts before `release` near 0.78s |
| `hit` | 0.30s | No | compact recoil, no large displacement |
| `death` | 1.00s | No | controlled side fall, tail settles |
| `victory` | 1.60s | No | one light hop and proud tail lift |

All clips use the same skeleton and origin. The active skill must contain at least
0.20 seconds of readable anticipation before release.

## Acceptance gate

- [ ] Matches the V2 orange-red single-tail reference.
- [ ] All seven clip names exist and animation events are correctly placed.
- [ ] Ten simultaneous units hold at least 30 FPS on the low-tier device profile.
- [ ] PET001 remains distinct from PET002 and PET008 by silhouette alone.
- [ ] Missing bundle or prefab falls back to the procedural sample without blocking combat.
- [ ] The compressed battle bundle contribution remains within 2 MiB.

