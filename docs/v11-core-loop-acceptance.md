# PetVerse V11 核心闭环验收

## 验收目标

V11 必须证明以下真实玩家循环能够在同一账号、真实数据库事务和真实接口上连续完成：

1. 使用培养道具提升指定宝宝。
2. 保存五只宝宝、阵法、站位和战术。
3. 派遣未出战宝宝进行远征。
4. 远征中的宝宝不能被炼妖或放生。
5. 远征完成后奖励只能领取一次。
6. 两只空闲宝宝可以预览并执行炼妖。
7. 同一炼妖请求不能重复扣除材料或父母宝宝。
8. 五宠战斗能够开始、执行指令并结束。
9. 战斗奖励只能结算一次，五只出战宝宝都获得经验。

## 隔离策略

验收脚本使用开发测试账号 `201`，不会修改默认玩家账号 `1` 的宝宝、货币、编队或主线进度。

`POST /api/dev/seed-social` 会幂等补齐：

- 五只固定出战宝宝。
- 两只专用炼妖父母宝宝。
- 炼妖核心、培养药水和基础测试货币。

每轮炼妖消耗两只专用父母并生成一只新宝宝。下一次执行时，种子接口只补回缺失的固定父母，不会清空历史结果。

## 执行方式

后端在本机 `3000` 端口运行时，从仓库根目录执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-v11-core-loop.ps1
```

可指定地址和测试账号：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke-v11-core-loop.ps1 `
  -BaseUrl http://127.0.0.1:3000/api `
  -UserId 201
```

## 通过标准

脚本必须以退出码 `0` 结束，并输出：

- `Success: True`
- `FusionDuplicateProtected: True`
- `BattleDuplicateProtected: True`
- `BattleWinner: left` 或 `right`
- 非零的远征、炼妖结果宠物和战斗会话 ID

此外还必须通过：

```text
npm run lint
npm run test
npm run test:e2e
npm run build
node scripts/audit-core-gameplay-loop.mjs
git diff --check
```

## 当前实测记录

2026-08-03 连续执行两轮通过：

- 第一轮：远征 `3`、炼妖结果宠物 `92`、战斗会话 `1703`、5 回合胜利。
- 第二轮：远征 `4`、炼妖结果宠物 `95`、战斗会话 `1704`、4 回合胜利。
- 两轮的远征、炼妖和战斗重复领取保护均通过。
