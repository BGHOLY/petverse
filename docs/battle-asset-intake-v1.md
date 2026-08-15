# PetVerse 正式战斗模型接入与发布门禁 V1

## 目的

这份规范把外部建模交付变成可重复、可回退的 Cocos 接入流程。程序生成的质量样片只用于保证战斗随时可玩；任何模型在没有真实 Prefab、完整动画、预算报告和真机结果前，都不得把 `formalAssetReady` 改成 `true`。

## 第一批交付

| 角色 | Bundle | Prefab 路径 | 压缩预算 |
|---|---|---|---:|
| PET001 炎尾狐 | `pet-starter-01` | `pets/PET001/PET001_Battle` | 2 MiB |
| PET002 岩甲龟 | `pet-starter-01` | `pets/PET002/PET002_Battle` | 2 MiB |
| PET008 森灵鹿 | `pet-starter-01` | `pets/PET008/PET008_Battle` | 2 MiB |
| BOSS001 古树守卫 | `battle-chapter-01` | `bosses/AncientGuardian/AncientGuardian_Battle` | 4 MiB |

参考图和生产说明位于 `docs/art/characters`，它们是建模输入，不能复制到 `client/PetVerseClient/assets` 或微信运行包。

## FBX 与 Prefab 规则

- 角色朝向 Cocos `-Z`，脚底在 `Y=0`，Root Motion 关闭。
- 宠物不超过 12,000 三角面、1 个材质、120 个节点；Boss 不超过 25,000 三角面、2 个材质、180 个节点。
- 普通宠物主贴图目标 512×512，Boss 目标 1024×1024。
- Prefab 内禁止 Camera、Light、Canvas、UITransform、Button、常驻 ParticleSystem 和玩法脚本。
- 模型根节点挂一个 `SkeletalAnimation`，动画名称必须完全一致：

```text
enter
idle
basic_attack
active_skill
hit
death
victory
```

- `basic_attack` 的有效命中点由动画事件标为 `impact`；`active_skill` 的释放点标为 `release`。
- 同体型宠物优先共享骨架。材质、纹理和通用动画不得在多个 Bundle 内重复复制。

## Cocos 接入步骤

1. 在独立导入目录检查 FBX 缩放、骨骼、材质和动画切片，不直接覆盖已发布 Prefab。
2. 按表格路径制作战斗 Prefab，并把 Bundle 名设置为 `pet-starter-01` 或 `battle-chapter-01`。
3. 运行前端 TypeScript 检查与 `node scripts/audit-v13-battle-experience.mjs`。
4. 进入普通 5v5、Boss 战各完成一次，检查入场、普攻、主动技能、受击、死亡和胜利动作。
5. 在低档真机连续进行三场战斗，目标 30 FPS；高档设备目标 60 FPS。
6. 检查 Bundle 压缩体积、最大单文件和重复依赖。
7. 只有全部通过后，才允许把对应注册项的 `formalAssetReady` 改为 `true`，并提交独立版本。

运行时会再次检查节点数、材质数、三角面和七个动画。正式资源缺失或验收失败时，会销毁无效实例并继续使用质量样片，不会出现空白宠物，也不会阻塞服务器战斗结算。

## 远程 Asset Bundle

微信小游戏的脚本留在代码包，模型、贴图、动画和音频使用远程 Asset Bundle。正式环境通过微信扩展配置提供：

```json
{
  "battleAssetBaseUrl": "https://cdn.example.com/petverse/battle/v13"
}
```

运行时会拼成：

```text
{battleAssetBaseUrl}/pet-starter-01
{battleAssetBaseUrl}/battle-chapter-01
```

开发预览没有配置 URL 时会尝试同名本地 Bundle。CDN 发布必须保留版本目录，禁止直接覆盖仍被线上客户端引用的文件。

## 画质与性能

运行时提供 `low / balanced / high` 三档和 `auto`：

- 低档：30 FPS，降低程序样片面数、镜头震动和同屏特效上限，关闭辅助命中特效。
- 平衡：45 FPS，保留主要冲击反馈和 Boss 冲击波。
- 高档：60 FPS，使用完整质量样片与辅助特效。

微信端自动参考 `benchmarkLevel` 与 `memorySize`。偏好保存于 `petverse:battle-quality`，以后可以接到设置页，但固定战斗 UI 位置不得由代码重排。

## 发布门禁

每次模型发布必须留下：

1. 原始模型审计表：三角面、骨骼、节点、材质和贴图。
2. Cocos 运行时校验结果。
3. Bundle 压缩体积与重复依赖报告。
4. 普通战、Boss 战截图或录像。
5. 至少一台低档与一台高档设备的三场连续战斗结果。
6. 缺包、损坏包和旧版本缓存三种回退测试。

任何一项缺失都保持 `formalAssetReady=false`。这不是“模型失败”，而是避免半成品进入正式测试的安全门禁。
