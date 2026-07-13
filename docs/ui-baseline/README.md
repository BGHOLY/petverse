# PetVerse UI Redesign Baseline

## Scope

- Branch: `ui-redesign-v2`
- Base commit: `8dcfc8d`
- Cocos Creator: `3.8.8`
- Design resolution: `720 x 1280`, `fitHeight: true`
- Backend API paths and existing gameplay are protected during the redesign.

## Existing UI Architecture

- `MainScene.scene` contains both the legacy `HomeLayer` / `PageLayer` tree and a serialized `PetVerseUIRoot` tree.
- `MainUI.ts` owns the shell, navigation, page rendering, page state, API actions, dialogs, team editing, adventure, and battle entry points.
- `MainUI.buildShell()` clears `PetVerseUIRoot` and recreates the complete UI at runtime.
- `CuteUiKit.ts` uses `Graphics` and text glyphs for most formal UI surfaces.
- Only one reusable prefab currently exists: `assets/prefab/ItemSlot.prefab`.
- Current formal UI resources are limited to one background, ten buttons, four panels, and one pet image. Pet, skill, and egg art registries already contain usable gameplay art.

## Gameplay Capabilities To Preserve

- Five-pet teams and five formation types.
- Formation slot assignments, tactics, save, and restore.
- Three independent hatchery slots, acceleration, and hatch collection.
- World exploration, exploration progress, and boss nest settlement.
- Five-pet battle sessions and command submission.
- Inventory use targets, shop purchase flow, pet art binding, skill learning, fusion, marriage, mail, trade, ranking, and benefits.

## Known Baseline Gaps

- Bottom navigation is currently `Home / Pet / Inventory / Adventure / More`; the target is `Home / Pet / Adventure / Shop / More`.
- More is currently a drawer instead of a persistent main page, and Inventory is missing from that drawer.
- Pet detail still uses battle-oriented wording and lacks the target four-tab structure with an Equipment tab.
- Inventory is a two-column card list without the required tabs, four-column grid, sorting, capacity, and item detail dialog.
- Shop uses top tabs with four categories instead of a six-category left rail.
- Hatchery already has three real slots but lacks filtering, sorting, and the target warehouse presentation.
- `BattlePlayback.ts` still truncates teams to three units, and the old guide still contains three-pet wording.
- Store updates can rebuild the complete current page and reset component-local state.

## Home Layout Decision

The redesigned home page will not include the following right-side modules:

- Album
- Pet status card
- Interaction button
- Feed button
- Home level panel

The freed area will be used as visual breathing room rather than replaced with more commands:

- A bright window and garden depth on the right.
- Layered plants, shelves, fabric, cushions, toys, and small ambient motion.
- A larger unframed pet stage centered slightly to the right.
- A compact fabric nameplate under the pet for name, level, rarity, and favorite-pet switching.
- Activity entries remain on the left; primary navigation remains at the bottom.

This keeps the first screen warm and readable while preserving a clear visual focus on the active pet.

## Baseline Verification

- Server build: passed.
- Client standalone TypeScript check: failed before redesign work. Failures include legacy page scripts that no longer match the current `GameStore` / `UiKit`, old TypeScript library targets, and several current `MainUI` typing issues.
- Cocos Creator recognized the command-line project and web-mobile build arguments, compiled its built-in engine, and then stopped while creating the editor/browser window with `EPIPE: broken pipe, write`.
- The failed Creator process produced neither a build directory nor a build log. Six residual Creator background processes have no visible window.
- Browser preview and baseline screenshots are therefore unavailable in this environment at Stage 0. This is an environment-level preview blocker, not a reported gameplay or backend failure.

## Stage 0 Acceptance

- Capture current home, pet, inventory, shop, hatchery, formation, adventure, and battle views at the first successful Creator preview. Keep those images under this directory and do not rewrite this baseline result.
- Keep all baseline failures documented rather than silently fixing them in the baseline commit.
- Commit the task book, five reference images, replacement of the superseded reference documents, and this baseline report together.
