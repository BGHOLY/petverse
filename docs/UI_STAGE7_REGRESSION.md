# PetVerse UI Stage 7 Regression

Date: 2026-07-14  
Branch: `ui-redesign-v2`  
Cocos Creator: `3.8.8`  
Design resolution: `720x1280`

## Automated Results

| Check | Result |
| --- | --- |
| `node verify-ui-stage7.mjs` | Passed, 119 checks |
| Cocos bundled TypeScript `--noEmit` | Passed, 0 errors |
| `server` Nest build | Passed |
| Backend V2.1 verification | Passed, 10 species / 70 skills / 76 items |
| Backend V2.2 verification | Passed, required modules and items present |
| Backend V2.3 verification | Passed, 11 feature checks |
| Adventure service smoke test | Passed, five event types observed and boss chapter unlocked |
| Battle command smoke test | Passed, ultimate energy gating and targeted shield verified |
| Git whitespace check | Passed |

## UI Coverage

- Both Cocos scenes keep a `720x1280` Canvas and portrait `fitHeight` configuration.
- `MainScene` contains the visible app shell, six page containers, and all modal/overlay layers.
- The bottom navigation is exactly: Home, Pet, Adventure, Shop, More.
- Page rendering activates one container and clears its previous generated content.
- Secondary-page back navigation uses router history; modal close does not navigate.
- Scroll offsets, filters, selected pets, shop category, and team edits are retained by page state.
- Shared buttons reject repeated clicks inside 320 ms; asynchronous writes keep their existing busy locks and request IDs.
- Trade, marriage, breeding, and fusion operations show consequences before server submission.
- Request failures produce toast/error state; list pages provide explicit empty states.
- Device safe-area insets now move the top bar, page host, and bottom navigation without changing the design resolution.
- Main navigation and formal entry icons use the code-native icon set; decorative status marks remain labels.

## Gameplay Coverage

- Public configuration now reports a five-pet team; no three-pet team-size configuration remains.
- Five formations, five slot assignments, position swapping, save, and restore remain connected to the existing team APIs.
- Main-story exploration keeps progress, seven event outcomes, first/completion rewards, boss nests, and next-chapter unlock.
- Tower and friend battle entry points remain available.
- Five-versus-five battle keeps focus, guard, shield, cleanse, formation energy, ultimate, auto mode, replay, report, and result UI.
- Skills, fusion, friends, marriage, ranking, mail, trade, benefits, settings, and profile still use their existing backend endpoints.

## Resource And Startup Review

- 48 critical UI resources are present and non-empty, including all 10 egg images, all 30 pet usage images, player/home art, and core audio.
- The complete resources tree has no zero-byte files.
- Home art loads on demand; battle audio and other interaction audio remain lazy and only preload after the first user gesture.
- Nine obsolete, unreferenced panel scripts were removed. Their UUIDs had no scene or prefab references and they depended on retired store APIs.

## Visual Review Limitation

The Cocos project window was found as `MainScene.scene - PetVerseClient - Cocos Creator 3.8.8`, but Windows capture failed with:

```text
SetIsBorderRequired failed: 不支持此接口 (0x80004002)
```

The in-app browser had no claimable preview tab, and its safety policy rejected opening the former local preview address. Therefore these items still require one manual editor/preview pass on this machine:

- no black bars and no visual clipping on a real notched device;
- editor hierarchy and running preview look identical;
- final Cocos preview screenshots for the redesigned pages;
- runtime first-frame timing and canvas pixel inspection.

All code, scene, resource, type, build, and service checks that do not require screen capture passed.
