# Stage 2 regression validation

Date: 2026-07-22

## Result

The completed social, hatchery, battle, shop, inventory, and page-routing flows passed the regression checks below. One account-isolation defect was found and fixed: shop purchases now use the request `x-user-id` instead of always charging the default user.

## Verified flows

- Dual-account friendship and marriage closure passed with users 201 and 202.
- Concurrent marriage acceptance returned one normal result and one idempotent duplicate result.
- Marriage eggs were separate records (egg 19 for user 201 and egg 20 for user 202).
- Independent hatching created pet 33 (male, growth 1.117, 4 slots) and pet 34 (female, growth 1.14, 3 slots).
- Repeating both hatch requests returned the existing pet records with `duplicate: true`.
- Normal battle victory, real defeat, five formation ultimates, exploration at 100%, boss unlock, boss victory, and duplicate settlement protection passed.
- A user-201 shop purchase reduced diamonds from 500 to 490, increased `exp_potion_large` from 0 to 1, and did not change user 1's diamonds (1056).
- Retrying the same purchase request returned `duplicate: true` and did not charge again.
- Using the purchased potion reduced its quantity from 1 to 0 and changed pet 21 from level 1 / EXP 0 to level 3 / EXP 200.
- The Cocos preview immediately showed user 201 with 490 diamonds and pet 21 at level 3.
- Twenty-six page transitions completed with one canvas and no browser warning or error logs.
- The NestJS production build passed.

## Screenshots

- `01-user201-pet-after-item-use.png`
- `02-user201-wallet-after-purchase.png`
- `03-page-switch-stability.png`

## Data notes

- The validation intentionally changed development user 201: 10 diamonds were spent and one large EXP potion was consumed by pet 21.
- Historical battle/exploration event JSON may still contain old stored display strings such as rarity-prefixed names. Current newly generated battle and pet UI output uses the shared cleaned display-name logic; historical records were not rewritten.
