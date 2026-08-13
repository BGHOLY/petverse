# PET008 森灵鹿：3D 生产规格 V1

## 角色锁定

- 代码：`PET008`
- 定位：木系治疗辅助、净化、过量治疗转护盾
- 剪影：修长幼鹿、抬头姿态、枝叶鹿角、短蓬松尾
- 主色：暖棕毛色、奶油胸腹、叶片绿、花朵金白
- 识别物：枝叶鹿角、额头叶纹、胸前藤蔓花环、浅色斑点
- 参考图：`docs/art/characters/pet008-forest-spirit-deer-turnaround-v1.png`

不得改成团状大头比例，不增加翅膀、骑具或复杂服装。鹿角不参与高频物理摆动。

## 资源预算

| 项目 | 要求 |
|---|---|
| 三角面 | 9,000 目标，6,000–12,000 可接受 |
| 材质 | 1 个目标，最多 2 个 |
| 主贴图 | 512×512 BaseColor，可选压缩 Mask |
| 骨骼 | 26 根目标，不超过 30 根 |
| 模型高度 | 鹿角顶约 2.10 Cocos 单位 |
| 原点 | 四蹄投影中心，脚底 `Y=0` |
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

- `basic_attack`：0.70s，0.38s 标记 `impact`，鹿角发出短程自然法球。
- `active_skill`：1.35s，0.84s 标记 `release`，鹿角聚光并扩散生命环。
- `hit`：0.28s，颈部和前肢轻微受力，快速恢复。
- `death`：1.05s，屈膝侧卧，鹿角不穿地。

## Cocos 交付

```text
bundleName: pet-starter-01
prefabPath: pets/PET008/PET008_Battle
prefab root: PET008_Battle
```

Prefab 不包含 Camera、Light、UI、战斗逻辑或常驻粒子。正式资源通过十单位同屏性能、七动画与事件帧检查后，才能把 `formalAssetReady` 改为 `true`。

