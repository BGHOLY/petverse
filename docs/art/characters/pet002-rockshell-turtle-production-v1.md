# PET002 岩甲龟：3D 生产规格 V1

## 角色锁定

- 代码：`PET002`
- 定位：土系防御前排、全队护盾、援护与反击
- 剪影：低重心、宽岩壳、短粗四肢、体宽比 PET001 大约 15%
- 主色：暖沙色皮肤、灰褐岩石、琥珀晶体、苔藓绿
- 识别物：壳顶嫩叶、岩壳间琥珀晶簇、友善棕色大眼
- 参考图：`docs/art/characters/pet002-rockshell-turtle-turnaround-v1.png`

不得增加武器、直立人形结构或高频摆动挂件。岩壳与身体可分材质槽，战斗版本优先合批。

## 资源预算

| 项目 | 要求 |
|---|---|
| 三角面 | 8,000 目标，5,000–12,000 可接受 |
| 材质 | 1 个目标，最多 2 个 |
| 主贴图 | 512×512 BaseColor，可选压缩 Mask |
| 骨骼 | 22 根目标，不超过 30 根 |
| 模型高度 | 壳顶约 1.55 Cocos 单位 |
| 原点 | 四足投影中心，脚底 `Y=0` |
| 正面 | 朝 Cocos `-Z` |

## 必需动画

```text
enter
idle
basic_attack
active_skill
hit
death
victory
```

- `basic_attack`：0.75s，0.42s 标记 `impact`，沉重短撞击。
- `active_skill`：1.30s，0.82s 标记 `release`，缩身蓄力后展开护盾。
- `hit`：0.32s，壳体承压、四肢下沉，不发生大位移。
- `death`：1.10s，伏地收首，不翻壳、不穿地。

## Cocos 交付

```text
bundleName: pet-starter-01
prefabPath: pets/PET002/PET002_Battle
prefab root: PET002_Battle
```

Prefab 不包含 Camera、Light、UI、战斗逻辑或常驻粒子。正式资源通过十单位同屏性能、七动画与事件帧检查后，才能把 `formalAssetReady` 改为 `true`。

