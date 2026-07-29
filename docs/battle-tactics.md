# 五宠战术、阵法与技能连携

## 战术 API

### 获取可选项

`GET /api/battle/tactics/options`

### 获取当前预设

`GET /api/battle/tactics/preset`

### 保存当前预设

`PUT /api/battle/tactics/preset`

```json
{
  "preset": {
    "targetStrategy": "LOWEST_HP",
    "skillStrategy": "CAST_IMMEDIATELY",
    "survivalStrategy": "PROTECT_BACKLINE"
  }
}
```

请求通过 `X-User-Id` 选择当前用户。旧编队中的 `focusPriority`、`guardTarget`、`shieldThreshold`、`ultimatePolicy` 会自动映射到新格式。

## 战术代码

### 目标

- `FRONT_FIRST`
- `BACK_FIRST`
- `LOWEST_HP`
- `HEALER_FIRST`
- `BOSS_FIRST`

### 技能

- `CAST_IMMEDIATELY`
- `CONTROL_COMBO`
- `BOSS_CAST`
- `EXECUTE`

### 生存

- `HEAL_LOW_HP`
- `PROTECT_BACKLINE`
- `FORMATION_AT_LOW_HP`
- `FULL_OFFENSE`

## 阵法数据

`GET /api/formation` 返回：

- 五个阵法及等级。
- 五个位置的加成。
- `passiveRule`。
- `ultimateSkill`。
- `ultimateEnergyRequired`。
- `ultimateTrigger`。

阵法配置集中在后端配置文件，不应散落在页面脚本中。

## 战斗日志

Cocos 的 `BattleLogEventParser` 可识别：

- `tactic-trigger`
- `formation-passive`
- `formation-passive-trigger`
- `ultimate`
- `combat-reaction`

前端只展示服务端日志，不自行推算战斗结果。

## 通用反应

- `BURN_FIRE_BURST`
- `WET_LIGHTNING`
- `FREEZE_HEAVY`
- `MARK_CHASE`
- `OVERHEAL_SHIELD`
- `SHIELD_COUNTER`

每个反应有单回合触发上限，避免追击、反击等效果无限循环。

## 可复现战斗

五宠战斗会保存随机种子和随机游标。相同输入与相同种子应得到一致结果，用于自动测试和战斗复盘。

