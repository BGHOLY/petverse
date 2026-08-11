# PetVerse 战斗表现事件合同 V1

## 1. 设计原则

战斗表现事件是服务端计算与客户端 3D 演出的唯一桥梁。客户端不得通过解析中文战报推断伤害、治疗或动作。

旧版 `text` 字段继续保留，用于战报和调试；所有正式表现必须读取结构化字段。

## 2. 基础事件

```ts
type BattlePresentationEvent = {
  eventId: string;
  sequence: number;
  round: number;
  type: string;
  phase: 'round' | 'intent' | 'action' | 'impact' | 'reaction' | 'resolve';
  presentationCue: string;
  actorId?: string;
  targetId?: string;
  targetIds?: string[];
  side?: 'left' | 'right';
  skillCode?: string;
  skillName?: string;
  damageType?: 'physical' | 'magic' | 'true';
  value?: number;
  critical?: boolean;
  statusCode?: string;
  reactionCode?: string;
  formationCode?: string;
  text: string;
};
```

## 3. 标准表现提示

| `presentationCue` | 客户端行为 |
|---|---|
| `round.start` | 更新回合与行动队列 |
| `unit.intent` | 面向目标、显示技能意图 |
| `attack.melee` | 短突进、命中、回位 |
| `attack.projectile` | 原地施法并发射弹道 |
| `skill.area` | 范围技能与多目标反应 |
| `support.heal` | 治疗弹道、绿色飘字 |
| `support.shield` | 护盾生成与护盾条更新 |
| `status.apply` | 添加状态图标与短提示 |
| `status.tick` | 播放持续伤害或恢复 |
| `damage.hit` | 受击、停顿、震动和伤害飘字 |
| `reaction.trigger` | 连携名称与附加效果 |
| `formation.passive` | 阵法被动提示 |
| `formation.ultimate` | 阵法大招完整演出 |
| `unit.death` | 死亡动作与退场 |
| `unit.revive` | 复活动作与生命恢复 |
| `battle.finish` | 停止行动并进入结算 |

## 4. 播放规则

- 按 `sequence` 严格播放；
- 同一 `eventId` 只播放一次；
- `damage.hit`、`support.heal`、`support.shield` 可以作为父行动的并行反应；
- 死亡必须等待本次命中反馈结束；
- 倍速仅缩短客户端时间，不改变事件顺序；
- 跳过时直接应用事件终态，但仍播放最终胜负与结算；
- 未识别的 `presentationCue` 使用安全的通用提示，不中断战斗；
- 断线恢复时使用 `eventId` 与本地已播放游标避免重复播放。

## 5. 兼容规则

- 当前 API 路径保持不变；
- 旧客户端仍可读取 `battleLog[].text`；
- 新字段只做增量扩展；
- 旧“守护、套盾、净化”指令服务端暂时兼容，但新默认 UI 不展示；
- 正式删除旧指令前必须完成版本迁移统计与兼容期。

