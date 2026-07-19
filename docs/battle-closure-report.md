# 战斗结算、奖励成长、探索进度与首领巢穴闭环交付报告

## 交付范围

本阶段在冻结现有五宠编队、五种阵法、冒险地图、区域详情和战斗按钮结构的前提下，完成了以下闭环：

`创建 battleId → 恢复未结束战斗 → 指令去重与校验 → 服务端判定胜负 → 幂等奖励结算 → 玩家与五宠成长 → 背包物品到账 → 探索度与星级更新 → 首领巢穴解锁 → 首领战结算`

商店、背包、宠物、孵化室、编队和冒险地图整体布局均未重做；设计分辨率仍为 720×1280。

## 战斗数据模型

`battle_sessions_v10` 现在保存：

- 唯一 `battleId`、用户、模式、章节、区域、关卡。
- 我方/敌方五宠快照、双方阵法、回合、冷却、战术状态。
- 开始、结束、结算和奖励领取状态。
- `processedCommandIds`，用于防止重复战斗指令。
- `settlementKey`、`rewardStatus`、`rewardClaimedAt` 和 `resultSnapshot`，用于防止重复发奖。
- `battleLog` 使用 `LONGTEXT` JSON，避免完整回合日志超过 MySQL `TEXT` 上限。

历史空 battleId 使用 `server/scripts/backfill-battle-ids.js` 补为 `legacy-<id>`，未删除历史战斗。

## 接口

- `POST /api/battle/v10/start`：创建战斗；同一用户、模式、区域、关卡存在未结束战斗时恢复原 battleId。
- `POST /api/battle/v10/command`：提交集火、守护、套盾、净化、自动或阵法大招指令；支持 `requestId` 幂等。
- `GET /api/battle/v10/session/:id`：按数据库会话 ID 恢复战斗。
- `GET /api/battle/v10/id/:battleId`：按 battleId 恢复战斗。
- `POST /api/battle/v10/settle`：普通、爬塔和竞技战斗统一结算；同一 battleId 只发奖一次。
- `GET /api/exploration/world`：返回区域探索度、关卡星级、下一关和首领状态。
- `POST /api/exploration/settle-explore`：区域关卡事务结算。
- `POST /api/exploration/settle-nest`：首领巢穴事务结算。

## 阵法能量与大招配置

能量来源：普通攻击 8、主动技能 12、受到伤害 5、击杀 18、特殊技能 10。能量在当前战斗跨回合保留，达到 100 后阵法大招可用，释放后扣除 100。

| 阵法 | 大招 | 核心效果 |
| --- | --- | --- |
| 龙阵 | 龙威合击 | 对集火目标连续追击 |
| 龟阵 | 玄甲天幕 | 群体护盾与前排减伤 |
| 鹤阵 | 流云先机 | 行动提前并清理速度减益 |
| 虎阵 | 白虎猎杀 | 猎印与物理单点爆发 |
| 凤阵 | 涅槃之翼 | 群体治疗、复苏与净化强化 |

## 奖励配置

| 模式 | 金币 | 玩家经验 | 五宠经验 | 道具 |
| --- | ---: | ---: | ---: | --- |
| 普通关卡 | 160 | 50 | 120 | 冒险叶×2 |
| 首领巢穴 | 320 | 120 | 220 | 冒险叶×3、首领核心×1 |
| 生态之塔 | 280 | 80 | 140 | 冒险叶×2 |
| 好友切磋 | 0 | 0 | 0 | 无 |

区域首次通关另外更新探索度、星级和下一关状态；首领首次击败记录完成状态并解锁后续区域。失败不发放通关奖励，也不增加首次探索度。

## battleLog 示例

```json
[
  { "round": 1, "type": "action-order", "unitIds": ["pet:1", "enemy:3"], "text": "本回合行动顺序已生成" },
  { "round": 1, "type": "command-focus", "targetId": "enemy:3", "text": "集火目标已锁定" },
  { "round": 1, "type": "damage", "actorId": "pet:1", "targetId": "enemy:3", "value": 1280, "critical": true },
  { "round": 1, "type": "formation-energy", "side": "left", "source": "normalAttack", "value": 8, "total": 8 },
  { "round": 2, "type": "command-shield", "targetId": "pet:5", "value": 960, "text": "战术套盾：目标获得 960 护盾" },
  { "round": 2, "type": "shield-absorb", "targetId": "pet:5", "value": 420, "text": "护盾吸收 420 伤害" },
  { "round": 4, "type": "ultimate", "formationCode": "dragon", "text": "我方发动阵法大招：龙威合击" }
]
```

## 已完成的实际验收

- 普通关卡真实胜利，结算显示金币 160、玩家经验 50、五宠经验 120、材料 2。
- 高难度真实失败，3 回合结束，奖励为 0，失败原因显示推荐战力差距较大。
- 重复开始返回同一个 battleId；重复 `requestId` 不重复执行指令。
- 重复结算普通关卡、探索关卡和首领战均返回原结果，不重复发奖。
- 集火、守护、套盾、净化、自动战斗均通过接口与实际预览验证。
- 五种阵法均从 0 积累至 100 并成功释放各自大招。
- 探索关卡按未通关顺序推进，月光森林达到 100%，首领巢穴解锁。
- 首领战真实胜利，结算显示金币 320、玩家经验 120、五宠经验 220、材料 4。
- 胜利后顶部货币、宠物经验、背包物品、探索度和首领状态无需退出页面即可刷新。
- 服务端构建通过；Cocos 预览控制台无新增项目错误或警告。

## 验收截图

- `docs/validation/battle-closure/victory-settlement.jpg`
- `docs/validation/battle-closure/failure-settlement.jpg`
- `docs/validation/battle-closure/focus-command.jpg`
- `docs/validation/battle-closure/shield-command.jpg`
- `docs/validation/battle-closure/exploration-map.jpg`
- `docs/validation/battle-closure/region-boss-nest.jpg`
- `docs/validation/battle-closure/boss-battle.jpg`
- `docs/validation/battle-closure/boss-settlement.jpg`

## 数据库变化

- 扩展 `battle_sessions_v10` 的 battleId、章节/区域/关卡、奖励状态、幂等键、完成时间、结算快照和已处理指令字段。
- 将 battleLog 存储升级为 LONGTEXT JSON。
- 探索进度继续使用 `world_exploration_progress.regions` 的 JSON 状态，新增已通关关卡、星级、下一关、首领完成与区域解锁信息。
- 增加冒险叶和首领核心物品配置。
- 未修改 `.env`、数据库密码或其他用户数据；测试只消费并结算当前开发账号的战斗奖励与一次首领挑战次数。
