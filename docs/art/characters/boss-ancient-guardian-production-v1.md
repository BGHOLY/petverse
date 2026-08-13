# BOSS001 古树守卫：3D 生产规格 V1

## 战斗职责

- 定位：章节首领、召唤、范围蓄力、阶段转换
- 剪影：宽肩树干、树冠角、双臂根系、胸口发光生命核心
- 体积：约两个普通敌方槽位，不能遮挡全部召唤物
- 主色：深树皮、苔藓绿、暖金生命核心、危险蓄力时珊瑚红
- 参考图：`docs/art/characters/boss-ancient-guardian-turnaround-v1.png`

## 资源预算

| 项目 | 要求 |
|---|---|
| 三角面 | 18,000 目标，15,000–25,000 可接受 |
| 材质 | 最多 2 个 |
| 主贴图 | 1024×1024 BaseColor + 压缩 Mask |
| 骨骼 | 32 根目标，不超过 36 根 |
| 模型高度 | 约 3.4 Cocos 单位 |
| 原点 | 根系投影中心，脚底 `Y=0` |
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

另外由公共事件驱动以下表现，不增加结算逻辑：

- `boss.telegraph`：核心由金变红、地面危险环扩张，至少 0.8s 可读蓄力。
- `boss.skill`：双臂砸地，命中帧与服务端事件一致。
- `boss.phase`：树冠与核心亮度提升，镜头只做短促强调。

## Cocos 交付

```text
bundleName: battle-chapter-01
prefabPath: bosses/AncientGuardian/AncientGuardian_Battle
prefab root: AncientGuardian_Battle
```

正式Boss加载失败时必须继续使用程序化古树守卫样板，战斗、集火、阶段变化和结算不得中断。
