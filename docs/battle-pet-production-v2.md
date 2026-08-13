# PetVerse first 3D battle cast - production contract V2

## Scope

This gate covers one complete testable battle slice, not the full ten-pet roster:

| Code | Character | Combat read | Authoritative reference |
|---|---|---|---|
| `PET001` | 炎尾狐 | agile fire burst | `docs/art/characters/pet001-flame-tail-fox-turnaround-v2.png` |
| `PET002` | 岩甲龟 | low, heavy shield tank | `docs/art/characters/pet002-rockshell-turtle-turnaround-v1.png` |
| `PET008` | 森灵鹿 | elegant wood healer | `docs/art/characters/pet008-forest-spirit-deer-turnaround-v1.png` |
| `BOSS001` | 古树守卫 | large rooted chapter boss | `docs/art/characters/boss-ancient-guardian-turnaround-v1.png` |

Individual specifications:

```text
docs/art/characters/pet001-flame-tail-fox-production-v2.md
docs/art/characters/pet002-rockshell-turtle-production-v1.md
docs/art/characters/pet008-forest-spirit-deer-production-v1.md
docs/art/characters/boss-ancient-guardian-production-v1.md
```

Reference boards are modelling input only. They remain outside
`client/PetVerseClient/assets` and must never enter the WeChat runtime package.

## Cocos asset contract

```text
pet-starter-01/pets/PET001/PET001_Battle
pet-starter-01/pets/PET002/PET002_Battle
pet-starter-01/pets/PET008/PET008_Battle
battle-chapter-01/bosses/AncientGuardian/AncientGuardian_Battle
```

All formal assets remain behind `formalAssetReady=false` until their geometry,
animation, size and device-performance checks pass. The procedural quality samples
remain the fail-safe and allow ordinary battles, boss battles, focus targeting and
formation ultimates to continue if a bundle is absent.

## Shared animation contract

Every prefab provides these exact clips:

```text
enter
idle
basic_attack
active_skill
hit
death
victory
```

`basic_attack` supplies an `impact` event and `active_skill` supplies a `release`
event. Root Motion is disabled. All characters face Cocos `-Z` with their ground
contact at `Y=0`.

## Character-specific motion language

- PET001: quick compression, pounce, short recovery and energetic flame-tail release.
- PET002: slow low compression, broad shell expansion, limited hit displacement.
- PET008: vertical lift, antler-led casting and soft landing after healing release.
- BOSS001: long readable anticipation, heavy slam and strong but brief hit stop.

The procedural stage uses the same four motion languages so the test slice can be
evaluated before external FBX production is complete.

## Runtime budgets

- Pet: 5,000-12,000 triangles, 30 bones maximum, 1 material target, 512x512 base texture.
- Boss: 15,000-25,000 triangles, 36 bones maximum, 2 materials maximum, 1024x1024 base texture.
- No real-time model shadows; use the stage foot-shadow system.
- No embedded Camera, Light, UI, gameplay logic or permanent particle emitters.
- Pet starter battle bundle: 2 MiB compressed target per pet.
- Boss chapter bundle: 4 MiB compressed target.

## Release gate

1. Normal battle and boss battle both finish with server-authoritative results.
2. Focus targeting and formation ultimate remain usable while 3D presentation is active.
3. A missing or invalid formal asset automatically falls back without a blank unit.
4. All four silhouettes are recognisable at the production camera distance.
5. Ten pets sustain at least 30 FPS on the low-tier device profile; high profile targets 60 FPS.
6. WeChat package auditing reports main package, subpackages, largest files and duplicates.
7. Reference images are absent from the WeChat build.

